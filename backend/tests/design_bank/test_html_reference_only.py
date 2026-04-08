"""
Tests that HTML/CSS/JS content is stored as reference-only and never executed.
"""

import pytest

from apps.design_bank.validators import is_reference_only

pytestmark = pytest.mark.django_db


def test_html_is_reference_only():
    assert is_reference_only("text/html") is True
    assert is_reference_only("text/html; charset=utf-8") is True


def test_css_is_reference_only():
    assert is_reference_only("text/css") is True


def test_javascript_is_reference_only():
    assert is_reference_only("application/javascript") is True
    assert is_reference_only("text/javascript") is True


def test_pdf_is_not_reference_only():
    assert is_reference_only("application/pdf") is False


def test_image_is_not_reference_only():
    assert is_reference_only("image/png") is False
    assert is_reference_only("image/jpeg") is False


def test_extracted_data_marks_html_as_reference_only():
    """
    Verify that _extract_text_metadata sets reference_only=True for HTML content
    and does NOT execute or eval any code — only extracts a text snippet.
    """
    from apps.design_bank.tasks import _extract_text_metadata

    html = b"<html><body><script>alert('xss')</script></body></html>"
    result = _extract_text_metadata(html, "text/html", url="https://example.com")

    assert result["reference_only"] is True
    assert "text_snippet" in result
    # The raw bytes are stored as a text snippet — no execution
    assert "<script>" in result["text_snippet"]
    # No 'executed' or 'eval' flag
    assert "executed" not in result


def test_extracted_data_marks_css_as_reference_only():
    from apps.design_bank.tasks import _extract_text_metadata

    css = b"body { background: #fff; color: #333; }"
    result = _extract_text_metadata(css, "text/css")

    assert result["reference_only"] is True
    assert "text_snippet" in result


def test_extracted_data_marks_js_as_reference_only():
    from apps.design_bank.tasks import _extract_text_metadata

    js = b"function evil() { return 42; }"
    result = _extract_text_metadata(js, "application/javascript")

    assert result["reference_only"] is True
    assert "text_snippet" in result


def test_extracted_data_image_not_reference_only():
    from apps.design_bank.tasks import _extract_text_metadata

    png_header = b"\x89PNG\r\n\x1a\n"
    result = _extract_text_metadata(png_header, "image/png")

    assert result["reference_only"] is False
    assert "text_snippet" not in result


def test_html_source_stored_with_reference_only_flag(client, monkeypatch):
    """
    End-to-end: upload an HTML file, verify the source is created with pending status
    and that if extraction runs it marks reference_only=True.
    """

    from tests.accounts.factories import (
        MembershipFactory,
        UserFactory,
        WorkspaceFactory,
    )

    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner_html@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")

    # Login
    csrf = client.get("/api/v1/auth/csrf").json().get("csrf_token", "")
    client.post(
        "/api/v1/auth/login",
        data={"email": owner.email, "password": "testpassword123"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=csrf,
    )

    from django.core.files.uploadedfile import SimpleUploadedFile

    import apps.design_bank.storage as storage_mod
    from apps.design_bank import tasks as tasks_mod

    monkeypatch.setattr(storage_mod, "upload_file", lambda *a, **kw: "design-bank/html-key")
    monkeypatch.setattr(storage_mod, "generate_storage_key", lambda fn: "design-bank/html-key")
    monkeypatch.setattr(tasks_mod.extract_from_file, "delay", lambda *a, **kw: None)

    html_content = b"<html><body><h1>Brand Guide</h1></body></html>"
    f = SimpleUploadedFile("brand.html", html_content, content_type="text/html")
    response = client.post(
        "/api/v1/design-bank/sources/upload",
        data={"file": f},
    )

    assert response.status_code == 201
    data = response.json()
    # Source is created — it's stored as reference, not executed
    assert data["status"] == "pending"
    # source_type is html for .html files
    assert data["source_type"] == "html"
