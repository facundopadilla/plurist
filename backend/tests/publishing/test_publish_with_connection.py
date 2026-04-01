"""Tests that execute_publish passes SocialConnection to the adapter."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from apps.integrations.adapters import PublishResult
from apps.publishing.models import PublishAttempt, SocialConnection
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _setup_workspace():
    workspace = WorkspaceFactory()
    owner = UserFactory()
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    return workspace, owner


def _make_approved_post(workspace, owner):
    from apps.approvals.models import ApprovalDecision, ApprovedSnapshot
    from apps.posts.models import DraftPost

    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=owner,
        title="Test post",
        body_text="Hello world",
        target_networks=["x"],
        status=DraftPost.Status.APPROVED,
    )
    decision = ApprovalDecision.objects.create(
        draft_post=post,
        decided_by=owner,
        decision=ApprovalDecision.Decision.APPROVED,
    )
    snapshot = ApprovedSnapshot.objects.create(
        draft_post=post,
        approval_decision=decision,
        snapshot_data={"text": "Hello world"},
    )
    return post, snapshot


def _make_connection(workspace, owner, network="x"):
    conn = SocialConnection.objects.create(
        workspace=workspace,
        network=network,
        display_name="@test",
        provider_user_id="42",
        status=SocialConnection.Status.CONNECTED,
        is_active=True,
        created_by=owner,
    )
    from apps.integrations.crypto import TokenVault

    conn.credentials_enc = TokenVault.encrypt({"access_token": "live_token"})
    conn.save()
    return conn


# ---------------------------------------------------------------------------
# execute_publish — connection wiring
# ---------------------------------------------------------------------------


def test_publish_attempt_stores_social_connection():
    """_do_publish_now attaches the matching SocialConnection to the attempt."""
    workspace, owner = _setup_workspace()
    conn = _make_connection(workspace, owner)
    post, _ = _make_approved_post(workspace, owner)

    from apps.publishing.api import _do_publish_now

    with patch("apps.publishing.api.execute_publish") as mock_task:
        mock_task.delay = MagicMock()
        attempts = _do_publish_now(post, actor=owner)

    assert len(attempts) == 1
    assert attempts[0].social_connection_id == conn.pk


def test_publish_attempt_has_no_connection_when_none_exists():
    """If no active connection exists for the network, social_connection is None."""
    workspace, owner = _setup_workspace()
    post, _ = _make_approved_post(workspace, owner)

    from apps.publishing.api import _do_publish_now

    with patch("apps.publishing.api.execute_publish") as mock_task:
        mock_task.delay = MagicMock()
        attempts = _do_publish_now(post, actor=owner)

    assert len(attempts) == 1
    assert attempts[0].social_connection is None


def test_execute_publish_passes_connection_to_adapter():
    """execute_publish loads social_connection and passes it to adapter.publish()."""
    from apps.posts.models import DraftPost

    workspace, owner = _setup_workspace()
    conn = _make_connection(workspace, owner)
    post, snapshot = _make_approved_post(workspace, owner)

    attempt = PublishAttempt.objects.create(
        draft_post=post,
        approved_snapshot=snapshot,
        network="x",
        social_connection=conn,
    )

    captured = {}

    def fake_publish(connection, content):
        captured["connection"] = connection
        return PublishResult(success=True, external_post_id="tweet-123")

    mock_adapter = MagicMock()
    mock_adapter.publish.side_effect = fake_publish

    # DraftPost.__init__ calls _material_snapshot() which accesses many fields.
    # refresh_from_db(fields=[...]) creates a partial instance that triggers
    # a recursion. Patch it to avoid the issue — we only care about the adapter call.
    with (
        patch(
            "apps.publishing.tasks.get_adapter",
            return_value=mock_adapter,
        ),
        patch.object(DraftPost, "refresh_from_db"),
    ):
        from apps.publishing.tasks import execute_publish

        execute_publish(attempt.pk)

    assert captured.get("connection") is not None
    assert captured["connection"].pk == conn.pk


def test_execute_publish_adds_image_url_from_render_asset_key():
    from apps.posts.models import DraftPost

    workspace, owner = _setup_workspace()
    conn = _make_connection(workspace, owner, network="instagram")
    post, snapshot = _make_approved_post(workspace, owner)
    snapshot.snapshot_data = {
        "caption": "Hello Instagram",
        "render_asset_key": "renders/example.png",
    }
    snapshot.save(update_fields=["snapshot_data"])

    attempt = PublishAttempt.objects.create(
        draft_post=post,
        approved_snapshot=snapshot,
        network="instagram",
        social_connection=conn,
    )

    captured = {}

    def fake_publish(connection, content):
        captured["content"] = content
        return PublishResult(success=True, external_post_id="ig-123")

    mock_adapter = MagicMock()
    mock_adapter.publish.side_effect = fake_publish

    with (
        patch("apps.publishing.tasks.get_adapter", return_value=mock_adapter),
        patch(
            "apps.publishing.tasks.generate_presigned_url",
            return_value="https://cdn.example.com/render.png",
        ),
        patch.object(DraftPost, "refresh_from_db"),
    ):
        from apps.publishing.tasks import execute_publish

        execute_publish(attempt.pk)

    assert captured["content"]["image_url"] == "https://cdn.example.com/render.png"
