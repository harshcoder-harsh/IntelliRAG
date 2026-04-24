import os
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
