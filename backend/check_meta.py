from app.rag.vector_store import get_vector_store

store = get_vector_store()
for doc_id, doc in list(store.docstore._dict.items())[-5:]:
    print(doc.metadata)

