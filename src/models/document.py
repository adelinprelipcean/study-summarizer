"""

Document model configuration file.

Defines the "Document" model that will be translated into a DB table.

"""

from sqlalchemy import Column, Integer, String, Text, DateTime
from src.core.db.database import Base
from datetime import datetime

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)