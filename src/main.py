from fastapi import FastAPI
from src.core.config import settings

app = FastAPI()

@app.get("/")
def read_root():
    return {
        "message":"Salutare",
        "enviroment": settings.ENV
    }