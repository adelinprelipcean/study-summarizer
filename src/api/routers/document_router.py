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

router = APIRouter()

@router.post("/", response_model=DocumentOut)
def create_document_endpoint(
    data: DocumentCreate,
    db: Session = Depends(get_db)
):
    return create_document_service(db=db, data=data)

@router.get("/", response_model=DocumentsListOut)
def get_all_documents_endpoint(db: Session = Depends(get_db)):
    return get_all_documents_service(db=db)

@router.get("/{public_id}", response_model=DocumentOut)
def get_document_endpoint(public_id: str, db: Session = Depends(get_db)):
    doc = get_document_service(db=db, public_id=public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{public_id}", response_model=MessageOut)
def delete_document_endpoint(public_id: str, db: Session = Depends(get_db)):
    success = delete_document_service(db=db, public_id=public_id)
    if not success:
        return {"message" : "Document not found"}
    return {"message" : "Document deleted"}

@router.put("/{public_id}/status", response_model=DocumentOut)
def update_document_status_endpoint(public_id: str, data: DocumentStatusUpdate, db: Session = Depends(get_db)):
    updated = update_document_status_service(db=db, public_id=public_id, status=data.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated
    