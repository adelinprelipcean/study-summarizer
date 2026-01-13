"""
Service layer for Authentication logic.
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from src.api.repositories.user_repository import get_user_by_email, get_user_by_username, create_user
from src.api.schemas.user_schemas import UserCreate, UserLogin, Token
from src.core.security import get_password_hash, verify_password, create_access_token

def register_user_service(db: Session, data: UserCreate):
    if get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_pw = get_password_hash(data.password)
    
    user_dict = {
        "email": data.email,
        "username": data.username,
        "hashed_password": hashed_pw
    }
    return create_user(db, user_dict)

def login_user_service(db: Session, data: UserLogin) -> Token:
    user = get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")