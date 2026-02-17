from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.api.schemas.group_schemas import GroupCreate, GroupOut
from src.api.repositories.group_repository import (
    create_group, 
    get_group_by_id, 
    add_user_to_group, 
    get_user_groups,
    is_user_member_of_group,
    get_group_documents
)
from src.api.repositories.user_repository import get_user_by_id
from src.api.dependencies import get_current_user
from src.models.user import User
from src.api.schemas.document_schemas import DocumentOut
from src.models.group import GroupActivity
from src.models.document import Document
from src.api.schemas.group_schemas import ActivityOut


router = APIRouter()

@router.post("/", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def make_group(
    data: GroupCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return create_group(db, name=data.name, description=data.description, creator_id=current_user.id)

@router.post("/{group_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def invite_to_group(
    group_id: int, 
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupul nu există")

    if group.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Doar moderatorul poate invita membri")

    user_to_add = get_user_by_id(db, user_id)
    if not user_to_add:
        raise HTTPException(status_code=404, detail="Utilizatorul invitat nu există")

    add_user_to_group(db, user_id=user_id, group_id=group_id)
    return {"message": f"Utilizatorul {user_to_add.username} a fost adăugat în grup"}


@router.get("/me", response_model=list[GroupOut])
def get_my_groups(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Returns the list of groups the current user belongs to."""
    return get_user_groups(db, user_id=current_user.id)


@router.get("/{group_id}/documents", response_model=list[DocumentOut])
def get_war_room_documents(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if not is_user_member_of_group(db, current_user.id, group_id):
        raise HTTPException(status_code=403, detail="Not a member of this room")
    
    docs = get_group_documents(db, group_id)
    
    for doc in docs:
        doc.owner_username = doc.owner.username
        
    return docs

@router.get("/{group_id}/activity", response_model=list[ActivityOut])
def get_group_activity(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_user_member_of_group(db, current_user.id, group_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    activities = (
        db.query(
            GroupActivity.id,
            User.username,
            Document.title.label("document_title"),
            GroupActivity.document_public_id,
            GroupActivity.content,
            GroupActivity.created_at
        )
        .join(User, GroupActivity.user_id == User.id)
        .outerjoin(Document, GroupActivity.document_public_id == Document.public_id)
        .filter(GroupActivity.group_id == group_id)
        .order_by(GroupActivity.created_at.desc())
        .all()
    )
    return activities

@router.delete("/{group_id}", status_code=status.HTTP_200_OK)
def delete_group(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="War Room not found")

    if group.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the moderator can dismantle this room")

    db.query(GroupActivity).filter(GroupActivity.group_id == group_id).delete()
    
    # Ștergem grupul
    db.delete(group)
    db.commit()
    
    return {"message": "War Room dismantled successfully"}