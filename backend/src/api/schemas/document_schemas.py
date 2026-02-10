"""
Pydantic schemas for the Document resource.

Defines request and response data models for the Document API layer, ensuring
data validation and serialization between the API and internal application logic.
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DocumentCreate(BaseModel):
    title: str
    filetype: str
    filename: str
    

class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    public_id: str
    title: str
    filetype: str
    status: str
    uploaded_at: datetime
    summary: Optional[str] = None
    
    
class DocumentsListOut(BaseModel):
    documents: list[DocumentOut]
    
    
class MessageOut(BaseModel):
    message: str
    

class DocumentStatusUpdate(BaseModel):
    status: str