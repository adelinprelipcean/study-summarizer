"""
Service layer for Admin operations.
"""
import os
from fastapi import HTTPException
from sqlalchemy.orm import Session
from src.api.repositories.user_repository import get_all_users, get_user_by_id, set_user_ban
from src.api.repositories.document_repository import (
    get_document_by_public_id,
    mark_document_safe,
    get_dangerous_documents_by_user,
    delete_document_obj
)
from src.core.config import settings


def get_all_users_service(db: Session):
    users = get_all_users(db)
    for user in users:
        user.has_dangerous_docs = any(doc.is_dangerous for doc in user.documents if doc.is_dangerous is not None)
    return users


def toggle_user_ban_service(db: Session, target_user_id: int, reason: str | None):
    target_user = get_user_by_id(db, target_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.is_admin:
        raise HTTPException(status_code=403, detail="An admin cannot ban another admin.")

    new_ban_state = not target_user.is_banned
    set_user_ban(db, target_user, is_banned=new_ban_state, reason=reason)

    if new_ban_state:
        _purge_dangerous_docs(db, target_user_id)

    return target_user


def ban_user_service(db: Session, user_id: int, reason: str | None):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    set_user_ban(db, user, is_banned=True, reason=reason)
    _purge_dangerous_docs(db, user_id)
    return user


def verify_document_safe_service(db: Session, public_id: str):
    doc = get_document_by_public_id(db, public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return mark_document_safe(db, doc)


def get_user_dangerous_documents_service(db: Session, user_id: int):
    return get_dangerous_documents_by_user(db, user_id)


def _purge_dangerous_docs(db: Session, user_id: int):
    dangerous_docs = get_dangerous_documents_by_user(db, user_id)
    for doc in dangerous_docs:
        for ext in [doc.filetype, "pdf", "docx", "txt"]:
            file_path = os.path.join(settings.UPLOAD_DIR, f"{doc.public_id}.{ext}")
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass
        delete_document_obj(db, doc)
