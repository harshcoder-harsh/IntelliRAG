import os
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
        separators=["\n\n", "\n", ".", " ", ""]
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
