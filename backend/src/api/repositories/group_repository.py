"""
Group repository module.
Handles database operations for groups and member associations.
"""
from sqlalchemy.orm import Session
from src.models.group import Group, user_group_association, GroupActivity
from src.models.user import User
from src.models.document import Document
import random
import string


def create_group(db: Session, name: str, description: str, creator_id: int):
    # Creates a new group and automatically links the creator as a 'moderator'.
    new_group = Group(
        name=name,
        description=description,
        created_by_id=creator_id,
        access_code=generate_unique_code(db)
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    statement = user_group_association.insert().values(
        user_id=creator_id,
        group_id=new_group.id,
        role="moderator"
    )
    db.execute(statement)
    db.commit()
    
    return new_group

def add_user_to_group(db: Session, user_id: int, group_id: int, role: str = "member"):
    statement = user_group_association.insert().values(
        user_id=user_id,
        group_id=group_id,
        role=role
    )
    db.execute(statement)
    db.commit()
    return True


def is_user_member_of_group(db: Session, user_id: int, group_id: int) -> bool:
    # Checks if a user belongs to a group using the association table.
    query = db.query(user_group_association).filter(
        user_group_association.c.user_id == user_id,
        user_group_association.c.group_id == group_id
    ).first()
    
    return query is not None


def get_user_groups(db: Session, user_id: int):
    # Returns all groups where the user is a member.
    return db.query(Group).join(Group.members).filter(User.id == user_id).all()

def get_group_by_id(db: Session, group_id: int):
    # Returns a group by it's ID.
    return db.query(Group).filter(Group.id == group_id).first()

def get_group_documents(db: Session, group_id: int):
    # Returns all the documents that are shared with the actual group
    return db.query(Document).filter(Document.group_id == group_id).all()

def get_group_activities(db: Session, group_id: int):
    return (
        db.query(
            GroupActivity.id,
            GroupActivity.content,
            GroupActivity.created_at,
            GroupActivity.document_public_id,
            User.username,
            Document.title.label("document_title")
        )
        .join(User, GroupActivity.user_id == User.id)
        .join(Document, GroupActivity.document_public_id == Document.public_id)
        .filter(GroupActivity.group_id == group_id)
        .order_by(GroupActivity.created_at.asc())
        .all()
    )
    
def generate_unique_code(db: Session):
    while True:
        code = ''.join(random.choices(string.ascii_uppercase, k=5))
        exists = db.query(Group).filter(Group.access_code == code).first()
        if not exists:
            return code