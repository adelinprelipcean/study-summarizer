from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.api.dependencies import get_current_admin
from src.models.user import User
from src.api.schemas.user_schemas import UserAdminOut, BanUserRequest
from typing import List

router = APIRouter()

@router.get("/users", response_model=List[UserAdminOut])
def get_all_users_for_admin(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    return db.query(User).all()

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