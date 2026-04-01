"""
Tests for get_operational_summary service function.
Verifies counts are correct and that no engagement metrics are present.
"""

import pytest

from apps.analytics.services import get_operational_summary, record_event
from tests.accounts.factories import UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def test_empty_workspace_returns_zero_counts():
    workspace = WorkspaceFactory()
    summary = get_operational_summary(workspace)

    assert summary["publish_requested"] == 0
    assert summary["publish_succeeded"] == 0
    assert summary["publish_failed"] == 0
    assert summary["approval_requested"] == 0
    assert summary["approval_approved"] == 0
    assert summary["approval_rejected"] == 0


def test_counts_match_recorded_events():
    workspace = WorkspaceFactory()
    actor = UserFactory()

    record_event(workspace, "publish_requested", actor, "draft_post", 1)
    record_event(workspace, "publish_requested", actor, "draft_post", 2)
    record_event(workspace, "publish_succeeded", actor, "publish_attempt", 1)
    record_event(workspace, "publish_failed", actor, "publish_attempt", 2)
    record_event(workspace, "approval_requested", actor, "draft_post", 3)
    record_event(workspace, "approval_approved", actor, "draft_post", 3)
    record_event(workspace, "approval_rejected", actor, "draft_post", 4)
    record_event(workspace, "approval_rejected", actor, "draft_post", 5)

    summary = get_operational_summary(workspace)

    assert summary["publish_requested"] == 2
    assert summary["publish_succeeded"] == 1
    assert summary["publish_failed"] == 1
    assert summary["approval_requested"] == 1
    assert summary["approval_approved"] == 1
    assert summary["approval_rejected"] == 2


def test_fallback_applied_event_is_recorded_but_not_in_summary():
    workspace = WorkspaceFactory()
    actor = UserFactory()

    record_event(workspace, "fallback_applied", actor, "publish_attempt", 1)

    summary = get_operational_summary(workspace)

    # fallback_applied is not a summary key
    assert "fallback_applied" not in summary
    # All summary counts remain zero
    assert all(v == 0 for v in summary.values())


def test_summary_has_no_engagement_metrics():
    workspace = WorkspaceFactory()
    summary = get_operational_summary(workspace)

    forbidden_keys = {
        "likes",
        "impressions",
        "comments",
        "clicks",
        "follower_growth",
        "followers",
        "reach",
        "shares",
    }
    assert forbidden_keys.isdisjoint(summary.keys()), (
        f"Engagement metrics found in summary: {forbidden_keys & summary.keys()}"
    )


def test_record_event_with_metadata():
    workspace = WorkspaceFactory()
    actor = UserFactory()

    event = record_event(
        workspace,
        "publish_failed",
        actor,
        "publish_attempt",
        42,
        metadata={"error": "timeout", "network": "linkedin"},
    )

    assert event.pk is not None
    assert event.metadata == {"error": "timeout", "network": "linkedin"}
    assert event.target_id == 42
    assert event.target_type == "publish_attempt"


def test_record_event_with_null_actor():
    workspace = WorkspaceFactory()

    event = record_event(workspace, "publish_requested", None, "draft_post", 7)

    assert event.actor is None
    assert event.event_type == "publish_requested"
