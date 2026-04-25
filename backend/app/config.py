import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "IntelliRAG Chatbot"
    API_V1_STR: str = "/api"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    VECTOR_STORE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vector_store")
    OPENAI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = "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"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True)
