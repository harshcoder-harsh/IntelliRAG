from app.rag.vector_store import search_documents, get_vector_store

store = get_vector_store()
if store is None:
    print("Store is None!")
else:
    print(f"Store has {len(store.docstore._dict)} documents.")
    
    docs = search_documents("explain", k=4)
    print(f"Docs without filter: {len(docs)}")
    
    # Try getting the first doc's source to test filter
    if len(store.docstore._dict) > 0:
        first_doc = list(store.docstore._dict.values())[0]
        source = first_doc.metadata.get('source')
        print(f"First doc source: {source}")
        
        docs_filtered = search_documents("explain", k=4, filter={"source": source})
        print(f"Docs with filter '{source}': {len(docs_filtered)}")

