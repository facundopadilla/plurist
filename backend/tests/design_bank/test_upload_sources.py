"""
Tests for file upload API endpoint.
Covers: Owner/Editor can upload, Publisher cannot, file type detection.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _csrf(client):
    r = client.get("/api/v1/auth/csrf")
    return r.json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


def _mock_storage(monkeypatch):
    import apps.design_bank.storage as storage_mod
    from apps.design_bank import tasks as tasks_mod

    monkeypatch.setattr(storage_mod, "upload_file", lambda *a, **kw: "design-bank/test-key")
    monkeypatch.setattr(storage_mod, "generate_storage_key", lambda fn: "design-bank/test-key")
    monkeypatch.setattr(tasks_mod.extract_from_file, "delay", lambda *a, **kw: None)


def test_owner_can_upload(client, monkeypatch):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)
    _mock_storage(monkeypatch)

    f = SimpleUploadedFile("logo.png", b"PNG_DATA", content_type="image/png")
    response = client.post(
        "/api/v1/design-bank/sources/upload",
        data={"file": f},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["source_type"] == "image"
    assert data["status"] == "pending"


def test_editor_can_upload(client, monkeypatch):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)
    _mock_storage(monkeypatch)

    f = SimpleUploadedFile("doc.txt", b"TEXT_DATA", content_type="text/plain")
    response = client.post(
        "/api/v1/design-bank/sources/upload",
        data={"file": f},
    )

    assert response.status_code == 201


def test_publisher_cannot_upload(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    _login(client, publisher.email)

    f = SimpleUploadedFile("data.png", b"DATA", content_type="image/png")
    response = client.post(
        "/api/v1/design-bank/sources/upload",
        data={"file": f},
    )

    assert response.status_code == 403


def test_unauthenticated_cannot_upload(client):
    WorkspaceFactory()
    f = SimpleUploadedFile("data.png", b"DATA", content_type="image/png")
    response = client.post(
        "/api/v1/design-bank/sources/upload",
        data={"file": f},
    )
    assert response.status_code == 401


def test_pdf_detected_as_pdf_type(client, monkeypatch):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner2@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)
    _mock_storage(monkeypatch)

    f = SimpleUploadedFile("document.pdf", b"%PDF-1.4", content_type="application/pdf")
    response = client.post(
        "/api/v1/design-bank/sources/upload",
        data={"file": f},
    )

    assert response.status_code == 201
    assert response.json()["source_type"] == "pdf"
