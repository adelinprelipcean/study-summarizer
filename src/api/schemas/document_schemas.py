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
    
    
class DocumentsListOut(BaseModel):
    documents: list[DocumentOut]
    
    
class MessageOut(BaseModel):
    message: str