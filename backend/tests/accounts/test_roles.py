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


def test_editor_cannot_create_invite(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)

    response = client.post(
        "/api/v1/auth/invites",
        data={"email": "new@example.com", "role": "editor"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 403


def test_publisher_cannot_create_invite(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    _login(client, publisher.email)

    response = client.post(
        "/api/v1/auth/invites",
        data={"email": "new@example.com", "role": "editor"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 403


def test_owner_can_create_invite(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)

    response = client.post(
        "/api/v1/auth/invites",
        data={"email": "new@example.com", "role": "editor"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 201


def test_owner_can_list_members(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, owner.email)

    response = client.get("/api/v1/auth/members")

    assert response.status_code == 200
    assert len(response.json()) == 2
