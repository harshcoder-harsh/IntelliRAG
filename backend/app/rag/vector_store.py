import os
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.config import settings

embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

vector_store_path = os.path.join(settings.VECTOR_STORE_DIR, "faiss_index")

def get_vector_store():
    if os.path.exists(vector_store_path) and os.path.exists(os.path.join(vector_store_path, "index.faiss")):
        return FAISS.load_local(vector_store_path, embedding_model, allow_dangerous_deserialization=True)
    return None

def add_documents(documents):
    store = get_vector_store()
    if store is None:
        store = FAISS.from_documents(documents, embedding_model)
    else:
        store.add_documents(documents)
    
    store.save_local(vector_store_path)
    return True

def search_documents(query, k=4, filter=None):
    store = get_vector_store()
    if store is None:
        return []
    
    # FAISS similarity_search accepts a filter dict
    docs = store.similarity_search(query, k=k, filter=filter)
    return docs
