from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupOut(GroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    created_by_id: int

class GroupMemberOut(BaseModel):
    user_id: int
    username: str
    role: str

class GroupDetailsOut(GroupOut):
    members: List[GroupMemberOut]
    
class ActivityOut(BaseModel):
    id: int
    username: str
    document_title: Optional[str] = "Deleted Document" 
    document_public_id: Optional[str] = None
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True