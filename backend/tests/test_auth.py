"""Tests for /api/users endpoints."""


def test_register_returns_user(client):
    res = client.post("/api/users/register", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "Password123!",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new@example.com"
    assert data["username"] == "newuser"
    assert "hashed_password" not in data
    assert "password" not in data


def test_register_duplicate_email_rejected(client, registered_user):
    res = client.post("/api/users/register", json={
        "email": "warrior@example.com",
        "username": "other",
        "password": "Password123!",
    })
    assert res.status_code == 400


def test_register_duplicate_username_rejected(client, registered_user):
    res = client.post("/api/users/register", json={
        "email": "other@example.com",
        "username": "warrior",
        "password": "Password123!",
    })
    assert res.status_code == 400


def test_login_success(client, registered_user):
    res = client.post("/api/users/login", json={
        "email": "warrior@example.com",
        "password": "Sword123!",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, registered_user):
    res = client.post("/api/users/login", json={
        "email": "warrior@example.com",
        "password": "WrongPass!",
    })
    assert res.status_code == 400


def test_login_unknown_user(client):
    res = client.post("/api/users/login", json={
        "email": "ghost@example.com",
        "password": "SomePass123",
    })
    assert res.status_code == 400


def test_get_me_authenticated(client, auth_headers):
    res = client.get("/api/users/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "warrior@example.com"


def test_get_me_no_token(client):
    res = client.get("/api/users/me")
    assert res.status_code in (401, 403)


def test_get_me_invalid_token(client):
    res = client.get("/api/users/me", headers={"Authorization": "Bearer bad.token.here"})
    assert res.status_code == 401
