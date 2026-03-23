"""
Tests for listing and detail endpoints.
"""

import pytest

from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory
from tests.design_bank.factories import DesignBankSourceFactory

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


def test_owner_can_list_sources(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    DesignBankSourceFactory(workspace=workspace, original_filename="a.png")
    DesignBankSourceFactory(workspace=workspace, original_filename="b.pdf")
    _login(client, owner.email)

    response = client.get("/api/v1/design-bank/sources")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_editor_can_list_sources(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    DesignBankSourceFactory(workspace=workspace)
    _login(client, editor.email)

    response = client.get("/api/v1/design-bank/sources")

    assert response.status_code == 200


def test_publisher_can_list_sources(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    DesignBankSourceFactory(workspace=workspace)
    _login(client, publisher.email)

    response = client.get("/api/v1/design-bank/sources")

    assert response.status_code == 200


def test_unauthenticated_cannot_list_sources(client):
    WorkspaceFactory()
    response = client.get("/api/v1/design-bank/sources")
    assert response.status_code == 401


def test_owner_can_get_source_detail(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner2@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    source = DesignBankSourceFactory(workspace=workspace, original_filename="logo.png")
    _login(client, owner.email)

    response = client.get(f"/api/v1/design-bank/sources/{source.pk}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == source.pk
    assert data["original_filename"] == "logo.png"


def test_publisher_can_get_source_detail(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher2@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    source = DesignBankSourceFactory(workspace=workspace)
    _login(client, publisher.email)

    response = client.get(f"/api/v1/design-bank/sources/{source.pk}")

    assert response.status_code == 200


def test_get_nonexistent_source_returns_404(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner3@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    response = client.get("/api/v1/design-bank/sources/99999")

    assert response.status_code == 404


def test_publisher_cannot_create_url_source(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher3@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    _login(client, publisher.email)

    response = client.post(
        "/api/v1/design-bank/sources/url",
        data={"url": "https://example.com/guide.pdf"},
        content_type="application/json",
    )

    assert response.status_code == 403


def test_list_only_returns_workspace_sources(client):
    """Sources from another workspace are not visible."""
    workspace = WorkspaceFactory()
    # Create a source for workspace (pk=1, the only allowed workspace — singleton)
    owner = UserFactory(email="owner4@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    DesignBankSourceFactory(workspace=workspace, original_filename="mine.png")
    _login(client, owner.email)

    response = client.get("/api/v1/design-bank/sources")

    assert response.status_code == 200
    filenames = [s["original_filename"] for s in response.json()]
    assert "mine.png" in filenames


def test_source_detail_contains_status_and_extracted_data(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner5@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    source = DesignBankSourceFactory(
        workspace=workspace,
        status="ready",
        extracted_data={"color": "#ff0000"},
    )
    _login(client, owner.email)

    response = client.get(f"/api/v1/design-bank/sources/{source.pk}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["extracted_data"] == {"color": "#ff0000"}
