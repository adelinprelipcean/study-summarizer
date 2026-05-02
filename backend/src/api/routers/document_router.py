"""
API router for Document endpoints.
"""
import shutil
import os
import io
import re
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
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
from src.utils.file_parser import extract_text_from_file
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
async def create_document_endpoint(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user) 
):
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Document is too large. Maximum allowed size is 10MB.")
    
    await file.seek(0)
    
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    allowed_extensions = ["pdf", "docx", "txt"]
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Format not allowed. Use {', '.join(allowed_extensions).upper()}.")
    
    if current_user is None:
        identifier = request.client.host
        is_allowed, message = check_and_update_guest_limit(db, identifier, increment_count=False)
        
        if not is_allowed:
            raise HTTPException(status_code=403, detail=message)
            
        now = datetime.now(timezone.utc)
        public_id = f"guest-{uuid.uuid4()}" 
        save_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{ext}")
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "public_id": public_id,
            "title": title,
            "filetype": ext,
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

    file_path = None
    if doc:
        file_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{doc.filetype}")
    else:
        for ext in ["pdf", "docx", "txt"]:
            possible_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{ext}")
            if os.path.exists(possible_path):
                file_path = possible_path
                break

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file not found on server")
        
    text_content = extract_text_from_file(file_path)
    if not text_content:
        raise HTTPException(status_code=400, detail="Could not extract text. Scroll might be scanned, empty or corrupted.")

    try:
        ai_result = generate_summary(text_content, summary_type)
        summary_text = ai_result["summary"]
        is_dangerous_flag = ai_result["is_dangerous"]
        
        if doc:           
            db.add(doc)
            doc.summary = summary_text
            doc.is_dangerous = bool(is_dangerous_flag)
            doc.summary_type = summary_type
            db.commit()
            db.refresh(doc)
            
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

    # DB Update
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


# ── DOWNLOAD ENDPOINTS ───────────────────────────────────────────────────────

@router.get("/{public_id}/download-original")
def download_original_document(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    """Serve the original uploaded file as a download."""
    # Try DB first (registered users)
    doc = get_document_by_public_id(db, public_id)
    
    if doc:
        # Permission check
        if current_user and doc.owner_id != current_user.id:
            if doc.group_id:
                if not is_user_member_of_group(db, current_user.id, doc.group_id):
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")
        file_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{doc.filetype}")
        download_name = doc.filename or f"{doc.title}.{doc.filetype}"
    else:
        # Guest doc — scan for file
        file_path = None
        for ext in ["pdf", "docx", "txt"]:
            candidate = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{ext}")
            if os.path.exists(candidate):
                file_path = candidate
                download_name = f"document.{ext}"
                break
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=file_path,
        filename=download_name,
        media_type="application/octet-stream"
    )


@router.get("/{public_id}/download-summary")
def download_summary_pdf(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    """Generate and serve a branded PDF containing the AI summary."""
    from fpdf import FPDF
    
    doc = get_document_by_public_id(db, public_id)
    
    if doc:
        if current_user and doc.owner_id != current_user.id:
            if doc.group_id:
                if not is_user_member_of_group(db, current_user.id, doc.group_id):
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")
        if not doc.summary:
            raise HTTPException(status_code=404, detail="No summary available for this document")
        title = doc.title
        summary_text = doc.summary
        summary_type = doc.summary_type or "simple"
    else:
        raise HTTPException(status_code=404, detail="Document not found")

    # ── Logo path ──────────────────────────────────────────────────────────
    logo_path = os.path.join(
        os.path.dirname(__file__),
        "..", "..", "..", "..",  # backend/
        "frontend", "src", "assets", "logo_summerey.png"
    )
    logo_path = os.path.abspath(logo_path)

    # ── Strip markdown syntax for plain-text PDF body ─────────────────────
    def strip_markdown(text: str) -> str:
        text = re.sub(r'#{1,6}\s*', '', text)     # headings
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # bold
        text = re.sub(r'\*(.*?)\*', r'\1', text)       # italic
        text = re.sub(r'`{1,3}(.*?)`{1,3}', r'\1', text)  # code
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)    # links
        text = re.sub(r'^[-*+]\s+', '• ', text, flags=re.MULTILINE)  # bullets
        return text.strip()

    clean_summary = strip_markdown(summary_text)

    effective_width = 210 - 40  # A4 width minus margins

    # ── Load Unicode font (Arial from Windows, fallback to DejaVu if missing) ─
    arial_regular = "C:/Windows/Fonts/arial.ttf"
    arial_bold    = "C:/Windows/Fonts/arialbd.ttf"
    arial_italic  = "C:/Windows/Fonts/ariali.ttf"

    font_added = False
    try:
        pdf_temp = FPDF()
        if os.path.exists(arial_regular):
            pdf_temp.add_font("ArialU", "",  arial_regular)
            pdf_temp.add_font("ArialU", "B", arial_bold if os.path.exists(arial_bold) else arial_regular)
            pdf_temp.add_font("ArialU", "I", arial_italic if os.path.exists(arial_italic) else arial_regular)
            unicode_font = "ArialU"
            font_added = True
    except Exception:
        pass
        
    if not font_added:
        # Last-resort: transliterate non-latin-1 characters so Helvetica won't crash
        import unicodedata
        def _safe(t: str) -> str:
            return unicodedata.normalize("NFKD", t).encode("latin-1", "ignore").decode("latin-1")
        clean_summary = _safe(clean_summary)
        title = _safe(title)
        unicode_font = "Helvetica"

    class CustomPDF(FPDF):
        def header(self):
            if self.page_no() == 1:
                # ── Header band ───────────────────────────────────────────────────────
                self.set_fill_color(17, 17, 18)   # near-black
                self.rect(0, 0, 210, 38, 'F')

                # Logo (if available)
                if os.path.exists(logo_path):
                    self.image(logo_path, x=8, y=5, h=28)

                # Brand text beside logo
                self.set_xy(42, 12)
                self.set_font("Helvetica", "B", 15)
                self.set_text_color(212, 175, 55)   # samurai gold
                self.cell(0, 6, "SUMMEREY-I", ln=True)
                self.set_xy(42, 20)
                self.set_font("Helvetica", "", 8)
                self.set_text_color(180, 180, 180)
                self.cell(0, 5, "AI-Powered Study Summarizer", ln=True)

                # Document title on the top black part, to the right
                self.set_xy(100, 12)
                self.set_font(unicode_font, "B", 11)
                self.set_text_color(212, 175, 55) # samurai gold
                self.multi_cell(100, 5, title, align="R")

                # Summary type badge, right below the title
                badge_label = f"[ {summary_type.upper()} SUMMARY ]"
                self.set_xy(100, self.get_y() + 1)
                self.set_font(unicode_font, "B", 8)
                self.set_text_color(212, 175, 55) # samurai gold
                self.multi_cell(100, 4, badge_label, align="R")

                # Gold separator line
                self.set_draw_color(212, 175, 55)
                self.set_line_width(0.5)
                self.line(20, 42, 190, 42)
                
                # Reset Y for the document body
                self.set_y(48)
            else:
                # Reset Y for subsequent pages so it doesn't overlap the top margin completely
                pass

        def footer(self):
            # Position at 1.5 cm from bottom
            self.set_y(-15)
            self.set_draw_color(212, 175, 55)
            self.set_line_width(0.3)
            self.line(20, self.get_y(), 190, self.get_y())
            self.ln(2)
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(160, 160, 160)
            generated_date = datetime.now().strftime("%B %d, %Y")
            
            # Split footer into 3 columns: Left, Center (page no), Right
            col_width = effective_width / 3
            self.cell(col_width, 5, f"Generated on {generated_date}  -  Summerey-I", align="L")
            self.cell(col_width, 5, f"Page {self.page_no()}", align="C")
            self.cell(col_width, 5, "(c) Summerey-I  -  All rights reserved", align="R")

    # ── Build PDF ─────────────────────────────────────────────────────────
    pdf = CustomPDF()
    if font_added:
        pdf.add_font("ArialU", "",  arial_regular)
        pdf.add_font("ArialU", "B", arial_bold if os.path.exists(arial_bold) else arial_regular)
        pdf.add_font("ArialU", "I", arial_italic if os.path.exists(arial_italic) else arial_regular)

    # Margins must be set BEFORE add_page() to take effect properly
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── Summary body ──────────────────────────────────────────────────────
    # A larger font size and a darker text color give a "bolder" and more solid feel.
    pdf.set_font(unicode_font, "B", 11.5)
    pdf.set_text_color(20, 20, 20)
    pdf.set_line_width(0.2)

    # Adding a bit of initial padding before the text starts
    pdf.ln(6)

    for line in clean_summary.split('\n'):
        line = line.strip()
        if not line:
            pdf.ln(4)  # Generous spacing between paragraphs
            continue
        if line.startswith('•'):
            pdf.set_x(26) # Slightly more indent for bullets
            # Line height increased to 7 for a breathable, modern look
            pdf.multi_cell(effective_width - 6, 7, line, align="L")
        else:
            pdf.set_x(20)
            pdf.multi_cell(effective_width, 7, line, align="L")
        pdf.ln(2) # Extra breathing room after each block

    # ── Stream output ─────────────────────────────────────────────────────
    safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')[:50]
    pdf_bytes = bytes(pdf.output())
    buffer = io.BytesIO(pdf_bytes)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="summary_{safe_title}.pdf"'
        }
    )