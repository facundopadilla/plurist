"""
Tests for get_operational_summary service function.
Verifies counts are correct for content lifecycle events.
"""

import pytest

from apps.analytics.services import get_operational_summary, record_event
from tests.accounts.factories import UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def test_empty_workspace_returns_zero_counts():
    workspace = WorkspaceFactory()
    summary = get_operational_summary(workspace)

    assert summary["content_created"] == 0
    assert summary["content_completed"] == 0
    assert summary["content_reverted"] == 0


def test_counts_match_recorded_events():
    workspace = WorkspaceFactory()
    actor = UserFactory()

    record_event(workspace, "content_created", actor, "draft_post", 1)
    record_event(workspace, "content_created", actor, "draft_post", 2)
    record_event(workspace, "content_completed", actor, "draft_post", 1)
    record_event(workspace, "content_reverted", actor, "draft_post", 2)

    summary = get_operational_summary(workspace)

    assert summary["content_created"] == 2
    assert summary["content_completed"] == 1
    assert summary["content_reverted"] == 1


def test_unknown_event_is_recorded_but_not_in_summary():
    workspace = WorkspaceFactory()
    actor = UserFactory()

    record_event(workspace, "unknown_event", actor, "draft_post", 1)

    summary = get_operational_summary(workspace)

    assert "unknown_event" not in summary
    assert all(v == 0 for v in summary.values())


def test_record_event_with_metadata():
    workspace = WorkspaceFactory()
    actor = UserFactory()

    event = record_event(
        workspace,
        "content_completed",
        actor,
        "draft_post",
        42,
        metadata={"format": "ig_square"},
    )

    assert event.pk is not None
    assert event.metadata == {"format": "ig_square"}
    assert event.target_id == 42
    assert event.target_type == "draft_post"


def test_record_event_with_null_actor():
    workspace = WorkspaceFactory()

    event = record_event(workspace, "content_created", None, "draft_post", 7)

    assert event.actor is None
    assert event.event_type == "content_created"
