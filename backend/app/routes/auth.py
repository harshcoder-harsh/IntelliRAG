import hashlib
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.database import SessionLocal, User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully", "user": {"name": new_user.name, "email": new_user.email}}

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or user.password_hash != hash_password(request.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    return {"message": "Login successful", "user": {"name": user.name, "email": user.email}}
