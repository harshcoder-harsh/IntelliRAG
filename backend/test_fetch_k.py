from app.rag.vector_store import get_vector_store

store = get_vector_store()
filter_dict = {"source": "Test file (1).txt"}
docs = store.similarity_search("explain", k=4, filter=filter_dict, fetch_k=10000)
print(len(docs))
