"""
API router for Document endpoints.
"""
import shutil
import os
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session

from src.core.db.database import get_db
from src.api.schemas.document_schemas import (
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
from src.models.group import GroupActivity
from src.core.config import settings

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=DocumentOut)
def create_document_endpoint(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user) 
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed.")
    
    if current_user is None:
        identifier = request.client.host
        is_allowed, message = check_and_update_guest_limit(db, identifier)
        
        if not is_allowed:
            raise HTTPException(status_code=403, detail=message)
            
        now = datetime.now(timezone.utc)
        public_id = f"guest-{uuid.uuid4()}" 
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
def get_guest_limit_status(request: Request, db: Session = Depends(get_db)):
    identifier = request.client.host
    usage = db.query(GuestUsage).filter(GuestUsage.identifier == identifier).first()
    
    if not usage:
        return {"usage_count": 0}

    now = datetime.now(timezone.utc)
    last_reset = usage.last_reset.replace(tzinfo=timezone.utc) if usage.last_reset.tzinfo is None else usage.last_reset

    if now - last_reset > timedelta(days=1):
        usage.count = 0
        usage.last_reset = now
        db.commit()
        return {"usage_count": 0}

    return {"usage_count": usage.count}

@router.get("/{public_id}", response_model=DocumentOut)
def get_document_endpoint(public_id: str, db: Session = Depends(get_db)):
    doc = get_document_service(db=db, public_id=public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
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
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to destroy this scroll")
    
    deleted = delete_document_service(db=db, public_id=public_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Database error during deletion")
    
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
        if doc:
            if doc.owner_id != current_user.id:
                if doc.group_id:
                     if not is_user_member_of_group(db, current_user.id, doc.group_id):
                         raise HTTPException(status_code=403, detail="Not authorized to access this scroll")
                else:
                     raise HTTPException(status_code=403, detail="Not authorized to access this scroll")
            
            if doc.summary:
                return {"public_id": public_id, "summary": doc.summary}
        else:
             raise HTTPException(status_code=404, detail="Document not found in archive")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file not found on server")
        
    text_content = extract_text_from_pdf(file_path)
    if not text_content:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF (scanned or empty?)")

    try:
        ai_result = generate_summary(text_content, summary_type)
        summary_text = ai_result["summary"]
        is_dangerous_flag = ai_result["is_dangerous"]

        print(f"--- DEBUG ROUTER ---")
        print(f"AI Result received in router: {ai_result}")
        
        if doc:
            
            print(f"Updating Doc ID {doc.public_id}. Value to save: {is_dangerous_flag}")
            
            db.add(doc)
            doc.summary = summary_text
            doc.is_dangerous = bool(is_dangerous_flag)
            doc.summary_type = summary_type
            db.commit()
            db.refresh(doc)
            
            print(f"Post-Commit Check: {doc.is_dangerous}")
            
        return {
            "public_id": public_id, 
            "summary": summary_text, 
            "summary_type": summary_type,
            "is_dangerous": is_dangerous_flag
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

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

@router.post("/{public_id}/share/{group_id}")
def share_document(
    public_id: str, 
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Fetch Doc
    doc = get_document_by_public_id(db, public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Permissions
    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your scroll to share")
    
    group = get_group_by_id(db, group_id)
    if not group:
         raise HTTPException(status_code=404, detail="Group not found")

    # Verifies user's group membership
    if not is_user_member_of_group(db, current_user.id, group_id) and not current_user.is_admin:
         raise HTTPException(status_code=403, detail="You are not a member of this War Room")

    # Checks for duplicates
    existing_share = db.query(GroupActivity).filter(
        GroupActivity.group_id == group_id,
        GroupActivity.document_public_id == public_id
    ).first()

    if existing_share:
        raise HTTPException(
            status_code=400, 
            detail=f"The scroll '{doc.title}' is already present in this War Room."
        )
    # --------------------------------------------

    # 4. Perform Share (DB Update)
    share_document_with_group(db, public_id, group_id)
    
    new_activity = GroupActivity(
        group_id=group_id,
        user_id=current_user.id,
        document_public_id=public_id,
        content="shared a summerized scroll"
    )
    db.add(new_activity)
    db.commit()
    
    return {"message": f"The document '{doc.title}' has been shared with '{group.name}'"}