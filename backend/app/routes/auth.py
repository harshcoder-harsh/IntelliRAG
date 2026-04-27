import hashlib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from app.models.database import users_collection

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/register")
def register(request: RegisterRequest):
    existing_user = users_collection.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = {
        "name": request.name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "created_at": datetime.utcnow()
    }
    users_collection.insert_one(new_user)
    
    return {"message": "User created successfully", "user": {"name": request.name, "email": request.email}}

@router.post("/login")
def login(request: LoginRequest):
    user = users_collection.find_one({"email": request.email})
    if not user or user.get("password_hash") != hash_password(request.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    return {"message": "Login successful", "user": {"name": user["name"], "email": user["email"]}}
