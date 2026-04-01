"""Tests for social OAuth token refresh Celery tasks."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.integrations.crypto import TokenVault
from apps.integrations.tasks import refresh_expiring_tokens, refresh_single_connection
from apps.publishing.models import SocialConnection
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _make_connection(network="x", expires_in_hours=12, status="connected"):
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="owner")
    conn = SocialConnection.objects.create(
        workspace=workspace,
        network=network,
        display_name="test",
        is_active=True,
        status=status,
        token_expires_at=timezone.now() + timedelta(hours=expires_in_hours),
        created_by=user,
    )
    conn.credentials_enc = TokenVault.encrypt({"access_token": "old_token", "refresh_token": "old_refresh"})
    conn.save()
    return conn


# ---------------------------------------------------------------------------
# refresh_expiring_tokens — task scheduling
# ---------------------------------------------------------------------------


def test_refresh_expiring_finds_tokens_expiring_soon():
    conn_soon = _make_connection(expires_in_hours=6)  # within 24h → should refresh
    conn_later = _make_connection(expires_in_hours=48)  # far away → skip

    with patch("apps.integrations.tasks.refresh_single_connection") as mock_task:
        mock_task.delay = MagicMock()
        refresh_expiring_tokens()
        called_ids = {call.args[0] for call in mock_task.delay.call_args_list}

    assert conn_soon.pk in called_ids
    assert conn_later.pk not in called_ids


def test_refresh_expiring_skips_inactive_connections():
    conn = _make_connection(expires_in_hours=6)
    conn.is_active = False
    conn.save()

    with patch("apps.integrations.tasks.refresh_single_connection") as mock_task:
        mock_task.delay = MagicMock()
        refresh_expiring_tokens()
        assert mock_task.delay.call_count == 0


def test_refresh_expiring_skips_revoked_connections():
    _make_connection(expires_in_hours=6, status="revoked")

    with patch("apps.integrations.tasks.refresh_single_connection") as mock_task:
        mock_task.delay = MagicMock()
        refresh_expiring_tokens()
        assert mock_task.delay.call_count == 0


# ---------------------------------------------------------------------------
# refresh_single_connection — X
# ---------------------------------------------------------------------------


def test_refresh_x_updates_tokens():
    conn = _make_connection(network="x")

    new_token_data = {
        "access_token": "new_x_token",
        "refresh_token": "new_x_refresh",
        "expires_in": 7200,
        "expires_at": 9999999999,
    }

    with patch("apps.integrations.tasks.httpx.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: new_token_data,
            raise_for_status=lambda: None,
        )
        refresh_single_connection(conn.pk)

    conn.refresh_from_db()
    assert conn.status == SocialConnection.Status.CONNECTED
    tokens = conn.get_tokens()
    assert tokens["access_token"] == "new_x_token"


def test_refresh_single_marks_error_after_max_retries():
    conn = _make_connection(network="x")

    with patch("apps.integrations.tasks.httpx.post") as mock_post:
        mock_post.side_effect = Exception("network error")
        # Run the task directly (bypass Celery retry mechanism)
        with patch.object(
            refresh_single_connection,
            "retry",
            side_effect=refresh_single_connection.MaxRetriesExceededError(),
        ):
            refresh_single_connection(conn.pk)

    conn.refresh_from_db()
    assert conn.status == SocialConnection.Status.ERROR


def test_refresh_nonexistent_connection_does_not_raise():
    # Should return silently without error
    refresh_single_connection(99999)
