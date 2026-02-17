"""
Group model configuration file

Defines the structure of the "group" table into the DB.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, func
from sqlalchemy.orm import relationship
from src.core.db.database import Base

# Association Table: Connects Users and Groups (Many-To-Many)
user_group_association = Table(
    "user_group_association",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("group_id", Integer, ForeignKey("groups.id"), primary_key=True),
    Column("role", String(50), default="member") 
)

class Group(Base):
    __tablename__ = "groups"

    # Unique identifier and descriptive values for better implementation
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    
    # Timestamps and details for a good management and control for the admins
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"))

    # Link back to users
    members = relationship("User", secondary=user_group_association, back_populates="groups")

    # Link to documents shared within the group
    shared_documents = relationship("Document", back_populates="group")