from sqlalchemy.orm import Session
from src.models.guest_usage import GuestUsage
from datetime import datetime, timezone


def get_guest_usage_by_identifier(db: Session, identifier: str) -> GuestUsage:
    return db.query(GuestUsage).filter(GuestUsage.identifier == identifier).first()


def create_guest_usage(db: Session, identifier: str, count: int = 0) -> GuestUsage:
    usage = GuestUsage(identifier=identifier, count=count, last_reset=datetime.now(timezone.utc))
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage


def update_guest_usage(db: Session, usage: GuestUsage, count: int, last_reset: datetime) -> GuestUsage:
    usage.count = count
    usage.last_reset = last_reset
    db.commit()
    db.refresh(usage)
    return usage


def increment_guest_usage_count(db: Session, usage: GuestUsage) -> GuestUsage:
    usage.count += 1
    db.commit()
    db.refresh(usage)
    return usage
