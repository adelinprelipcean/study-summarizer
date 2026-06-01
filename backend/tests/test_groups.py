"""Tests for /api/groups endpoints."""


def _create_group(client, auth_headers, name="War Room Alpha"):
    return client.post(
        "/api/groups/",
        json={"name": name, "description": "Test group"},
        headers=auth_headers,
    )


def test_create_group(client, auth_headers):
    res = _create_group(client, auth_headers)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["name"] == "War Room Alpha"
    assert "access_code" in data
    # generate_unique_code uses k=5 (5 uppercase letters)
    assert len(data["access_code"]) == 5


def test_create_group_requires_auth(client):
    res = client.post("/api/groups/", json={"name": "Unauthorized Group"})
    assert res.status_code in (401, 403)


def test_get_my_groups_empty(client, auth_headers):
    res = client.get("/api/groups/me", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) == 0


def test_get_my_groups_after_create(client, auth_headers):
    _create_group(client, auth_headers, "Room One")
    _create_group(client, auth_headers, "Room Two")

    res = client.get("/api/groups/me", headers=auth_headers)
    assert res.status_code == 200
    names = [g["name"] for g in res.json()]
    assert "Room One" in names
    assert "Room Two" in names


def test_get_group_documents_empty(client, auth_headers):
    group_id = _create_group(client, auth_headers).json()["id"]
    res = client.get(f"/api/groups/{group_id}/documents", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_get_group_activity_empty(client, auth_headers):
    group_id = _create_group(client, auth_headers).json()["id"]
    res = client.get(f"/api/groups/{group_id}/activity", headers=auth_headers)
    assert res.status_code == 200


def test_delete_group(client, auth_headers):
    group_id = _create_group(client, auth_headers, "To Delete").json()["id"]
    del_res = client.delete(f"/api/groups/{group_id}", headers=auth_headers)
    assert del_res.status_code in (200, 204)


def test_duplicate_group_name_rejected(client, auth_headers):
    _create_group(client, auth_headers, "Unique Room")
    res = _create_group(client, auth_headers, "Unique Room")
    # service now returns 400 for duplicate names
    assert res.status_code == 400
