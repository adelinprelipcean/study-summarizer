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
from src.models.group import GroupActivity, Group
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
        raise HTTPException(status_code=404, detail="The group does not exists.")

    if group.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Moderators-only action.")

    user_to_add = get_user_by_id(db, user_id)
    if not user_to_add:
        raise HTTPException(status_code=404, detail="The invited user does not exists.")

    add_user_to_group(db, user_id=user_id, group_id=group_id)
    return {"message": f"The user {user_to_add.username} was added to the group."}


@router.get("/me", response_model=list[GroupOut])
def get_my_groups(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Returns the list of groups the current user belongs to.
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
            User.id.label("user_id"),
            Document.title.label("document_title"),
            Document.summary_type.label("summary_type"),
            GroupActivity.document_public_id,
            GroupActivity.content,
            GroupActivity.created_at
        )
        .join(User, GroupActivity.user_id == User.id)
        .join(Document, GroupActivity.document_public_id == Document.public_id)
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
        raise HTTPException(status_code=403, detail="Only the moderator can delete this room")

    db.query(GroupActivity).filter(GroupActivity.group_id == group_id).delete()
    
    db.delete(group)
    db.commit()
    
    return {"message": "War Room deleted successfully"}

@router.post("/join/{access_code}")
def join_group_by_code(
    access_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.query(Group).filter(Group.access_code == access_code).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid access code. The War Room does not exist.")
    
    if is_user_member_of_group(db, current_user.id, group.id):
        raise HTTPException(status_code=400, detail="You are already a member of this alliance.")
    
    add_user_to_group(db, user_id=current_user.id, group_id=group.id, role="member")
    
    return {"message": f"Successfully joined {group.name}", "group_id": group.id}

@router.delete("/activity/{activity_id}", status_code=status.HTTP_200_OK)
def remove_shared_document(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    activity = db.query(GroupActivity).filter(GroupActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Share activity not found")

    document = db.query(Document).filter(Document.public_id == activity.document_public_id).first()
    if not document or document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only remove your own shared scrolls")

    document.group_id = None
    db.delete(activity)
    db.commit()
    
    return {"message": "Scroll removed from War Room"}