"""
API Router for Group endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.api.schemas.group_schemas import GroupCreate, GroupOut, ActivityOut
from src.api.dependencies import get_current_user
from src.models.user import User
from src.api.schemas.document_schemas import DocumentOut
from src.api.services.group_service import (
    create_group_service,
    invite_user_to_group_service,
    get_my_groups_service,
    get_war_room_documents_service,
    get_group_activity_service,
    delete_group_service,
    join_group_by_code_service,
    remove_shared_document_service,
    leave_group_service
)

router = APIRouter()


@router.post("/", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def make_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_group_service(db, name=data.name, description=data.description, creator_id=current_user.id)


@router.post("/{group_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def invite_to_group(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_added = invite_user_to_group_service(db, group_id, user_id, current_user.id, current_user.is_admin)
    return {"message": f"The user {user_added.username} was added to the group."}


@router.get("/me", response_model=list[GroupOut])
def get_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_my_groups_service(db, user_id=current_user.id)


@router.get("/{group_id}/documents", response_model=list[DocumentOut])
def get_war_room_documents(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_war_room_documents_service(db, group_id, current_user.id)


@router.get("/{group_id}/activity", response_model=list[ActivityOut])
def get_group_activity(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_group_activity_service(db, group_id, current_user.id)


@router.delete("/{group_id}", status_code=status.HTTP_200_OK)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_group_service(db, group_id, current_user.id, current_user.is_admin)
    return {"message": "War Room deleted successfully"}


@router.post("/join/{access_code}")
def join_group_by_code(
    access_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = join_group_by_code_service(db, access_code, current_user.id)
    return {"message": f"Successfully joined {group.name}", "group_id": group.id}


@router.delete("/activity/{activity_id}", status_code=status.HTTP_200_OK)
def remove_shared_document(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    remove_shared_document_service(db, activity_id, current_user.id)
    return {"message": "Scroll removed from War Room"}


@router.post("/leave/{group_id}", status_code=status.HTTP_200_OK)
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = leave_group_service(db, group_id, current_user.id)
    return {"message": f"Successfully left {group.name}"}