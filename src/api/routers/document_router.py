"""
API router for Document endpoints.

Exposes the HTTP routes for creating, retrieving, updating, and deleting
documents. Validates request payloads using Pydantic schemas and delegates
business operations to the service layer.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.db.database import get_db
from src.api.schemas.document_schemas import (
    DocumentCreate,
    DocumentOut,
    DocumentsListOut,
    MessageOut,
    DocumentStatusUpdate
)
from src.api.services.document_services import (
    create_document_service,
    get_all_documents_service,
    get_document_service,
    delete_document_service,
    update_document_status_service
)
from src.api.dependencies import get_current_user
from src.models.user import User

router = APIRouter()

@router.post("/", response_model=DocumentOut)
def create_document_endpoint(
    data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Acum apelam serviciul si ii dam si ID-ul userului logat
    return create_document_service(db=db, data=data, owner_id=current_user.id)

@router.get("/", response_model=DocumentsListOut)
def get_all_documents_endpoint(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_all_documents_service(db=db, owner_id=current_user.id)

@router.get("/{public_id}", response_model=DocumentOut)
def get_document_endpoint(public_id: str, db: Session = Depends(get_db)):
    doc = get_document_service(db=db, public_id=public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{public_id}", response_model=MessageOut)
def delete_document_endpoint(public_id: str, db: Session = Depends(get_db)):
    deleted = delete_document_service(db=db, public_id=public_id)
    if not deleted:
        return {"message" : "Document not found"}
    return {"message" : "Document deleted"}

@router.put("/{public_id}/status", response_model=DocumentOut)
def update_document_status_endpoint(public_id: str, data: DocumentStatusUpdate, db: Session = Depends(get_db)):
    updated = update_document_status_service(db=db, public_id=public_id, status=data.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated
    