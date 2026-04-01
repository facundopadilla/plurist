"""Test that stale approvals invalidate schedules."""

from datetime import timedelta

import pytest
from django.utils import timezone as dj_timezone

from apps.posts.models import DraftPost
from apps.scheduler.models import ScheduleEntry
from apps.scheduler.tasks import check_pending_schedules
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _make_approved_post(workspace, user):
    MembershipFactory(user=user, workspace=workspace, role="owner")
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=user,
        title="Test Post",
        body_text="Approved content",
    )
    post.submit_for_approval(user)
    post.approve(user, reason="Good")
    return post


class TestStaleApprovalInvalidation:
    def test_material_edit_resets_to_draft_and_schedule_becomes_stale(self):
        """When a material edit resets approval, scheduled entries should be
        detected as stale by the scheduler task."""
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        # Schedule the approved post
        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="linkedin",
            scheduled_for=dj_timezone.now() + timedelta(hours=1),
            created_by=user,
        )
        assert entry.status == ScheduleEntry.Status.PENDING

        # Material edit resets the post to draft (invalidates approval)
        post.body_text = "Completely changed content"
        post.save(update_fields=["body_text"])

        post.refresh_from_db()
        assert post.status == DraftPost.Status.DRAFT

        # Simulate the scheduler check — it should cancel stale entries
        # because the post is no longer approved
        # Set scheduled_for to the past so the check picks it up
        entry.scheduled_for = dj_timezone.now() - timedelta(minutes=1)
        entry.save(update_fields=["scheduled_for"])

        triggered = check_pending_schedules()

        entry.refresh_from_db()
        assert entry.status == ScheduleEntry.Status.CANCELLED
        assert triggered == 0

    def test_scheduler_task_does_not_trigger_unapproved_posts(self):
        """A post that was approved then edited back to draft should not trigger."""
        workspace = WorkspaceFactory()
        user = UserFactory()
        post = _make_approved_post(workspace, user)

        entry = ScheduleEntry.objects.create(
            workspace=workspace,
            draft_post=post,
            network="x",
            scheduled_for=dj_timezone.now() - timedelta(minutes=5),  # past due
            created_by=user,
        )

        # Edit the post so approval gets invalidated
        post.body_text = "New text that invalidates approval"
        post.save(update_fields=["body_text"])
        post.refresh_from_db()
        assert post.status == DraftPost.Status.DRAFT

        triggered = check_pending_schedules()
        assert triggered == 0

        entry.refresh_from_db()
        assert entry.status == ScheduleEntry.Status.CANCELLED


class TestSchedulerAPIPermissions:
    def _csrf(self, client):
        r = client.get("/api/v1/auth/csrf")
        return r.json().get("csrf_token", "")

    def _login(self, client, email, password="testpassword123"):
        client.post(
            "/api/v1/auth/login",
            data={"email": email, "password": password},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=self._csrf(client),
        )

    def test_editor_cannot_schedule(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="owner@example.com", password="testpassword123")
        editor = UserFactory(email="editor@example.com", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        MembershipFactory(user=editor, workspace=workspace, role="editor")

        post = DraftPost.objects.create(
            workspace=workspace,
            created_by=owner,
            title="Test",
            body_text="Hello",
        )
        post.submit_for_approval(owner)
        post.approve(owner)

        self._login(client, editor.email)
        response = client.post(
            "/api/v1/scheduler/entries",
            data={
                "draft_post_id": post.pk,
                "network": "linkedin",
                "scheduled_for": (dj_timezone.now() + timedelta(hours=1)).isoformat(),
            },
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=self._csrf(client),
        )
        assert response.status_code == 403

    def test_publisher_can_schedule(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="owner@example.com", password="testpassword123")
        publisher = UserFactory(email="pub@example.com", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        MembershipFactory(user=publisher, workspace=workspace, role="publisher")

        post = DraftPost.objects.create(
            workspace=workspace,
            created_by=owner,
            title="Test",
            body_text="Hello",
        )
        post.submit_for_approval(owner)
        post.approve(owner)

        self._login(client, publisher.email)
        response = client.post(
            "/api/v1/scheduler/entries",
            data={
                "draft_post_id": post.pk,
                "network": "linkedin",
                "scheduled_for": (dj_timezone.now() + timedelta(hours=1)).isoformat(),
            },
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=self._csrf(client),
        )
        assert response.status_code == 201
