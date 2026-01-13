from fastapi import FastAPI
from src.core.config import settings
from src.core.db.database import Base, engine
from src.api.routers.document_router import router as document_router
from src.api.routers.auth_router import router as auth_router
from src.models import user, document
from src.api.routers.admin_router import router as admin_router

app = FastAPI()

@app.get("/")
def read_root():
    Base.metadata.create_all(bind=engine)
    return {"status":"DB initialized"}

app.include_router(auth_router, prefix="/api/users", tags=["Users"])
app.include_router(document_router, prefix="/api/documents", tags=["Documents"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])