from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from src.core.db.database import Base

class GuestUsage(Base):
    __tablename__ = "guest_usage"

    identifier = Column(String, primary_key=True, index=True)
    count = Column(Integer, default=0)
    last_reset = Column(DateTime, default=datetime.utcnow)