"""
OMAI Advanced AI Chatbot - FastAPI Python Backend
With MySQL Persistence, JWT Authentication & Gemini API Integration
"""

import os
import time
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
import sqlalchemy
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, ForeignKey, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from google import genai
from google.genai import types

# ----------------- Configuration & DB Setup -----------------
MYSQL_USER = os.getenv("MYSQL_USER", "gemini_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "gemini_secret_2026")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "gemini_chatbot_db")

DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

# Use SQLite fallback if MySQL is not reachable during local standalone testing
try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception:
    DATABASE_URL = "sqlite:///./gemini_local.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Security Config
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-gemini-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Gemini API Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ai_client = genai.Client(api_key=GEMINI_API_KEY, http_options={"headers": {"User-Agent": "aistudio-build"}})

# ----------------- Database Models -----------------
class UserModel(Base):
    __tablename__ = "users"
    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(190), unique=True, index=True, nullable=False)
    username = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("ConversationModel", back_populates="user", cascade="all, delete-orphan")

class ConversationModel(Base):
    __tablename__ = "conversations"
    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="New Chat")
    model = Column(String(64), default="gemini-3.8-flash")
    pinned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserModel", back_populates="conversations")
    messages = relationship("MessageModel", back_populates="conversation", cascade="all, delete-orphan")

class MessageModel(Base):
    __tablename__ = "messages"
    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False) # 'user' or 'model'
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("ConversationModel", back_populates="messages")

Base.metadata.create_all(bind=engine)

# ----------------- Dependency & Schemas -----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    model: Optional[str] = "gemini-3.8-flash"
    system_instruction: Optional[str] = None

# Auth helper
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> UserModel:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed")
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# ----------------- FastAPI App -----------------
app = FastAPI(title="OMAI Advanced AI Chatbot API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(UserModel).filter(UserModel.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    
    user_id = f"usr_{os.urandom(8).hex()}"
    hashed = pwd_context.hash(req.password)
    user = UserModel(id=user_id, email=req.email.lower(), username=req.username, password_hash=hashed)
    db.add(user)
    db.commit()

    token = jwt.encode({"sub": user.id, "exp": datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "user": {"id": user.id, "email": user.email, "username": user.username}}

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == req.email.lower()).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = jwt.encode({"sub": user.id, "exp": datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "user": {"id": user.id, "email": user.email, "username": user.username}}

@app.get("/api/auth/me")
def me(current_user: UserModel = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "username": current_user.username}

@app.get("/api/conversations")
def list_conversations(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    convs = db.query(ConversationModel).filter(ConversationModel.user_id == current_user.id).order_by(desc(ConversationModel.pinned), desc(ConversationModel.updated_at)).all()
    results = []
    for c in convs:
        results.append({
            "id": c.id,
            "title": c.title,
            "model": c.model,
            "pinned": c.pinned,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "message_count": len(c.messages),
        })
    return results

@app.get("/api/conversations/{conv_id}")
def get_conversation(conv_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(ConversationModel).filter(ConversationModel.id == conv_id, ConversationModel.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = [
        {"id": m.id, "role": m.role, "content": m.content, "tokens_used": m.tokens_used, "created_at": m.created_at.isoformat()}
        for m in conv.messages
    ]
    return {
        "id": conv.id,
        "title": conv.title,
        "model": conv.model,
        "pinned": conv.pinned,
        "messages": messages,
    }

@app.post("/api/chat")
def chat(req: ChatRequest, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Resolve or create conversation
    conv = None
    if req.conversation_id:
        conv = db.query(ConversationModel).filter(ConversationModel.id == req.conversation_id, ConversationModel.user_id == current_user.id).first()
    
    if not conv:
        conv_id = f"conv_{os.urandom(8).hex()}"
        title = req.message[:35] + ("..." if len(req.message) > 35 else "")
        conv = ConversationModel(id=conv_id, user_id=current_user.id, title=title, model=req.model or "gemini-3.8-flash")
        db.add(conv)
        db.commit()
    
    # 2. Store user message in MySQL
    user_msg_id = f"msg_{os.urandom(8).hex()}"
    user_tokens = max(5, len(req.message) // 4)
    user_msg = MessageModel(id=user_msg_id, conversation_id=conv.id, role="user", content=req.message, tokens_used=user_tokens)
    db.add(user_msg)
    conv.updated_at = datetime.utcnow()
    db.commit()

    # 3. Build chat history context for Gemini
    history_messages = db.query(MessageModel).filter(MessageModel.conversation_id == conv.id).order_by(MessageModel.created_at).all()
    contents = []
    for m in history_messages:
        role = "user" if m.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m.content)]))
    
    # 4. Call Gemini 3.8 Flash model
    try:
        response = ai_client.models.generateContent(
            model=req.model or "gemini-3.8-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction="You are OMAI, a helpful, intelligent, and articulate AI assistant."
            )
        )
        ai_reply = response.text or "I am here to help!"
    except Exception as e:
        ai_reply = f"Error communicating with Gemini API: {str(e)}"

    # 5. Store AI reply in MySQL
    ai_msg_id = f"msg_{os.urandom(8).hex()}"
    ai_tokens = max(10, len(ai_reply) // 4)
    ai_msg = MessageModel(id=ai_msg_id, conversation_id=conv.id, role="model", content=ai_reply, tokens_used=ai_tokens)
    db.add(ai_msg)
    conv.updated_at = datetime.utcnow()
    db.commit()

    return {
        "conversation_id": conv.id,
        "title": conv.title,
        "reply": ai_reply,
        "tokens_used": user_tokens + ai_tokens,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
