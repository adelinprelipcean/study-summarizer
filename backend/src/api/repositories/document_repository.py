"""
Repository layer for the Document resource.

Provides low-level database operations for creating, retrieving, listing, and deleting
Document records, isolated from business logic and API concerns.
"""


from sqlalchemy.orm import Session
from src.models.document import Document

def create_document(db: Session, public_id: str, status: str, title: str, filetype: str, filename: str, owner_id: int) -> Document:
    doc = Document(
        public_id = public_id,
        status = status,
        title = title,
        filetype = filetype,
        filename = filename,
        owner_id = owner_id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def get_document_by_public_id(db: Session, public_id: str) -> Document:
    doc = db.query(Document).filter(Document.public_id == public_id).first()
    return doc
    
def get_all_documents(db: Session, owner_id: int) -> list[Document]:
    doc = db.query(Document).filter(Document.owner_id == owner_id).order_by(Document.uploaded_at.desc()).all()
    return doc

def delete_document(db: Session, public_id: str) -> bool:
    doc = db.query(Document).filter(Document.public_id == public_id).first()
    if doc:
        db.delete(doc)
        db.commit()
        return True
    else:
        return False
    
def update_document_status(db: Session, public_id: str, status: str):
    doc = db.query(Document).filter(Document.public_id == public_id).first()
    if not doc:
        return None
    doc.status = status
    db.commit()
    db.refresh(doc)
    return doc

def get_all_documents_admin(db: Session) -> list[Document]:
    return db.query(Document).order_by(Document.uploaded_at.desc()).all()


def get_all_document_public_ids(db: Session) -> list[str]:
    return [row.public_id for row in db.query(Document.public_id).all()]

def share_document_with_group(db: Session, public_id: str, group_id: int):
    doc = db.query(Document).filter(Document.public_id == public_id).first()
    if not doc:
        return None
    
    doc.group_id = group_id
    db.commit()
    db.refresh(doc)
    return doc

def get_documents_by_group(db: Session, group_id: int):
    return db.query(Document).filter(Document.group_id == group_id).all()


def update_document_summary(db: Session, doc: Document, summary: str, is_dangerous: bool, summary_type: str) -> Document:
    doc.summary = summary
    doc.is_dangerous = is_dangerous
    doc.summary_type = summary_type
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def rename_document(db: Session, doc: Document, new_title: str) -> Document:
    doc.title = new_title
    db.commit()
    db.refresh(doc)
    return doc


def mark_document_safe(db: Session, doc: Document) -> Document:
    doc.is_dangerous = False
    db.commit()
    db.refresh(doc)
    return doc


def get_dangerous_documents_by_user(db: Session, user_id: int) -> list[Document]:
    return db.query(Document).filter(
        Document.owner_id == user_id,
        Document.is_dangerous == True
    ).all()


def delete_document_obj(db: Session, doc: Document) -> None:
    db.delete(doc)
    db.commit()