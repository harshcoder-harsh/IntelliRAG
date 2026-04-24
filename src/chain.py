import os
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
