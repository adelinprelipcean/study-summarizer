"""
Security utilities for hashing and token generation
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt
from passlib.context import CryptContext
from src.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto");


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checkinng if the password in plain text (plain_password) is the same
    with the hashed one to verify authenticity
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Returns a hashed password of the plain text provided
    """
    return pwd_context.hash(password)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """
    Creates a signed JSON Web Token for user authentication.

    Args: 
        - subject: unique identity of the user, usually user_id
        - expires_delta : custom duration for token validity
        
    Returns:
        - encoded and signed JWT string
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + settings.ACCESS_TOKEN_EXPIRE_MINUTES
        
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET.get_secret_value(), algorithm=settings.ENCODING_ALGORITHM)
    return encoded_jwt
