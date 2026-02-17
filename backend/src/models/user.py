"""
User model configuration.

Here's defined the ORM model for the "users" table in the db.
"""
from sqlalchemy import Column, Integer, String, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from src.core.db.database import Base

class User(Base):
    __tablename__ = "users"

    # Primary key to identify the user
    id = Column(Integer, primary_key=True, index=True)
    
    # Unique identifiers and contact
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(255), unique=True, nullable=False)
    
    # Securely saved password
    hashed_password = Column(String(255), nullable=False)
    
    # Information about account's creation
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Authorization for role-based access
    is_admin = Column(Boolean, default=False)
    
    # One-To-Many : One user can have more documents
    documents = relationship("Document", back_populates="owner")
    
    # Many-To-Many: Many users can be part of multiple groups
    groups = relationship("Group", secondary="user_group_association", back_populates="members")