from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.db.database import get_db
from src.api.schemas.group_schemas import GroupCreate, GroupOut
from src.api.repositories.group_repository import create_group, get_group_by_id, add_user_to_group
from src.api.repositories.user_repository import get_user_by_id
from src.api.dependencies import get_current_user
from src.models.user import User

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