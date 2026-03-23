# pyright: reportAttributeAccessIssue=false

import pytest

from apps.approvals.models import ApprovalDecision
from apps.posts.models import DraftPost
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _create_user_with_role(workspace, role: str):
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role=role)
    return user


def _create_post(workspace, creator):
    return DraftPost.objects.create(
        workspace=workspace,
        created_by=creator,
        title="Post title",
        body_text="Initial body",
        target_networks=["linkedin"],
    )


def test_draft_submit_transitions_to_pending():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    post = _create_post(workspace, editor)

    post.submit_for_approval(editor)

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PENDING_APPROVAL


def test_owner_approve_transitions_to_approved():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)

    post.approve(owner, reason="Looks good")

    post.refresh_from_db()
    decision = ApprovalDecision.objects.get(draft_post=post)
    assert post.status == DraftPost.Status.APPROVED
    assert decision.decision == ApprovalDecision.Decision.APPROVED


def test_owner_reject_transitions_to_rejected():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)

    post.reject(owner, reason="Need changes")

    post.refresh_from_db()
    decision = ApprovalDecision.objects.get(draft_post=post)
    assert post.status == DraftPost.Status.REJECTED
    assert decision.decision == ApprovalDecision.Decision.REJECTED


def test_rejected_can_be_reset_to_draft():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)
    post.reject(owner, reason="Need changes")

    post.reset_to_draft(editor)

    post.refresh_from_db()
    assert post.status == DraftPost.Status.DRAFT


def test_material_edit_on_approved_resets_to_draft():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)
    post.approve(owner, reason="ok")

    post.body_text = "Changed body"
    post.save(update_fields=["body_text"])

    post.refresh_from_db()
    decision = ApprovalDecision.objects.filter(draft_post=post).latest("id")
    assert post.status == DraftPost.Status.DRAFT
    assert decision.invalidated is True


def test_material_edit_on_pending_resets_to_draft():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_post(workspace, editor)

    post.submit_for_approval(editor)
    post.reject(owner, reason="needs changes")
    post.reset_to_draft(editor)
    post.submit_for_approval(editor)

    post.body_text = "Changed body while pending"
    post.save(update_fields=["body_text"])

    post.refresh_from_db()
    decision = ApprovalDecision.objects.filter(draft_post=post).latest("id")
    assert post.status == DraftPost.Status.DRAFT
    assert decision.invalidated is True


def test_non_material_edit_does_not_invalidate():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)
    post.approve(owner, reason="ok")

    post.title = "Updated title"
    post.save(update_fields=["title"])

    post.refresh_from_db()
    decision = ApprovalDecision.objects.filter(draft_post=post).latest("id")
    assert post.status == DraftPost.Status.APPROVED
    assert decision.invalidated is False


def test_approved_to_publishing():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    publisher = _create_user_with_role(workspace, "publisher")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)
    post.approve(owner, reason="ok")

    post.start_publishing(publisher)

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PUBLISHING


def test_publishing_to_published():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    publisher = _create_user_with_role(workspace, "publisher")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)
    post.approve(owner, reason="ok")
    post.start_publishing(publisher)

    post.mark_published()

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PUBLISHED
    assert post.published_at is not None


def test_publishing_to_failed():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    publisher = _create_user_with_role(workspace, "publisher")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)
    post.approve(owner, reason="ok")
    post.start_publishing(publisher)

    post.mark_failed("Network timeout")

    post.refresh_from_db()
    assert post.status == DraftPost.Status.FAILED


def test_editor_cannot_approve():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)

    with pytest.raises(PermissionError):
        post.approve(editor, reason="not allowed")


def test_publisher_cannot_approve():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    publisher = _create_user_with_role(workspace, "publisher")
    post = _create_post(workspace, editor)
    post.submit_for_approval(editor)

    with pytest.raises(PermissionError):
        post.approve(publisher, reason="not allowed")
