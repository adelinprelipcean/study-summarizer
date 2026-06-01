import os
from fastapi import FastAPI
from dotenv import load_dotenv
from src.core.db.database import Base, engine
from src.core.config import settings
from src.api.routers.document_router import router as document_router
from src.api.routers.auth_router import router as auth_router
from src.api.routers.admin_router import router as admin_router
from src.api.routers import group_router
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"status":"DB initialized"}

app.include_router(auth_router, prefix="/api/users", tags=["Users"])
app.include_router(document_router, prefix="/api/documents", tags=["Documents"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(group_router.router, prefix="/api/groups", tags=["Groups"])

allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)