"""
Service layer for Document operations.

Implements application logic such as generating IDs, validating document
existence, and orchestrating actions between API routes and the repository.
Contains no database queries—delegates all persistence actions to the repository.
"""
import shutil
import os
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from src.api.repositories.document_repository import (
    create_document,
    get_all_documents,
    get_document_by_public_id,
    delete_document,
    update_document_status
)
from src.api.schemas.document_schemas import DocumentCreate, DocumentsListOut
from src.models.document import Document

UPLOAD_DIR = "uploads"

def create_document_service(db: Session, file: UploadFile, title: str, owner_id: int):
    count = db.query(Document).count()
    public_id = f"D{count + 1}"
    
    try:
        doc = create_document(
            db=db,
            public_id=public_id,
            status="uploaded",
            title=title,
            filetype="pdf",
            filename=file.filename,
            owner_id=owner_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    save_path = os.path.join(UPLOAD_DIR, f"{public_id}.pdf")
    
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        delete_document(db, doc.id)
        raise HTTPException(status_code=500, detail=f"Could not save file to disk: {str(e)}")
    
    return doc
    
    
def get_document_service(db: Session, public_id: str):
    return get_document_by_public_id(db, public_id)


def get_all_documents_service(db: Session, owner_id: int):
    docs = get_all_documents(db, owner_id=owner_id)
    return DocumentsListOut(documents=docs)
        

def delete_document_service(db: Session, public_id: str):
    return delete_document(db=db, public_id=public_id)


def update_document_status_service(db: Session, public_id: str, status: str):
    return update_document_status(db=db, public_id=public_id, status=status)