# pyright: reportAttributeAccessIssue=false

import pytest
from django.core.exceptions import ValidationError

from apps.posts.models import DraftPost
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _create_post(workspace, creator):
    return DraftPost.objects.create(
        workspace=workspace,
        created_by=creator,
        title="Post title",
        body_text="Initial body",
    )


def test_new_post_defaults_to_draft():
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = _create_post(workspace, user)

    assert post.status == DraftPost.Status.DRAFT
    assert post.completed_at is None


def test_draft_to_completed():
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = _create_post(workspace, user)

    post.mark_completed()

    post.refresh_from_db()
    assert post.status == DraftPost.Status.COMPLETED
    assert post.completed_at is not None


def test_completed_to_draft():
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = _create_post(workspace, user)
    post.mark_completed()

    post.revert_to_draft()

    post.refresh_from_db()
    assert post.status == DraftPost.Status.DRAFT
    assert post.completed_at is None


def test_completed_cannot_complete_again():
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = _create_post(workspace, user)
    post.mark_completed()

    with pytest.raises(ValidationError):
        post.mark_completed()


def test_draft_cannot_revert():
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = _create_post(workspace, user)

    with pytest.raises(ValidationError):
        post.revert_to_draft()


def test_empty_content_cannot_complete():
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=user,
        title="Empty post",
        body_text="",
        html_content="",
        render_asset_key="",
    )

    with pytest.raises(ValidationError):
        post.mark_completed()
