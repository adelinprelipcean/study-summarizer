import os
import pytest

# Must come before any app imports — pydantic-settings reads these at class instantiation
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("JWT_SECRET", "test-secret-jwt-key-for-unit-tests")
os.environ.setdefault("GEMINI_API_KEY", "test-placeholder")
os.environ.setdefault("UPLOAD_DIR", "test_uploads")
os.environ.setdefault("ENV", "test")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from src.main import app
from src.core.db.database import Base, get_db

_TEST_DB_URL = "sqlite:///./test.db"
_engine = create_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=_engine)
    session = _TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_engine)


@pytest.fixture(scope="function")
def client(db_session):
    def _override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
    res = client.post("/api/users/register", json={
        "email": "warrior@example.com",
        "username": "warrior",
        "password": "Sword123!",
    })
    assert res.status_code == 201, res.text
    return res.json()


@pytest.fixture
def auth_headers(client, registered_user):
    res = client.post("/api/users/login", json={
        "email": "warrior@example.com",
        "password": "Sword123!",
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
