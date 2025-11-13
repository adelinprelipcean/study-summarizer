from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.db.database import get_db
from src.api.schemas.document_schemas import DocumentCreate, DocumentOut
from src.api.services.document_services import create_document_service

router = APIRouter()

@router.post("/", response_model=DocumentOut)
def create_document_endpoint(
    data: DocumentCreate,
    db: Session = Depends(get_db)
):
    return create_document_service(db=db, data=data)