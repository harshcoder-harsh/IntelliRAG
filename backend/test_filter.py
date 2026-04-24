from app.rag.vector_store import get_vector_store

store = get_vector_store()
filter_dict = {"source": "Test file (1).txt"}
print("Search with filter dict:")
docs = store.similarity_search("explain", k=4, filter=filter_dict)
print(len(docs))

print("Search with callable filter:")
docs2 = store.similarity_search("explain", k=4, filter=lambda d: d.get("source") == "Test file (1).txt")
print(len(docs2))
