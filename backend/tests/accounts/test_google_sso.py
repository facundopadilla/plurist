# pyright: reportAttributeAccessIssue=false

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.http import HttpResponseRedirect
from django.test import override_settings
from django.utils import timezone

from apps.accounts import api as accounts_api
from apps.accounts.models import Invite, Membership, OIDCProvider
from tests.accounts.factories import (
    InviteFactory,
    MembershipFactory,
    UserFactory,
    WorkspaceFactory,
)

pytestmark = pytest.mark.django_db


def _start_google_flow(client):
    with patch.object(accounts_api.oauth.google, "authorize_redirect") as mock_redirect:
        mock_redirect.return_value = HttpResponseRedirect(
            "https://accounts.google.com/o/oauth2/v2/auth"
        )
        response = client.get("/api/v1/auth/google/start")

    assert response.status_code == 302
    session = client.session
    return {
        "state": session["google_oidc_state"],
        "code_verifier": session["google_oidc_code_verifier"],
    }


def _callback(client, *, state, userinfo):
    with patch.object(
        accounts_api.oauth.google,
        "authorize_access_token",
        return_value={"userinfo": userinfo},
    ) as mock_token:
        response = client.get(f"/api/v1/auth/google/callback?code=fake&state={state}")
    return response, mock_token


def test_google_sso_logs_in_existing_oidc_provider(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="editor@example.com")
    MembershipFactory(user=user, workspace=workspace, role="editor")
    OIDCProvider.objects.create(provider="google", subject_id="sub-existing", user=user)

    flow = _start_google_flow(client)
    response, _ = _callback(
        client,
        state=flow["state"],
        userinfo={
            "sub": "sub-existing",
            "email": "editor@example.com",
            "email_verified": True,
            "name": "Editor",
        },
    )

    assert response.status_code == 302
    assert response.headers["Location"] == "/"
    assert client.get("/api/v1/auth/me").status_code == 200


def test_google_sso_links_existing_verified_email_user(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="editor@example.com")
    MembershipFactory(user=user, workspace=workspace, role="editor")

    flow = _start_google_flow(client)
    response, _ = _callback(
        client,
        state=flow["state"],
        userinfo={
            "sub": "sub-link-new",
            "email": "editor@example.com",
            "email_verified": True,
            "name": "Editor",
        },
    )

    assert response.status_code == 302
    assert OIDCProvider.objects.filter(
        provider="google",
        user=user,
        subject_id="sub-link-new",
    ).exists()


@override_settings(GOOGLE_ALLOWED_DOMAINS=["example.com"])
def test_google_sso_accepts_valid_invite_and_creates_user_membership_and_link(client):
    workspace = WorkspaceFactory()
    inviter = UserFactory(email="owner@example.com")
    invite = InviteFactory(
        email="neweditor@example.com",
        workspace=workspace,
        invited_by=inviter,
        role="editor",
        accepted=False,
        expires_at=timezone.now() + timedelta(days=3),
    )

    flow = _start_google_flow(client)
    response, _ = _callback(
        client,
        state=flow["state"],
        userinfo={
            "sub": "sub-invite",
            "email": "neweditor@example.com",
            "email_verified": True,
            "name": "New Editor",
        },
    )

    assert response.status_code == 302
    assert response.headers["Location"] == "/"
    assert Invite.objects.get(pk=invite.pk).accepted is True
    assert Membership.objects.filter(
        user__email="neweditor@example.com",
        workspace=workspace,
        role="editor",
    ).exists()
    assert OIDCProvider.objects.filter(
        provider="google",
        user__email="neweditor@example.com",
        subject_id="sub-invite",
    ).exists()


def test_google_sso_rejects_uninvited_user(client):
    flow = _start_google_flow(client)
    response, _ = _callback(
        client,
        state=flow["state"],
        userinfo={
            "sub": "sub-uninvited",
            "email": "nobody@example.com",
            "email_verified": True,
            "name": "Nobody",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "An invite is required to join this workspace"


@override_settings(GOOGLE_ALLOWED_DOMAINS=["example.com"])
def test_google_sso_rejects_disallowed_domain_even_with_valid_invite(client):
    workspace = WorkspaceFactory()
    inviter = UserFactory(email="owner@example.com")
    InviteFactory(
        email="external@other.com",
        workspace=workspace,
        invited_by=inviter,
        role="editor",
    )

    flow = _start_google_flow(client)
    response, _ = _callback(
        client,
        state=flow["state"],
        userinfo={
            "sub": "sub-external",
            "email": "external@other.com",
            "email_verified": True,
            "name": "External",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "An invite is required to join this workspace"
