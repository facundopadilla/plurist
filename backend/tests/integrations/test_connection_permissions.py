import pytest

from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _csrf(client):
    response = client.get("/api/v1/auth/csrf")
    return response.json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    return client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


# ---------------------------------------------------------------------------
# List connections — all roles can view
# ---------------------------------------------------------------------------


def test_owner_can_list_connections(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    response = client.get("/api/v1/integrations/connections")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_editor_can_list_connections(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)

    response = client.get("/api/v1/integrations/connections")

    assert response.status_code == 200


def test_publisher_can_list_connections(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    _login(client, publisher.email)

    response = client.get("/api/v1/integrations/connections")

    assert response.status_code == 200


def test_unauthenticated_cannot_list_connections(client):
    response = client.get("/api/v1/integrations/connections")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Create connection — Owner only
# ---------------------------------------------------------------------------


def test_owner_can_create_connection(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    response = client.post(
        "/api/v1/integrations/connections",
        data={"network": "linkedin", "display_name": "Acme LinkedIn"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["network"] == "linkedin"
    assert body["display_name"] == "Acme LinkedIn"


def test_editor_cannot_create_connection(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)

    response = client.post(
        "/api/v1/integrations/connections",
        data={"network": "linkedin", "display_name": "Acme LinkedIn"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 403


def test_publisher_cannot_create_connection(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    _login(client, publisher.email)

    response = client.post(
        "/api/v1/integrations/connections",
        data={"network": "linkedin", "display_name": "Acme LinkedIn"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 403


def test_create_connection_rejects_unknown_network(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    response = client.post(
        "/api/v1/integrations/connections",
        data={"network": "tiktok", "display_name": "Acme TikTok"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Delete connection — Owner only
# ---------------------------------------------------------------------------


def test_owner_can_delete_connection(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    create_response = client.post(
        "/api/v1/integrations/connections",
        data={"network": "x", "display_name": "Acme X"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert create_response.status_code == 201
    connection_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/api/v1/integrations/connections/{connection_id}",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert delete_response.status_code == 200


def test_editor_cannot_delete_connection(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")

    # Owner creates connection
    _login(client, owner.email)
    create_response = client.post(
        "/api/v1/integrations/connections",
        data={"network": "x", "display_name": "Acme X"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    connection_id = create_response.json()["id"]

    # Editor tries to delete
    _login(client, editor.email)
    delete_response = client.delete(
        f"/api/v1/integrations/connections/{connection_id}",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert delete_response.status_code == 403


# ---------------------------------------------------------------------------
# Connection status — all roles can view
# ---------------------------------------------------------------------------


def test_owner_can_check_connection_status(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    create_response = client.post(
        "/api/v1/integrations/connections",
        data={"network": "instagram", "display_name": "Acme IG"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    connection_id = create_response.json()["id"]

    status_response = client.get(f"/api/v1/integrations/connections/{connection_id}/status")
    assert status_response.status_code == 200
    body = status_response.json()
    assert body["authenticated"] is True
