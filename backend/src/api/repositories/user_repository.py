"""
Repository layer for User operations.
"""
from sqlalchemy.orm import Session
from src.models.user import User

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_dict: dict) -> User:
    new_user = User(
        email=user_dict["email"],
        username=user_dict["username"],
        hashed_password=user_dict["hashed_password"]
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_all_users(db: Session) -> list[User]:
    return db.query(User).all()

def set_user_ban(db: Session, user: User, is_banned: bool, reason: str | None) -> User:
    user.is_banned = is_banned
    user.ban_reason = reason if is_banned else None
    db.commit()
    db.refresh(user)
    return user