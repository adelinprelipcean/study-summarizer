"""
Utilitary model to prevent unregistered users from abusing the AI resources
"""

from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, timezone
from src.core.db.database import Base

class GuestUsage(Base):
    __tablename__ = "guest_usage"

    # Identifier based on IP
    identifier = Column(String, primary_key=True, index=True)
    count = Column(Integer, default=0)
    
    # Counter for usage resets
    last_reset = Column(DateTime, default=datetime.now(timezone.utc))