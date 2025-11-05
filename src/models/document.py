"""

Document model configuration file.

Defines the "Document" model that will be translated into a DB table.

"""

from sqlalchemy import Column, Integer, String, DateTime, sql
from src.core.db.database import Base

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(255), nullable=False, unique=True)
    filename = Column(String(255), nullable=False)
    filetype = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=sql.func.now())
    status = Column(String(255), nullable=False)
    