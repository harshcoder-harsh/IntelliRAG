from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.chat_service import generate_response
from app.models.database import save_message, get_history

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []
    selected_file: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    citations: List[str] = []

import asyncio

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Save user message
        save_message("user", request.message)
        
        # Run generate_response in a background thread
        response_text, citations = await asyncio.to_thread(
            generate_response, request.message, request.history, request.selected_file
        )
        
        # Save AI response
        save_message("assistant", response_text)
        
        # Override citations to never return any files
        return ChatResponse(answer=response_text, citations=[])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def fetch_history():
    try:
        # get_history is very fast, running it directly is okay, but can also to_thread
        history = await asyncio.to_thread(get_history)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
