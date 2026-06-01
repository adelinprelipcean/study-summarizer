"""
API Router for Admin endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.api.dependencies import get_current_admin
from src.models.user import User
from src.api.schemas.document_schemas import DocumentOut
from src.api.schemas.user_schemas import UserAdminOut, BanUserRequest
from typing import List
from src.api.services.admin_service import (
    get_all_users_service,
    toggle_user_ban_service,
    ban_user_service,
    verify_document_safe_service,
    get_user_dangerous_documents_service
)

router = APIRouter()


@router.get("/users", response_model=List[UserAdminOut])
def get_all_users_for_admin(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    return get_all_users_service(db)


@router.patch("/users/{target_user_id}/ban")
def toggle_user_ban(
    target_user_id: int,
    request: BanUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = toggle_user_ban_service(db, target_user_id, request.reason)
    status_msg = "banned" if user.is_banned else "unbanned"
    return {"message": f"User @{user.username} has been {status_msg}."}


@router.patch("/documents/{public_id}/verify-safe")
def verify_document_safe(
    public_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    verify_document_safe_service(db, public_id)
    return {"message": "Document marked as safe by admin"}


@router.post("/users/{user_id}/ban")
def ban_user(
    user_id: int,
    request: BanUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = ban_user_service(db, user_id, request.reason)
    return {"message": f"User {user.username} has been banned"}


@router.get("/users/{user_id}/dangerous-documents", response_model=List[DocumentOut])
def get_user_dangerous_documents(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    return get_user_dangerous_documents_service(db, user_id)