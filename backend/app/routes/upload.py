import os
import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
from app.config import settings
from app.services.document_service import process_and_store_document
from app.rag.vector_store import remove_document

router = APIRouter()

@router.post("/")
async def upload_files(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        if file.filename == "":
            continue
            
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
        
        try:
            # Read file safely in async route
            content = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(content)
                
            # Process and store in Vector DB in a background thread to prevent blocking
            chunks_count = await asyncio.to_thread(process_and_store_document, file_path)
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "chunks": chunks_count
            })
        except Exception as e:
            print(f"Error processing {file.filename}: {e}")
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": str(e)
            })
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"results": results}

@router.get("/files")
async def list_files():
    try:
        if not os.path.exists(settings.UPLOAD_DIR):
            return {"files": []}
        files = await asyncio.to_thread(os.listdir, settings.UPLOAD_DIR)
        # Filter out hidden files like .DS_Store
        files = [f for f in files if not f.startswith('.')]
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        await asyncio.to_thread(os.remove, file_path)
        # Delete from vector store
        await asyncio.to_thread(remove_document, filename)
        return {"status": "success", "message": f"Deleted {filename}"}
    raise HTTPException(status_code=404, detail="File not found")
