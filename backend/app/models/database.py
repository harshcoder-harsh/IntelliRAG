import os
from datetime import datetime
from pymongo import MongoClient
from app.config import settings

# Initialize PyMongo Client
client = MongoClient(settings.DATABASE_URL)
db = client.get_database("intellirag")

# Collections
users_collection = db.users
chat_messages_collection = db.chat_messages
documents_collection = db.documents

# Indexes for better performance
users_collection.create_index("email", unique=True)
chat_messages_collection.create_index("session_id")
documents_collection.create_index("filename", unique=True)

def save_message(role: str, content: str, session_id: str = "default"):
    msg = {
        "role": role,
        "content": content,
        "session_id": session_id,
        "timestamp": datetime.utcnow()
    }
    chat_messages_collection.insert_one(msg)
    return msg

def get_history(session_id: str = "default"):
    # Sort by timestamp ascending
    messages = chat_messages_collection.find({"session_id": session_id}).sort("timestamp", 1)
    return [{"role": m["role"], "content": m["content"]} for m in messages]
