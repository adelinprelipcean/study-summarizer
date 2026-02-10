"""

Document model configuration file.

Defines the "Document" model that will be translated into a DB table.

"""

from sqlalchemy import Column, Integer, String, DateTime, sql, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.core.db.database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(255), nullable=False, unique=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="documents") 
    
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    group = relationship("Group", back_populates="shared_documents")
    
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    filetype = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=sql.func.now())
    status = Column(String(255), nullable=False)
    
    summary = Column(Text, nullable=True)
    