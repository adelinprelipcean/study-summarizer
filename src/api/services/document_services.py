from sqlalchemy.orm import Session
from src.api.repositories.document_repository import (
    create_document,
    get_all_documents,
    get_document_by_public_id,
    delete_document,
    update_document_status
)
import uuid
from src.api.schemas.document_schemas import DocumentCreate, DocumentsListOut
from src.models.document import Document


def create_document_service(db: Session, data: DocumentCreate):
    count = db.query(Document).count()
    public_id = f"D{count + 1}"
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


def get_all_documents_service(db: Session):
    docs = get_all_documents(db)
    return DocumentsListOut(documents=docs)
        

def delete_document_service(db: Session, public_id: str):
    return delete_document(db=db, public_id=public_id)


def update_document_status_service(db: Session, public_id: str, status: str):
    return update_document_status(db=db, public_id=public_id, status=status)