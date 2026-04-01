from datetime import timedelta

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone as dj_timezone

from apps.posts.models import DraftPost
from apps.scheduler.models import ScheduleEntry
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _make_approved_post(workspace, user):
    MembershipFactory(user=user, workspace=workspace, role="owner")
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=user,
        title="Test Post",
        body_text="Hello world",
    )
    post.submit_for_approval(user)
    post.approve(user, reason="Looks good")
    return post


class TestScheduleCreation:
    def test_can_schedule_approved_post(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="linkedin",
            scheduled_for=dj_timezone.now() + timedelta(hours=1),
            timezone="UTC",
            created_by=user,
        )
        assert entry.status == ScheduleEntry.Status.PENDING

    def test_cannot_schedule_draft_post(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        MembershipFactory(user=user, workspace=workspace, role="owner")
        post = DraftPost.objects.create(
            workspace=workspace,
            created_by=user,
            title="Draft",
            body_text="Not approved",
        )

        with pytest.raises(ValidationError, match="approved"):
            ScheduleEntry.objects.create(
                workspace=workspace,
                draft_post=post,
                network="linkedin",
                scheduled_for=dj_timezone.now() + timedelta(hours=1),
                created_by=user,
            )

    def test_cannot_schedule_rejected_post(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        MembershipFactory(user=user, workspace=workspace, role="owner")
        post = DraftPost.objects.create(
            workspace=workspace,
            created_by=user,
            title="Rejected",
            body_text="Will be rejected",
        )
        post.submit_for_approval(user)
        post.reject(user, reason="Nope")

        with pytest.raises(ValidationError, match="approved"):
            ScheduleEntry.objects.create(
                workspace=workspace,
                draft_post=post,
                network="x",
                scheduled_for=dj_timezone.now() + timedelta(hours=1),
                created_by=user,
            )


class TestScheduleOperations:
    def test_cancel_pending_entry(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="linkedin",
            scheduled_for=dj_timezone.now() + timedelta(hours=1),
            created_by=user,
        )
        entry.cancel()
        assert entry.status == ScheduleEntry.Status.CANCELLED

    def test_cannot_cancel_triggered_entry(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="x",
            scheduled_for=dj_timezone.now() + timedelta(hours=1),
            created_by=user,
        )
        entry.trigger()
        with pytest.raises(ValidationError, match="pending"):
            entry.cancel()

    def test_trigger_pending_entry(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="instagram",
            scheduled_for=dj_timezone.now() + timedelta(hours=1),
            created_by=user,
        )
        entry.trigger()
        assert entry.status == ScheduleEntry.Status.TRIGGERED


class TestTimezoneHandling:
    def test_schedule_with_utc(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        future = dj_timezone.now() + timedelta(hours=2)
        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="linkedin",
            scheduled_for=future,
            timezone="UTC",
            created_by=user,
        )
        assert entry.timezone == "UTC"

    def test_schedule_with_named_timezone(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        future = dj_timezone.now() + timedelta(hours=2)
        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="linkedin",
            scheduled_for=future,
            timezone="America/New_York",
            created_by=user,
        )
        assert entry.timezone == "America/New_York"
