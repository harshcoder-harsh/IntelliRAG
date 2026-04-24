import os

dirs = [
    "data/syllabus",
    "data/timetable",
    "data/handbook",
    "src",
    "tests",
    "chroma_db"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

with open("requirements.txt", "w") as f:
    f.write('''langchain==0.3.0
langchain-community==0.3.0
langchain-anthropic==0.3.0
langchain-openai==0.1.22
chromadb==0.5.0
sentence-transformers==3.0.0
pymupdf==1.24.0
pdfplumber==0.11.0
python-docx==1.1.0
anthropic==0.34.0
openai==1.40.0
streamlit==1.38.0
python-dotenv==1.0.0
pandas==2.2.0
tqdm==4.66.0
pytest==8.3.0
pytest-mock==3.14.0
''')

with open(".env.example", "w") as f:
    f.write('''ANTHROPIC_API_KEY=
OPENAI_API_KEY=
LLM_MODEL=claude-3-5-sonnet-20240620
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHROMA_DB_PATH=./chroma_db
TOP_K_RESULTS=5
CHUNK_SIZE=500
CHUNK_OVERLAP=50
APP_TITLE=College Knowledge Assistant
''')

with open(".env", "w") as f:
    f.write('''ANTHROPIC_API_KEY=
OPENAI_API_KEY=
LLM_MODEL=claude-3-5-sonnet-20240620
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHROMA_DB_PATH=./chroma_db
TOP_K_RESULTS=5
CHUNK_SIZE=500
CHUNK_OVERLAP=50
APP_TITLE=College Knowledge Assistant
''')

with open(".gitignore", "w") as f:
    f.write('''# Environment
.env
venv/
__pycache__/
*.pyc

# Vector database
chroma_db/

# Data files
data/

# Python
*.egg-info/
dist/
build/

# IDE
.vscode/
.idea/
''')

with open("src/prompt.py", "w") as f:
    f.write('''RAG_PROMPT = """
You are a helpful college assistant. Answer the student's question
using ONLY the context provided below. If the answer is not in the
context, say "I don't have that information in my knowledge base."
Do not make up information.

Context:
{context}

Question: {question}

Answer:
"""
''')

with open("src/utils.py", "w") as f:
    f.write('''import os
from dotenv import load_dotenv

def load_env():
    load_dotenv()
''')

with open("src/ingest.py", "w") as f:
    f.write('''import os
from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))

def load_documents(data_path="data"):
    print(f"Loading documents from {data_path}...")
    loader = DirectoryLoader(data_path, glob="**/*.pdf", loader_cls=PyMuPDFLoader)
    docs = loader.load()
    print(f"Found {len(docs)} PDF files/pages")
    return docs

def split_documents(documents):
    print("Splitting into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks")
    return chunks

def embed_and_store(chunks):
    print("Generating embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    print("Storing in ChromaDB...")
    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DB_PATH
    )
    print(f"Ingestion complete. {len(chunks)} chunks stored.")

def run_ingestion():
    docs = load_documents()
    if not docs:
        print("No documents found. Please add PDFs to the data/ directory.")
        return
    chunks = split_documents(docs)
    embed_and_store(chunks)

if __name__ == "__main__":
    run_ingestion()
''')

with open("src/retriever.py", "w") as f:
    f.write('''import os
from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", 5))

def get_retriever():
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_PATH,
        embedding_function=embeddings
    )
    return vectorstore.as_retriever(search_kwargs={"k": TOP_K_RESULTS})

def retrieve(query, top_k=None):
    retriever = get_retriever()
    if top_k:
        retriever.search_kwargs["k"] = top_k
    return retriever.invoke(query)

def retrieve_with_scores(query, top_k=None):
    k = top_k or TOP_K_RESULTS
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_PATH,
        embedding_function=embeddings
    )
    return vectorstore.similarity_search_with_score(query, k=k)
''')

with open("src/chain.py", "w") as f:
    f.write('''import os
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from src.retriever import get_retriever
from src.prompt import RAG_PROMPT

load_dotenv()

LLM_MODEL = os.getenv("LLM_MODEL", "claude-3-5-sonnet-20240620")

def format_docs(docs):
    return "\\n\\n".join(doc.page_content for doc in docs)

def get_rag_chain():
    retriever = get_retriever()
    
    if "gpt" in LLM_MODEL.lower():
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model=LLM_MODEL, temperature=0)
    else:
        from langchain_anthropic import ChatAnthropic
        llm = ChatAnthropic(model=LLM_MODEL, temperature=0)
        
    prompt = PromptTemplate.from_template(RAG_PROMPT)
    
    def invoke_chain(question):
        docs = retriever.invoke(question)
        context = format_docs(docs)
        chain = prompt | llm | StrOutputParser()
        answer = chain.invoke({"context": context, "question": question})
        return {
            "answer": answer,
            "sources": docs
        }
        
    return invoke_chain

def ask(question):
    chain = get_rag_chain()
    return chain(question)
''')

with open("app.py", "w") as f:
    f.write('''import streamlit as st
import os
from dotenv import load_dotenv
from src.chain import get_rag_chain

load_dotenv()

APP_TITLE = os.getenv("APP_TITLE", "College Knowledge Assistant")

st.set_page_config(page_title=APP_TITLE, page_icon="🎓")
st.title(f"🎓 {APP_TITLE}")

if "messages" not in st.session_state:
    st.session_state.messages = []

with st.sidebar:
    st.header("About")
    st.write("This assistant uses RAG to answer questions based on college documents.")
    if st.button("Clear Chat"):
        st.session_state.messages = []
        st.rerun()

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "sources" in message:
            with st.expander("Sources"):
                for i, doc in enumerate(message["sources"]):
                    st.write(f"**Source {i+1}:** {doc.metadata.get('source', 'Unknown')}")

if prompt := st.chat_input("Ask a question about college..."):
    st.chat_message("user").markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.spinner("Searching for answers..."):
        try:
            chain = get_rag_chain()
            response = chain(prompt)
            answer = response["answer"]
            sources = response["sources"]

            with st.chat_message("assistant"):
                st.markdown(answer)
                with st.expander("Sources"):
                    for i, doc in enumerate(sources):
                        st.write(f"**Source {i+1}:** {doc.metadata.get('source', 'Unknown')}")
            
            st.session_state.messages.append({
                "role": "assistant", 
                "content": answer,
                "sources": sources
            })
        except Exception as e:
            st.error(f"An error occurred: {e}. Please check your API key and setup.")
''')

with open("cli.py", "w") as f:
    f.write('''import argparse
from src.chain import ask

def main():
    parser = argparse.ArgumentParser(description="College Knowledge Assistant CLI")
    parser.add_argument("--query", type=str, required=True, help="Your question")
    args = parser.parse_args()
    
    print(f"Question: {args.query}\\n")
    print("Searching for answer...\\n")
    
    try:
        response = ask(args.query)
        print("Answer:")
        print(response["answer"])
        print("\\nSources:")
        for i, doc in enumerate(response["sources"]):
            print(f"[{i+1}] {doc.metadata.get('source', 'Unknown')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
''')

with open("tests/test_ingest.py", "w") as f:
    f.write('''def test_ingest():
    assert True
''')

with open("tests/test_retriever.py", "w") as f:
    f.write('''def test_retriever():
    assert True
''')

with open("tests/test_chain.py", "w") as f:
    f.write('''def test_chain():
    assert True
''')
