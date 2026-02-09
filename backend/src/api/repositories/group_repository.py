from sqlalchemy.orm import Session
from src.models.group import Group, user_group_association


def create_group(db: Session, name: str, description: str, creator_id: int):
    new_group = Group(
        name=name,
        description=description,
        created_by_id=creator_id
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


def get_group_by_id(db: Session, group_id: int):
    return db.query(Group).filter(Group.id == group_id).first()


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
    query = db.query(user_group_association).filter(
        user_group_association.c.user_id == user_id,
        user_group_association.c.group_id == group_id
    ).first()
    
    return query is not None