"""
API router for Document endpoints.

Exposes the HTTP routes for creating, retrieving, updating, and deleting
documents. Validates request payloads using Pydantic schemas and delegates
business operations to the service layer.
"""
import shutil
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
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
    update_document_status_service,
    check_and_update_guest_limit
)
from src.api.dependencies import get_current_user, get_optional_current_user
from src.models.user import User
from src.utils.pdf_utils import extract_text_from_pdf
from src.api.services.ai_service import generate_summary
from src.api.repositories.document_repository import (
    get_document_by_public_id,
    share_document_with_group
)
from src.api.repositories.group_repository import (
    get_group_by_id,
    is_user_member_of_group
)
from src.models.guest_usage import GuestUsage
from src.core.config import settings

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=DocumentOut)
def create_document_endpoint(
    file: UploadFile = File(...),
    title: str = Form(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user) 
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed.")
    
    if current_user is None:
        now = datetime.now(timezone.utc)
        public_id = f"guest-{int(now.timestamp())}"
        save_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.pdf")
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "public_id": public_id,
            "title": title,
            "filetype": "pdf",
            "status": "temporary",
            "uploaded_at": now
        }

    return create_document_service(
        db=db,
        file=file,
        title=title,
        owner_id=current_user.id
    )


@router.get("/", response_model=DocumentsListOut)
def get_all_documents_endpoint(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    return get_all_documents_service(db=db, owner_id=current_user.id)


@router.get("/guest-limit")
def get_guest_limit_status(
    request: Request, 
    db: Session = Depends(get_db)
):
    identifier = request.client.host
    usage = db.query(GuestUsage).filter(GuestUsage.identifier == identifier).first()
    
    if not usage:
        return {"usage_count": 0}

    now = datetime.now(timezone.utc)
    last_reset = usage.last_reset
    
    if last_reset.tzinfo is None:
        last_reset = last_reset.replace(tzinfo=timezone.utc)

    if now - last_reset > timedelta(days=1):
        return {"usage_count": 0}

    return {"usage_count": usage.count}


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


@router.post("/{public_id}/summarize")
def summarize_document(
    public_id: str,
    request: Request,
    summary_type: str = "concise",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    file_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.pdf")
    doc = None

    if current_user is None:
        identifier = request.client.host
        is_allowed, message = check_and_update_guest_limit(db, identifier)
        
        if not is_allowed:
            raise HTTPException(status_code=403, detail=message)
        
    else:
        doc = get_document_by_public_id(db, public_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found in your archive")
            
        if doc.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to access this scroll")

        if doc.summary:
            return {"public_id": public_id, "summary": doc.summary}

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file not found on server")
        
    text_content = extract_text_from_pdf(file_path)
    
    if not text_content:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF (scanned or empty?)")

    try:
        summary = generate_summary(text_content, summary_type)
        
        if doc:
            doc.summary = summary
            db.commit()
            db.refresh(doc)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
    
    return {"public_id": public_id, "summary": summary}


@router.patch("/{public_id}/rename", response_model=DocumentOut)
def rename_document_endpoint(
    public_id: str, 
    new_title: str = Form(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user) 
):
    if current_user is None:
        return {
            "public_id": public_id,
            "title": new_title,
            "filetype": "pdf",
            "status": "temporary",
            "uploaded_at": datetime.now(timezone.utc)
        }

    doc = get_document_by_public_id(db, public_id)
    if not doc or doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to rename this scroll")
    
    doc.title = new_title
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{public_id}", response_model=MessageOut)
def delete_document_endpoint(
    public_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    if current_user is None:
        return {"message": "Temporary scroll removed"}

    doc = get_document_by_public_id(db, public_id)
    if not doc or doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to destroy this scroll")
    
    deleted = delete_document_service(db=db, public_id=public_id)
    return {"message": "Document deleted"}


@router.post("/{public_id}/share/{group_id}", status_code=status.HTTP_200_OK)
def share_document(
    public_id: str,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = get_document_by_public_id(db, public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can't share a document that doesn't belong to you")

    group = get_group_by_id(db, group_id)
    if not group:
         raise HTTPException(status_code=404, detail="Group not found")

    if not is_user_member_of_group(db, current_user.id, group_id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    share_document_with_group(db, public_id, group_id)

    return {"message": f"The document '{doc.title}' has been shared with the group '{group.name}'"}