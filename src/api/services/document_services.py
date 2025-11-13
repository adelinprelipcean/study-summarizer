from sqlalchemy.orm import Session
from src.api.repositories.document_repository import (
    create_document,
    get_all_documents,
    get_document_by_public_id,
    delete_document
)
import uuid
from src.api.schemas.document_schemas import DocumentCreate


def create_document_service(db: Session, data: DocumentCreate):
    public_id = str(uuid.uuid4())
    return create_document(
        db=db,
        public_id=public_id,
        status="pending",
        title=data.title,
        filetype=data.filetype,
        filename=data.filename
    )
    
    
def get_document_service(db: Session, public_id: str):
    return get_document_by_public_id(db, public_id)


def list_documents_service(db: Session):
    return get_all_documents(db)


def delete_document_service(db: Session, public_id: str):
    return delete_document(db, public_id)