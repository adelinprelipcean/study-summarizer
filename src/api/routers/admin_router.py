"""
API Router for Admin operations.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.core.db.database import get_db
from src.api.schemas.document_schemas import DocumentsListOut
from src.api.repositories.document_repository import get_all_documents_admin
from src.api.dependencies import get_current_admin
from src.models.user import User

router = APIRouter()

@router.get("/documents", response_model=DocumentsListOut)
def get_all_documents_for_admin(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)):
    docs = get_all_documents_admin(db)
    return DocumentsListOut(documents=docs)