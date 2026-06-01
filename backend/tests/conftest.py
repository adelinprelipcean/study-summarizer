import os
import pytest

# Must be set before any app imports
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("JWT_SECRET", "test-secret-jwt-key-for-unit-tests")
os.environ.setdefault("GEMINI_API_KEY", "test-placeholder")
os.environ.setdefault("UPLOAD_DIR", "test_uploads")
os.environ.setdefault("ENV", "test")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from src.main import app
from src.core.db.database import Base, get_db

# StaticPool: all sessions share one connection so committed data is always
# visible to the next request — required for SQLite in test environments.
_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=_engine)

    def _override():
        db = _TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=_engine)


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
