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
    save_document_summary_service,
    rename_document_service,
    check_and_update_guest_limit,
    get_guest_usage_count_service
)
from src.api.services.group_service import share_document_to_group_service
from src.api.dependencies import get_current_user, get_optional_current_user
from src.models.user import User
from src.utils.file_parser import extract_text_from_file
from src.api.services.ai_service import generate_summary
from src.api.repositories.document_repository import get_document_by_public_id
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
    usage_count = get_guest_usage_count_service(db, identifier)
    return {"usage_count": usage_count}


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
        # Physically remove temporary original file and summary file from disk
        for ext in ["pdf", "docx", "txt", "summary.txt"]:
            file_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{ext}")
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error removing guest file {file_path}: {e}")
        return {"message": "Temporary scroll removed"}

    doc = get_document_by_public_id(db, public_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to destroy this scroll")

    deleted = delete_document_service(db=db, public_id=public_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Database error during deletion")

    return {"message": "Document deleted"}


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
    from src.api.repositories.group_repository import is_user_member_of_group

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
            save_document_summary_service(db, doc, summary_text, bool(is_dangerous_flag), summary_type)
        else:
            guest_summary_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.summary.txt")
            with open(guest_summary_path, "w", encoding="utf-8") as f:
                f.write(summary_text)

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

    return rename_document_service(db, public_id, new_title, current_user.id)


@router.post("/{public_id}/share/{group_id}")
def share_document(
    public_id: str,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return share_document_to_group_service(db, public_id, group_id, current_user.id, current_user.is_admin)


# DOWNLOAD

@router.get("/{public_id}/download-original")
def download_original_document(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    """Serve the original uploaded file as a download."""
    from src.api.repositories.group_repository import is_user_member_of_group

    doc = get_document_by_public_id(db, public_id)

    if doc:
        if current_user and doc.owner_id != current_user.id:
            if doc.group_id:
                if not is_user_member_of_group(db, current_user.id, doc.group_id):
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")
        file_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.{doc.filetype}")
        download_name = doc.filename or f"{doc.title}.{doc.filetype}"
    else:
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
    title: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    """Generate and serve a branded PDF containing the AI summary."""
    from fpdf import FPDF
    from src.api.repositories.group_repository import is_user_member_of_group

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
        title = title or doc.title
        summary_text = doc.summary
        summary_type = doc.summary_type or "simple"
    else:
        guest_summary_path = os.path.join(settings.UPLOAD_DIR, f"{public_id}.summary.txt")
        if os.path.exists(guest_summary_path):
            with open(guest_summary_path, "r", encoding="utf-8") as f:
                summary_text = f.read()
            title = title or "Guest Document Summary"
            summary_type = "simple"
        else:
            raise HTTPException(status_code=404, detail="Document not found")

    logo_path = os.path.join(
        os.path.dirname(__file__),
        "..", "..", "..", "..",
        "frontend", "src", "assets", "logo_summerey.png"
    )
    logo_path = os.path.abspath(logo_path)

    def strip_markdown(text: str) -> str:
        text = re.sub(r'#{1,6}\s*', '', text)
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        text = re.sub(r'`{1,3}(.*?)`{1,3}', r'\1', text)
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
        text = re.sub(r'^[-*+]\s+', '• ', text, flags=re.MULTILINE)
        return text.strip()

    clean_summary = strip_markdown(summary_text)

    effective_width = 210 - 40

    possible_fonts = [
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    possible_bold = [
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    possible_italic = [
        "C:/Windows/Fonts/ariali.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Italic.ttf",
        "/Library/Fonts/Arial Italic.ttf",
    ]

    arial_regular = None
    arial_bold = None
    arial_italic = None

    for p in possible_fonts:
        if os.path.exists(p):
            arial_regular = p
            break
    for p in possible_bold:
        if os.path.exists(p):
            arial_bold = p
            break
    for p in possible_italic:
        if os.path.exists(p):
            arial_italic = p
            break

    font_added = False
    try:
        pdf_temp = FPDF()
        if arial_regular and os.path.exists(arial_regular):
            pdf_temp.add_font("ArialU", "",  arial_regular)
            if arial_bold and os.path.exists(arial_bold):
                pdf_temp.add_font("ArialU", "B", arial_bold)
            if arial_italic and os.path.exists(arial_italic):
                pdf_temp.add_font("ArialU", "I", arial_italic)
            unicode_font = "ArialU"
            font_added = True
    except Exception:
        pass

    if not font_added:
        import unicodedata
        def _safe(t: str) -> str:
            return unicodedata.normalize("NFKD", t).encode("latin-1", "ignore").decode("latin-1")
        clean_summary = _safe(clean_summary)
        title = _safe(title)
        unicode_font = "Helvetica"

    class CustomPDF(FPDF):
        def header(self):
            if self.page_no() == 1:
                self.set_fill_color(17, 17, 18)
                self.rect(0, 0, 210, 38, 'F')

                if os.path.exists(logo_path):
                    self.image(logo_path, x=8, y=5, h=28)

                self.set_xy(42, 12)
                self.set_font("Helvetica", "B", 15)
                self.set_text_color(212, 175, 55)
                self.cell(0, 6, "SUMMEREY-I", ln=True)
                self.set_xy(42, 20)
                self.set_font("Helvetica", "", 8)
                self.set_text_color(180, 180, 180)
                self.cell(0, 5, "AI-Powered Study Summarizer", ln=True)

                self.set_xy(100, 12)
                self.set_font(unicode_font, "B", 11)
                self.set_text_color(212, 175, 55)
                self.multi_cell(100, 5, title, align="R")

                badge_label = f"[ {summary_type.upper()} SUMMARY ]"
                self.set_xy(100, self.get_y() + 1)
                self.set_font(unicode_font, "B", 8)
                self.set_text_color(212, 175, 55)
                self.multi_cell(100, 4, badge_label, align="R")

                self.set_draw_color(212, 175, 55)
                self.set_line_width(0.5)
                self.line(20, 42, 190, 42)

                self.set_y(48)

        def footer(self):
            self.set_y(-15)
            self.set_draw_color(212, 175, 55)
            self.set_line_width(0.3)
            self.line(20, self.get_y(), 190, self.get_y())
            self.ln(2)
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(160, 160, 160)
            generated_date = datetime.now().strftime("%B %d, %Y")

            col_width = effective_width / 3
            self.cell(col_width, 5, f"Generated on {generated_date}  -  Summerey-I", align="L")
            self.cell(col_width, 5, f"Page {self.page_no()}", align="C")
            self.cell(col_width, 5, "(c) Summerey-I  -  All rights reserved", align="R")

    pdf = CustomPDF()
    if font_added:
        pdf.add_font("ArialU", "",  arial_regular)
        pdf.add_font("ArialU", "B", arial_bold if (arial_bold and os.path.exists(arial_bold)) else arial_regular)
        pdf.add_font("ArialU", "I", arial_italic if (arial_italic and os.path.exists(arial_italic)) else arial_regular)

    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font(unicode_font, "", 11.5)
    pdf.set_text_color(45, 45, 48)
    pdf.set_line_width(0.2)

    pdf.ln(6)

    for line in clean_summary.split('\n'):
        line = line.strip()
        if not line:
            pdf.ln(4)
            continue
        if line.startswith('•'):
            pdf.set_x(26)
            pdf.multi_cell(effective_width - 6, 7, line, align="L")
        else:
            pdf.set_x(20)
            pdf.multi_cell(effective_width, 7, line, align="L")
        pdf.ln(2)

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