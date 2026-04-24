import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.rag.vector_store import add_documents

def process_and_store_document(file_path: str):
    """
    Loads a document, splits it into chunks, and adds it to the vector store.
    """
    extension = os.path.splitext(file_path)[1].lower()
    
    if extension == '.pdf':
        loader = PyPDFLoader(file_path)
    elif extension == '.docx':
        loader = Docx2txtLoader(file_path)
    elif extension == '.txt' or extension == '.csv':
        # Treat CSVs as plain text so the splitter can group many rows into a single large chunk.
        # CSVLoader creates 1 document per row, which breaks aggregation queries.
        loader = TextLoader(file_path, autodetect_encoding=True)
    else:
        raise ValueError(f"Unsupported file format: {extension}")
        
    documents = loader.load()
    
    # Split documents with larger chunks to keep tabular data together
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2500,
        chunk_overlap=250,
        length_function=len
    )
    chunks = text_splitter.split_documents(documents)
    
    # Add filename to metadata
    for chunk in chunks:
        chunk.metadata["source"] = os.path.basename(file_path)
        
    # Add to vector store
    add_documents(chunks)
    
    return len(chunks)
