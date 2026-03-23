from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import Membership
from tests.accounts.factories import (
    InviteFactory,
    MembershipFactory,
    UserFactory,
    WorkspaceFactory,
)

pytestmark = pytest.mark.django_db


def _csrf(client):
    response = client.get("/api/v1/auth/csrf")
    return response.json().get("csrf_token", "")


def test_anonymous_cannot_access_me(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_login_with_valid_credentials(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=user, workspace=workspace, role="owner")

    response = client.post(
        "/api/v1/auth/login",
        data={"email": user.email, "password": "testpassword123"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 200
    assert "sessionid" in client.cookies


def test_login_with_invalid_password(client):
    user = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=user, role="owner")

    response = client.post(
        "/api/v1/auth/login",
        data={"email": user.email, "password": "wrong"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 401


def test_invite_accept_creates_membership(client):
    workspace = WorkspaceFactory()
    inviter = UserFactory(password="testpassword123")
    invite = InviteFactory(
        email="editor@example.com",
        workspace=workspace,
        invited_by=inviter,
        role="editor",
    )

    response = client.post(
        f"/api/v1/auth/invites/{invite.token}/accept",
        data={
            "name": "Editor User",
            "password": "testpassword123",
            "confirm_password": "testpassword123",
        },
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 200
    assert Membership.objects.filter(
        user__email="editor@example.com",
        workspace=workspace,
    ).exists()

    login_response = client.post(
        "/api/v1/auth/login",
        data={"email": "editor@example.com", "password": "testpassword123"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert login_response.status_code == 200


def test_invite_expired_returns_400(client):
    invite = InviteFactory(expires_at=timezone.now() - timedelta(minutes=1))

    response = client.post(
        f"/api/v1/auth/invites/{invite.token}/accept",
        data={
            "name": "Late User",
            "password": "testpassword123",
            "confirm_password": "testpassword123",
        },
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 400
