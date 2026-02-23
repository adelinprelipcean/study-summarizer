"""
Pydantic schemas for User authentication.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    username: str
    created_at: datetime
    is_admin: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    
class UserAdminOut(UserOut):
    is_banned: bool
    ban_reason: Optional[str] = None
    
class BanUserRequest(BaseModel):
    reason: Optional[str] = None