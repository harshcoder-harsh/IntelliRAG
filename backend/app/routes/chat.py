from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from app.services.chat_service import generate_response, generate_response_stream, generate_compare_stream
import asyncio
from app.models.database import save_message, get_history

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    selected_file: Optional[str] = None
    web_search: Optional[bool] = False

class CompareRequest(BaseModel):
    file1: str
    file2: str
    message: Optional[str] = "Compare the main topics, similarities, and differences between these two documents."

class ChatResponse(BaseModel):
    answer: str
    citations: List[str] = []

@router.post("/compare")
async def compare_stream(request: CompareRequest):
    try:
        async def event_generator():
            async for chunk in generate_compare_stream(request.file1, request.file2, request.message):
                yield chunk
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        session_id = request.selected_file or "general"
        # Save user message
        save_message("user", request.message, session_id)
        
        # Run generate_response in a background thread
        response_text, citations = await asyncio.to_thread(
            generate_response, request.message, request.history, request.selected_file, request.web_search
        )
        
        # Save AI response
        save_message("assistant", response_text, session_id)
        
        # Override citations to never return any files
        return ChatResponse(answer=response_text, citations=[])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    try:
        session_id = request.selected_file or "general"
        # Save user message
        save_message("user", request.message, session_id)
        
        async def event_generator():
            full_response = ""
            async for chunk in generate_response_stream(request.message, request.history, request.selected_file, request.web_search):
                full_response += chunk
                yield chunk
                
            # After streaming completes, save the full response to database
            save_message("assistant", full_response, session_id)
            
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/history")
async def fetch_history(file: Optional[str] = None):
    try:
        session_id = file or "general"
        # get_history is very fast, running it directly is okay, but can also to_thread
        history = await asyncio.to_thread(get_history, session_id)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
