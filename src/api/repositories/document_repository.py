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