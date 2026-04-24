import os
import shutil
from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
from app.config import settings
from app.services.document_service import process_and_store_document
from app.rag.vector_store import remove_document

router = APIRouter()

@router.post("/")
def upload_files(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        if file.filename == "":
            continue
            
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            # Process and store in Vector DB
            chunks_count = process_and_store_document(file_path)
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "chunks": chunks_count
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": str(e)
            })
            
    return {"results": results}

@router.get("/files")
def list_files():
    try:
        if not os.path.exists(settings.UPLOAD_DIR):
            return {"files": []}
        files = os.listdir(settings.UPLOAD_DIR)
        # Filter out hidden files like .DS_Store
        files = [f for f in files if not f.startswith('.')]
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{filename}")
def delete_file(filename: str):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        # Delete from vector store
        remove_document(filename)
        return {"status": "success", "message": f"Deleted {filename}"}
    raise HTTPException(status_code=404, detail="File not found")
