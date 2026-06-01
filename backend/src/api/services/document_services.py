"""
Service layer for Document operations.

Implements application logic such as generating IDs, validating document
existence, and orchestrating actions between API routes and the repository.
Contains no database queries—delegates all persistence actions to the repository.
"""
import shutil
import os
from datetime import datetime, timezone, timedelta
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from src.api.repositories.document_repository import (
    create_document,
    get_all_documents,
    get_document_by_public_id,
    delete_document,
    update_document_status,
    update_document_summary,
    rename_document,
    get_all_document_public_ids
)
from src.api.repositories.guest_usage_repository import (
    get_guest_usage_by_identifier,
    create_guest_usage,
    update_guest_usage,
    increment_guest_usage_count
)
from src.api.schemas.document_schemas import DocumentsListOut
from src.models.document import Document
from src.core.config import settings


def create_document_service(db: Session, file: UploadFile, title: str, owner_id: int):
    import re
    existing_ids = get_all_document_public_ids(db)
    max_num = 0
    for pid in existing_ids:
        match = re.match(r"^D(\d+)$", pid)
        if match:
            max_num = max(max_num, int(match.group(1)))
    public_id = f"D{max_num + 1}"

    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'other'
    if ext not in ['pdf', 'docx', 'txt']:
        ext = 'other'

    try:
        doc = create_document(
            db=db,
            public_id=public_id,
            status="uploaded",
            title=title,
            filetype=ext,
            filename=file.filename,
            owner_id=owner_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    save_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{ext}")

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


def save_document_summary_service(db: Session, doc: Document, summary: str, is_dangerous: bool, summary_type: str) -> Document:
    return update_document_summary(db, doc, summary, is_dangerous, summary_type)


def rename_document_service(db: Session, public_id: str, new_title: str, owner_id: int) -> Document:
    doc = get_document_by_public_id(db, public_id)
    if not doc or doc.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized to rename this scroll")
    return rename_document(db, doc, new_title)


def check_and_update_guest_limit(db: Session, identifier: str, increment_count: bool = True):
    usage = get_guest_usage_by_identifier(db, identifier)
    now = datetime.now(timezone.utc)

    if not usage:
        create_guest_usage(db, identifier, count=1 if increment_count else 0)
        return True, "Success"

    last_reset = usage.last_reset
    if last_reset.tzinfo is None:
        last_reset = last_reset.replace(tzinfo=timezone.utc)

    if now - last_reset > timedelta(days=1):
        update_guest_usage(db, usage, count=1 if increment_count else 0, last_reset=now)
        return True, "Success"

    if usage.count >= 2:
        return False, "Daily limit reached. Wait 24h or Register to save your scrolls."

    if increment_count:
        increment_guest_usage_count(db, usage)

    return True, "Success"


def get_guest_usage_count_service(db: Session, identifier: str) -> int:
    usage = get_guest_usage_by_identifier(db, identifier)
    if not usage:
        return 0

    now = datetime.now(timezone.utc)
    last_reset = usage.last_reset.replace(tzinfo=timezone.utc) if usage.last_reset.tzinfo is None else usage.last_reset

    if now - last_reset > timedelta(days=1):
        update_guest_usage(db, usage, count=0, last_reset=now)
        return 0

    return usage.count