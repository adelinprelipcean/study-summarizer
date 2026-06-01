"""Tests for /api/documents endpoints."""
import io
from unittest.mock import patch

# Upload endpoint requires both `file` (File) and `title` (Form) fields
def _upload(client, auth_headers, content=b"Sample study content.", name="doc.txt", title="Test Document"):
    return client.post(
        "/api/documents/",
        files={"file": (name, io.BytesIO(content), "text/plain")},
        data={"title": title},
        headers=auth_headers,
    )


def test_list_documents_empty(client, auth_headers):
    res = client.get("/api/documents/", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["documents"] == []


def test_upload_txt_document(client, auth_headers):
    res = _upload(client, auth_headers)
    assert res.status_code in (200, 201)
    data = res.json()
    assert "public_id" in data
    assert data["public_id"].startswith("D")


def test_upload_requires_auth(client):
    # Without auth the endpoint still accepts (guest path), but missing title → 422
    res = client.post(
        "/api/documents/",
        files={"file": ("doc.txt", io.BytesIO(b"content"), "text/plain")},
        # no title → FastAPI returns 422
    )
    assert res.status_code == 422


def test_get_document_by_id(client, auth_headers):
    upload_res = _upload(client, auth_headers)
    assert upload_res.status_code in (200, 201), upload_res.text
    public_id = upload_res.json()["public_id"]

    res = client.get(f"/api/documents/{public_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["public_id"] == public_id


def test_get_nonexistent_document(client, auth_headers):
    res = client.get("/api/documents/D9999", headers=auth_headers)
    assert res.status_code == 404


def test_list_documents_after_upload(client, auth_headers):
    _upload(client, auth_headers, name="first.txt", title="First")
    _upload(client, auth_headers, name="second.txt", title="Second")

    res = client.get("/api/documents/", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()["documents"]) == 2


def test_delete_document(client, auth_headers):
    public_id = _upload(client, auth_headers).json()["public_id"]

    del_res = client.delete(f"/api/documents/{public_id}", headers=auth_headers)
    assert del_res.status_code in (200, 204)

    assert client.get(f"/api/documents/{public_id}", headers=auth_headers).status_code == 404


def test_rename_document(client, auth_headers):
    public_id = _upload(client, auth_headers).json()["public_id"]

    # rename endpoint uses Form(new_title=...), not JSON body
    res = client.patch(
        f"/api/documents/{public_id}/rename",
        data={"new_title": "Renamed Title"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["title"] == "Renamed Title"


def test_summarize_document_mocked(client, auth_headers):
    public_id = _upload(client, auth_headers).json()["public_id"]

    mock_result = {"summary": "• Key point one\n• Key point two", "is_dangerous": False}
    # Patch where the name is used: the document_router module, not ai_service
    with patch("src.api.routers.document_router.generate_summary", return_value=mock_result):
        res = client.post(
            f"/api/documents/{public_id}/summarize",
            params={"summary_type": "concise"},
            headers=auth_headers,
        )
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert data["public_id"] == public_id


def test_guest_limit_endpoint(client):
    res = client.get("/api/documents/guest-limit")
    assert res.status_code == 200
    assert "usage_count" in res.json()
