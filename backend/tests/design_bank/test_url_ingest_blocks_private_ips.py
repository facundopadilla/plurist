"""
Tests for SSRF protection in URL ingestion.
All external requests are mocked — no real network calls.
"""

import socket

import pytest
from ninja.errors import HttpError

from apps.design_bank.validators import _is_ip_blocked, validate_url

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Unit tests for the validator functions (no HTTP)
# ---------------------------------------------------------------------------


def test_localhost_127_0_0_1_blocked():
    assert _is_ip_blocked("127.0.0.1") is True


def test_localhost_127_1_2_3_blocked():
    assert _is_ip_blocked("127.1.2.3") is True


def test_rfc1918_10_blocked():
    assert _is_ip_blocked("10.0.0.1") is True
    assert _is_ip_blocked("10.255.255.255") is True


def test_rfc1918_172_blocked():
    assert _is_ip_blocked("172.16.0.1") is True
    assert _is_ip_blocked("172.31.255.255") is True


def test_rfc1918_192_168_blocked():
    assert _is_ip_blocked("192.168.1.1") is True


def test_link_local_169_254_blocked():
    assert _is_ip_blocked("169.254.0.1") is True
    # Metadata service IP
    assert _is_ip_blocked("169.254.169.254") is True


def test_public_ip_not_blocked():
    assert _is_ip_blocked("8.8.8.8") is False
    assert _is_ip_blocked("1.1.1.1") is False
    assert _is_ip_blocked("93.184.216.34") is False


def test_ipv6_loopback_blocked():
    assert _is_ip_blocked("::1") is True


def test_validate_url_blocks_localhost(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, port, **kw: [(None, None, None, None, ("127.0.0.1", 80))],
    )
    with pytest.raises(HttpError) as exc_info:
        validate_url("http://localhost/secret")
    assert exc_info.value.status_code == 400
    assert "blocked" in exc_info.value.message.lower()


def test_validate_url_blocks_metadata_service(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, port, **kw: [(None, None, None, None, ("169.254.169.254", 80))],
    )
    with pytest.raises(HttpError) as exc_info:
        validate_url("http://169.254.169.254/latest/meta-data/")
    assert exc_info.value.status_code == 400


def test_validate_url_blocks_rfc1918(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, port, **kw: [(None, None, None, None, ("10.0.0.1", 80))],
    )
    with pytest.raises(HttpError):
        validate_url("http://internal.example/")


def test_validate_url_rejects_ftp_scheme():
    with pytest.raises(HttpError) as exc_info:
        validate_url("ftp://example.com/file.zip")
    assert exc_info.value.status_code == 400
    assert "ftp" in exc_info.value.message.lower()


def test_validate_url_rejects_file_scheme():
    with pytest.raises(HttpError):
        validate_url("file:///etc/passwd")


def test_validate_url_rejects_missing_hostname():
    with pytest.raises(HttpError):
        validate_url("http://")


def test_validate_url_accepts_public_url(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, port, **kw: [(None, None, None, None, ("93.184.216.34", 80))],
    )
    result = validate_url("https://example.com/page")
    assert result == "https://example.com/page"


def test_validate_url_dns_resolution_failure(monkeypatch):
    def raise_gaierror(*a, **kw):
        raise socket.gaierror("Name or service not known")

    monkeypatch.setattr(socket, "getaddrinfo", raise_gaierror)
    with pytest.raises(HttpError) as exc_info:
        validate_url("http://nonexistent.invalid/")
    assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# API-level tests for URL ingest endpoint
# ---------------------------------------------------------------------------


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


def test_api_blocks_private_ip_url(client, monkeypatch):
    from tests.accounts.factories import (
        MembershipFactory,
        UserFactory,
        WorkspaceFactory,
    )

    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, port, **kw: [(None, None, None, None, ("192.168.1.100", 80))],
    )

    response = client.post(
        "/api/v1/design-bank/sources/url",
        data={"url": "http://internal-server/"},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert "blocked" in response.json()["detail"].lower()


def test_api_accepts_public_url(client, monkeypatch):
    from apps.design_bank import tasks as tasks_mod
    from tests.accounts.factories import (
        MembershipFactory,
        UserFactory,
        WorkspaceFactory,
    )

    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner2@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, port, **kw: [(None, None, None, None, ("93.184.216.34", 80))],
    )
    monkeypatch.setattr(
        tasks_mod.extract_from_url,
        "delay",
        lambda *a, **kw: None,
    )

    response = client.post(
        "/api/v1/design-bank/sources/url",
        data={"url": "https://example.com/brand-guide.pdf"},
        content_type="application/json",
    )

    assert response.status_code == 201
    assert response.json()["source_type"] == "url"
