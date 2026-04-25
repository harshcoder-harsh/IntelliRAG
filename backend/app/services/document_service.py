import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from app.rag.vector_store import add_documents
from PIL import Image
import pytesseract
from pdf2image import convert_from_path

# Configure paths if necessary for macOS brew installations
if os.path.exists('/opt/homebrew/bin/tesseract'):
    pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'
elif os.path.exists('/usr/bin/tesseract'): # Linux/Render fallback
    pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

POPPLER_PATH = '/opt/homebrew/bin' if os.path.exists('/opt/homebrew/bin/pdftoppm') else None
# If on Linux (like Render), pdftoppm is in /usr/bin which is default PATH, so None is fine.

def process_and_store_document(file_path: str):
    """
    Loads a document, splits it into chunks, and adds it to the vector store.
    """
    extension = os.path.splitext(file_path)[1].lower()
    
    if extension == '.pdf':
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        
        # Check if PDF is likely a scanned image (very little extractable text)
        total_text_length = sum(len(doc.page_content.strip()) for doc in documents)
        if len(documents) == 0 or total_text_length < 50 * max(1, len(documents)):
            print(f"[{os.path.basename(file_path)}] Very little text found. Attempting OCR on scanned PDF...")
            images = convert_from_path(file_path, poppler_path=POPPLER_PATH)
            documents = []
            for i, image in enumerate(images):
                text = pytesseract.image_to_string(image)
                documents.append(Document(page_content=text, metadata={"source": os.path.basename(file_path), "page": i}))
                
    elif extension in ['.png', '.jpg', '.jpeg']:
        print(f"[{os.path.basename(file_path)}] Processing image via OCR...")
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        documents = [Document(page_content=text, metadata={"source": os.path.basename(file_path)})]
        
    elif extension == '.docx':
        loader = Docx2txtLoader(file_path)
    elif extension == '.txt' or extension == '.csv':
        # Treat CSVs as plain text so the splitter can group many rows into a single large chunk.
        # CSVLoader creates 1 document per row, which breaks aggregation queries.
        loader = TextLoader(file_path, autodetect_encoding=True)
    else:
        raise ValueError(f"Unsupported file format: {extension}")
        
    if extension not in ['.pdf', '.png', '.jpg', '.jpeg']:
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
