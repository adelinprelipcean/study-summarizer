"""
Service layer for Document operations.

Implements application logic such as generating IDs, validating document
existence, and orchestrating actions between API routes and the repository.
Contains no database queries—delegates all persistence actions to the repository.
"""
import shutil
import os
from datetime import datetime, timezone, timedelta
from src.models.guest_usage import GuestUsage
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
from src.models.guest_usage import GuestUsage
from src.core.config import settings

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
    
    save_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.pdf")
    
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

def check_and_update_guest_limit(db: Session, identifier: str):
    usage = db.query(GuestUsage).filter(GuestUsage.identifier == identifier).first()
    now = datetime.now(timezone.utc)

    if not usage:
        usage = GuestUsage(identifier=identifier, count=1, last_reset=now)
        db.add(usage)
        db.commit()
        return True, "Success"

    if now - usage.last_reset > timedelta(days=1):
        usage.count = 1
        usage.last_reset = now
        db.commit()
        return True, "Limit reset after 24h"

    if usage.count >= 10:
        return False, "Energy depleted. Wait 24h or Register to save your scrolls."

    usage.count += 1
    db.commit()
    return True, "Success"