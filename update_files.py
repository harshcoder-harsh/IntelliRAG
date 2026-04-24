import os

files = {
    "src/ingest.py": '''import os
from pathlib import Path
from tqdm import tqdm
from langchain_community.document_loaders import PyMuPDFLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv

load_dotenv()

CHROMA_DB_PATH  = os.getenv("CHROMA_DB_PATH", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHUNK_SIZE      = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP   = int(os.getenv("CHUNK_OVERLAP", 50))
DATA_PATH       = "./data"

def load_documents(data_path: str):
    loader = DirectoryLoader(data_path, glob="**/*.pdf", loader_cls=PyMuPDFLoader)
    documents = loader.load()
    print(f"Loaded {len(documents)} document pages from {data_path}")
    return documents

def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\\n\\n", "\\n", ".", " ", ""]
    )
    chunks = splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks")
    return chunks

def embed_and_store(chunks):
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DB_PATH
    )
    vectorstore.persist()
    print(f"Stored {len(chunks)} chunks in ChromaDB at {CHROMA_DB_PATH}")
    return vectorstore

def run_ingestion():
    print("Starting ingestion pipeline...")
    documents = load_documents(DATA_PATH)
    chunks    = split_documents(documents)
    embed_and_store(chunks)
    print("Ingestion complete.")

if __name__ == "__main__":
    run_ingestion()
''',

    "src/retriever.py": '''import os
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv

load_dotenv()

CHROMA_DB_PATH  = os.getenv("CHROMA_DB_PATH", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
TOP_K           = int(os.getenv("TOP_K_RESULTS", 5))

def get_vectorstore():
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    return Chroma(persist_directory=CHROMA_DB_PATH, embedding_function=embeddings)

def get_retriever():
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(search_kwargs={"k": TOP_K})

def retrieve(query: str, top_k: int = TOP_K):
    vectorstore = get_vectorstore()
    return vectorstore.similarity_search(query, k=top_k)

def retrieve_with_scores(query: str, top_k: int = TOP_K):
    vectorstore = get_vectorstore()
    return vectorstore.similarity_search_with_score(query, k=top_k)
''',

    "src/prompt.py": '''from langchain.prompts import PromptTemplate

RAG_PROMPT_TEMPLATE = """
You are a helpful and accurate college assistant. Your job is to answer
student questions about the college using ONLY the information provided
in the context below.

Rules:
- Answer only from the context. Do not use outside knowledge.
- If the answer is not in the context, say: "I don't have that information
  in my knowledge base. Please contact the college office."
- Be concise and clear.
- If relevant, mention which document the answer came from.

Context:
{context}

Question: {question}

Answer:
"""

RAG_PROMPT = PromptTemplate(
    template=RAG_PROMPT_TEMPLATE,
    input_variables=["context", "question"]
)
''',

    "src/chain.py": '''import os
from langchain_anthropic import ChatAnthropic
from langchain.chains import RetrievalQA
from langchain.schema import Document
from src.retriever import get_retriever
from src.prompt import RAG_PROMPT
from dotenv import load_dotenv

load_dotenv()

LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-4-6")

def get_llm():
    return ChatAnthropic(
        model=LLM_MODEL,
        temperature=0,
        max_tokens=1024
    )

def get_rag_chain():
    llm       = get_llm()
    retriever = get_retriever()
    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": RAG_PROMPT}
    )
    return chain

def ask(question: str) -> dict:
    chain    = get_rag_chain()
    result   = chain.invoke({"query": question})
    sources  = list(set([
        doc.metadata.get("source", "Unknown")
        for doc in result.get("source_documents", [])
    ]))
    return {
        "answer":  result["result"],
        "sources": sources
    }
''',

    "app.py": '''import streamlit as st
from src.chain import ask

st.set_page_config(page_title="College Assistant", page_icon="🎓", layout="centered")
st.title("College Knowledge Assistant")
st.caption("Ask me anything about your college — syllabus, timetable, fees, rules.")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if msg.get("sources"):
            with st.expander("Sources"):
                for src in msg["sources"]:
                    st.caption(f"- {src}")

# User input
if prompt := st.chat_input("Ask a question about your college..."):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Get answer
    with st.chat_message("assistant"):
        with st.spinner("Searching documents..."):
            result = ask(prompt)

        st.markdown(result["answer"])

        if result["sources"]:
            with st.expander("Sources"):
                for src in result["sources"]:
                    st.caption(f"- {src}")

    # Add assistant message to history
    st.session_state.messages.append({
        "role": "assistant",
        "content": result["answer"],
        "sources": result["sources"]
    })

# Sidebar
with st.sidebar:
    st.header("About")
    st.write("This assistant uses RAG (Retrieval Augmented Generation) to answer questions from your college documents.")
    if st.button("Clear Chat"):
        st.session_state.messages = []
        st.rerun()
''',

    "cli.py": '''import argparse
from src.chain import ask

def main():
    parser = argparse.ArgumentParser(description="College RAG Assistant CLI")
    parser.add_argument("--query", "-q", type=str, required=True, help="Your question")
    args = parser.parse_args()

    print(f"\\nQuestion: {args.query}\\n")
    result = ask(args.query)
    print(f"Answer:\\n{result['answer']}\\n")
    if result["sources"]:
        print("Sources:")
        for s in result["sources"]:
            print(f"  - {s}")

if __name__ == "__main__":
    main()
''',

    "tests/test_ingest.py": '''import pytest
from src.ingest import split_documents
from langchain.schema import Document

def test_split_documents_creates_chunks():
    docs = [Document(page_content="A " * 1000, metadata={"source": "test.pdf"})]
    chunks = split_documents(docs)
    assert len(chunks) > 1

def test_chunk_size_respected():
    docs = [Document(page_content="word " * 2000, metadata={"source": "test.pdf"})]
    chunks = split_documents(docs)
    for chunk in chunks:
        assert len(chunk.page_content) <= 600  # some tolerance
''',

    "tests/test_retriever.py": '''import pytest
from unittest.mock import patch, MagicMock
from src.retriever import retrieve

def test_retrieve_returns_documents():
    mock_docs = [MagicMock(page_content="DBMS stands for Database Management System")]
    with patch("src.retriever.get_vectorstore") as mock_vs:
        mock_vs.return_value.similarity_search.return_value = mock_docs
        result = retrieve("What is DBMS?")
        assert len(result) == 1
''',

    "tests/test_chain.py": '''import pytest
from unittest.mock import patch, MagicMock
from src.chain import ask

def test_ask_returns_answer_and_sources():
    with patch("src.chain.get_rag_chain") as mock_chain:
        mock_chain.return_value.invoke.return_value = {
            "result": "The exam is in December.",
            "source_documents": [MagicMock(metadata={"source": "timetable.pdf"})]
        }
        result = ask("When is the exam?")
        assert "answer" in result
        assert "sources" in result
        assert result["answer"] == "The exam is in December."
'''
}

for filepath, content in files.items():
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
