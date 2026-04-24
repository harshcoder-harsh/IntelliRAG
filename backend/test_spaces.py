import os
from app.rag.vector_store import search_documents, get_vector_store
from app.services.document_service import process_and_store_document

# Create dummy text
os.makedirs("backend/uploads", exist_ok=True)
file_path = "backend/uploads/Test file (1).txt"
with open(file_path, "w") as f:
    f.write("This is a test document to explain spaces in filenames.")

# Process
process_and_store_document(file_path)

store = get_vector_store()
docs = search_documents("explain", k=4, filter={"source": "Test file (1).txt"})
print(f"Docs retrieved for 'Test file (1).txt': {len(docs)}")

