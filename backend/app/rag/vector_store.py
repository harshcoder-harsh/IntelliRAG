import os
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
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

def remove_document(filename: str):
    store = get_vector_store()
    if store is None:
        return False
        
    # Get all documents/ids
    docstore = store.docstore._dict
    
    # Find IDs to delete
    ids_to_delete = []
    for doc_id, doc in docstore.items():
        if doc.metadata.get("source") == filename:
            ids_to_delete.append(doc_id)
            
    if ids_to_delete:
        store.delete(ids_to_delete)
        store.save_local(vector_store_path)
        
    return True

def search_documents(query, k=4, filter=None):
    store = get_vector_store()
    if store is None:
        return []
    
    # FAISS similarity_search post-filters. fetch_k ensures we retrieve enough docs from FAISS before filtering.
    docs = store.similarity_search(query, k=k, filter=filter, fetch_k=10000)
    return docs
