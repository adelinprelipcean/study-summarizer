"""
API Router for Authentication endpoints.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.api.schemas.user_schemas import UserCreate, UserOut, UserLogin, Token
from src.api.services.auth_service import register_user_service, login_user_service

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    return register_user_service(db, data)

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    return login_user_service(db, data)