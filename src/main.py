from fastapi import FastAPI
from src.core.config import settings
from src.core.db.database import Base, engine
from src.models.document import Document

app = FastAPI()

@app.get("/")
def read_root():
    Base.metadata.create_all(bind=engine)
    return {"status":"DB initialized"}
