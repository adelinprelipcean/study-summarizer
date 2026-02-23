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
    access_code: str

class GroupMemberOut(BaseModel):
    user_id: int
    username: str
    role: str

class GroupDetailsOut(GroupOut):
    members: List[GroupMemberOut]
    
class ActivityOut(BaseModel):
    id: int
    username: str
    user_id: int
    document_title: str
    document_public_id: str
    content: str
    created_at: datetime
    summary_type: Optional[str] = None
    
    class Config:
        from_attributes = True