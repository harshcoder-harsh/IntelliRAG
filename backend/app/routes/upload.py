import os
import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
from app.config import settings
from app.services.document_service import process_and_store_document
from app.services.chat_service import generate_summary_for_file
from app.rag.vector_store import remove_document
from app.models.database import SessionLocal, DocumentMetadata

router = APIRouter()

def save_document_metadata(filename: str, summary: str):
    db = SessionLocal()
    try:
        doc = db.query(DocumentMetadata).filter(DocumentMetadata.filename == filename).first()
        if not doc:
            doc = DocumentMetadata(filename=filename, summary=summary)
            db.add(doc)
        else:
            doc.summary = summary
        db.commit()
    finally:
        db.close()

def delete_document_metadata(filename: str):
    db = SessionLocal()
    try:
        db.query(DocumentMetadata).filter(DocumentMetadata.filename == filename).delete()
        db.commit()
    finally:
        db.close()

@router.post("/")
async def upload_files(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        if file.filename == "":
            continue
            
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
        
        try:
            # Stream file to disk instead of reading entire file into memory at once
            with open(file_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024): # Read in 1MB chunks
                    buffer.write(chunk)
            
            # Process and store in Vector DB in a background thread to prevent blocking
            chunks_count = await asyncio.to_thread(process_and_store_document, file_path)
            
            # Generate and save summary
            summary = await asyncio.to_thread(generate_summary_for_file, file.filename)
            await asyncio.to_thread(save_document_metadata, file.filename, summary)
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "chunks": chunks_count,
                "summary": summary
            })
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error processing {file.filename}: {e}\n{error_details}")
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": str(e)
            })
            raise HTTPException(status_code=500, detail=f"{str(e)} - Check server logs for full traceback.")
            
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

@router.get("/documents")
async def list_documents():
    db = SessionLocal()
    try:
        docs = db.query(DocumentMetadata).all()
        return {
            "documents": [
                {
                    "filename": d.filename,
                    "summary": d.summary,
                    "uploaded_at": d.uploaded_at
                } for d in docs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        await asyncio.to_thread(os.remove, file_path)
        # Delete from vector store
        await asyncio.to_thread(remove_document, filename)
        # Delete from database
        await asyncio.to_thread(delete_document_metadata, filename)
        return {"status": "success", "message": f"Deleted {filename}"}
    raise HTTPException(status_code=404, detail="File not found")
