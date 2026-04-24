from fastapi import APIRouter
from app.routes import upload, chat, auth

api_router = APIRouter()

api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
