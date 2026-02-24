from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.api.dependencies import get_current_admin
from src.models.user import User
from src.models.document import Document
from src.api.schemas.document_schemas import DocumentOut
from src.api.schemas.user_schemas import UserAdminOut, BanUserRequest
from typing import List
from src.api.repositories.document_repository import get_document_by_public_id

router = APIRouter()

@router.get("/users", response_model=List[UserAdminOut])
def get_all_users_for_admin(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    users = db.query(User).all()
    
    for user in users:
        user.has_dangerous_docs = any(doc.is_dangerous for doc in user.documents if doc.is_dangerous is not None)
        
    return users


@router.patch("/users/{target_user_id}/ban")
def toggle_user_ban(
    target_user_id: int,
    request: BanUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    target_user = db.query(User).filter(User.id == target_user_id).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.is_admin:
        raise HTTPException(status_code=403, detail="An admin cannot ban another admin.")
        
    target_user.is_banned = not target_user.is_banned
    target_user.ban_reason = request.reason if target_user.is_banned else None
    
    db.commit()
    
    status_msg = "banned" if target_user.is_banned else "unbanned"
    return {"message": f"User @{target_user.username} has been {status_msg}."}


@router.patch("/documents/{public_id}/verify-safe")
def verify_document_safe(
    public_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    doc = get_document_by_public_id(db, public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.is_dangerous = False
    db.commit()
    return {"message": "Document marked as safe by admin"}


@router.post("/users/{user_id}/ban")
def ban_user(
    user_id: int,
    request: BanUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_banned = True
    user.ban_reason = request.reason
    db.commit()
    return {"message": f"User {user.username} has been banned"}


@router.get("/users/{user_id}/dangerous-documents", response_model=List[DocumentOut])
def get_user_dangerous_documents(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    docs = db.query(Document).filter(
        Document.owner_id == user_id,
        Document.is_dangerous == True
    ).all()
    
    return docs