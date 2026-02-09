"""
API router for Document endpoints.

Exposes the HTTP routes for creating, retrieving, updating, and deleting
documents. Validates request payloads using Pydantic schemas and delegates
business operations to the service layer.
"""
import shutil
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
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
from src.utils.pdf_utils import extract_text_from_pdf
from src.api.services.ai_service import generate_summary
from src.api.repositories.document_repository import get_document_by_public_id

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=DocumentOut)
def create_document_endpoint(
    file: UploadFile = File(...),
    title: str = Form(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed.")
    
    return create_document_service(
        db=db,
        file=file,
        title=title,
        owner_id=current_user.id
    )

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

@router.post("/{public_id}/summarize")
def summarize_document(
    public_id: str,
    summary_type: str = "concise",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"--- START REQUEST pentru {public_id} ---")
    
    doc = get_document_by_public_id(db, public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    file_path = os.path.join(UPLOAD_DIR, f"{public_id}.pdf")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file not found on server")
        
    text_content = extract_text_from_pdf(file_path)
    
    if not text_content:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF (scanned or empty?)")

    try:
        summary = generate_summary(text_content, summary_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
    
    return {"public_id": public_id, "summary": summary}