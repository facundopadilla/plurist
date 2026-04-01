from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.posts.models import DraftPost
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _csrf(client):
    response = client.get("/api/v1/auth/csrf")
    return response.json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


def test_upload_blob_updates_post_render_asset_key(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="editor-upload@example.com")
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=user,
        title="Canvas draft",
        html_content="<div>hello</div>",
    )
    _login(client, user.email)

    with patch("apps.design_bank.storage.upload_file") as mock_upload:
        response = client.post(
            "/api/v1/rendering/upload-blob",
            data={
                "draft_post_id": str(post.pk),
                "file": SimpleUploadedFile(
                    "slide.png",
                    b"png-bytes",
                    content_type="image/png",
                ),
            },
            HTTP_X_CSRF_TOKEN=_csrf(client),
        )

    assert response.status_code == 201
    payload = response.json()
    post.refresh_from_db()
    assert payload["storage_key"].startswith("renders/")
    assert post.render_asset_key == payload["storage_key"]
    mock_upload.assert_called_once()


def test_upload_blob_rejects_non_image_files(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="editor-upload-2@example.com")
    MembershipFactory(user=user, workspace=workspace, role="editor")
    _login(client, user.email)

    response = client.post(
        "/api/v1/rendering/upload-blob",
        data={
            "file": SimpleUploadedFile(
                "notes.txt",
                b"plain text",
                content_type="text/plain",
            ),
        },
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 400
