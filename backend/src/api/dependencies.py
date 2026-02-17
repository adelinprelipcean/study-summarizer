"""
API Dependencies module.
Handles dependency injection for authentication and user retrieval.

"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.core.config import settings
from src.core.config import settings
from src.api.repositories.user_repository import get_user_by_id
from src.models.user import User

security_scheme = HTTPBearer()

def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_str = token.credentials
    
    try:
        payload = jwt.decode(token_str, settings.JWT_SECRET.get_secret_value(), algorithms=[settings.ENCODING_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = get_user_by_id(db, user_id=int(user_id))
    if user is None:
        raise credentials_exception
    return user

def get_optional_current_user(
    token: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)), 
    db: Session = Depends(get_db)
):
    if token is None:
        return None

    token_str = token.credentials
    try:
        payload = jwt.decode(token_str, settings.JWT_SECRET.get_secret_value(), algorithms=[settings.ENCODING_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        user = get_user_by_id(db, user_id=int(user_id))
        return user
    except (JWTError, ValueError):
        return None

def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user