"""
Tests for render job creation, status transitions, and API endpoints.
"""

from unittest.mock import patch

import pytest

from apps.rendering.models import RenderJob
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory
from tests.rendering.factories import BrandProfileVersionFactory, RenderJobFactory

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _csrf(client):
    r = client.get("/api/v1/auth/csrf")
    return r.json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


# ---------------------------------------------------------------------------
# Template listing
# ---------------------------------------------------------------------------


def test_list_templates_returns_three_mvp_templates(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    _login(client, user.email)

    response = client.get("/api/v1/rendering/templates")

    assert response.status_code == 200
    data = response.json()
    keys = {t["key"] for t in data}
    assert keys == {"social-post-standard", "social-post-minimal", "social-post-bold"}


def test_list_templates_requires_auth(client):
    WorkspaceFactory()
    response = client.get("/api/v1/rendering/templates")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Render job creation
# ---------------------------------------------------------------------------


def test_owner_can_create_render_job(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner2@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    version = BrandProfileVersionFactory(workspace=workspace)
    _login(client, user.email)

    with patch("apps.rendering.tasks.render_template.delay"):
        response = client.post(
            "/api/v1/rendering/render-jobs",
            data={
                "template_key": "social-post-standard",
                "brand_profile_version_id": version.pk,
            },
            content_type="application/json",
        )

    assert response.status_code == 201
    data = response.json()
    assert data["template_key"] == "social-post-standard"
    assert data["brand_profile_version_id"] == version.pk
    assert data["status"] == "pending"
    assert len(data["input_hash"]) == 64


def test_editor_can_create_render_job(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="editor@example.com")
    MembershipFactory(user=user, workspace=workspace, role="editor")
    version = BrandProfileVersionFactory(workspace=workspace)
    _login(client, user.email)

    with patch("apps.rendering.tasks.render_template.delay"):
        response = client.post(
            "/api/v1/rendering/render-jobs",
            data={
                "template_key": "social-post-minimal",
                "brand_profile_version_id": version.pk,
            },
            content_type="application/json",
        )

    assert response.status_code == 201


def test_publisher_cannot_create_render_job(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="publisher@example.com")
    MembershipFactory(user=user, workspace=workspace, role="publisher")
    version = BrandProfileVersionFactory(workspace=workspace)
    _login(client, user.email)

    response = client.post(
        "/api/v1/rendering/render-jobs",
        data={
            "template_key": "social-post-standard",
            "brand_profile_version_id": version.pk,
        },
        content_type="application/json",
    )

    assert response.status_code == 403


def test_create_render_job_unknown_template_returns_400(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner3@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    version = BrandProfileVersionFactory(workspace=workspace)
    _login(client, user.email)

    response = client.post(
        "/api/v1/rendering/render-jobs",
        data={
            "template_key": "not-a-real-template",
            "brand_profile_version_id": version.pk,
        },
        content_type="application/json",
    )

    assert response.status_code == 400


def test_create_render_job_nonexistent_version_returns_404(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner4@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    _login(client, user.email)

    response = client.post(
        "/api/v1/rendering/render-jobs",
        data={
            "template_key": "social-post-standard",
            "brand_profile_version_id": 99999,
        },
        content_type="application/json",
    )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Job status polling
# ---------------------------------------------------------------------------


def test_get_render_job_returns_status(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner5@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    version = BrandProfileVersionFactory(workspace=workspace)
    job = RenderJobFactory(
        workspace=workspace,
        brand_profile_version=version,
        status=RenderJob.Status.RENDERING,
        created_by=user,
    )
    _login(client, user.email)

    response = client.get(f"/api/v1/rendering/render-jobs/{job.pk}")

    assert response.status_code == 200
    assert response.json()["status"] == "rendering"


def test_get_render_job_not_found_returns_404(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner6@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    _login(client, user.email)

    response = client.get("/api/v1/rendering/render-jobs/99999")

    assert response.status_code == 404


def test_get_image_on_pending_job_returns_409(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner7@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    version = BrandProfileVersionFactory(workspace=workspace)
    job = RenderJobFactory(
        workspace=workspace,
        brand_profile_version=version,
        status=RenderJob.Status.PENDING,
        created_by=user,
    )
    _login(client, user.email)

    response = client.get(f"/api/v1/rendering/render-jobs/{job.pk}/image")

    assert response.status_code == 409


def test_get_image_on_completed_job_redirects(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner8@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    version = BrandProfileVersionFactory(workspace=workspace)
    job = RenderJobFactory(
        workspace=workspace,
        brand_profile_version=version,
        status=RenderJob.Status.COMPLETED,
        output_storage_key="renders/abc123.png",
        created_by=user,
    )
    _login(client, user.email)

    with patch(
        "apps.design_bank.storage.generate_presigned_url",
        return_value="https://minio.example.com/presigned",
    ):
        response = client.get(
            f"/api/v1/rendering/render-jobs/{job.pk}/image",
            follow=False,
        )

    assert response.status_code == 302
    assert response["Location"] == "https://minio.example.com/presigned"


# ---------------------------------------------------------------------------
# Status transitions via model direct manipulation
# ---------------------------------------------------------------------------


def test_render_job_status_transition_pending_to_completed():
    workspace = WorkspaceFactory()
    version = BrandProfileVersionFactory(workspace=workspace)
    job = RenderJobFactory(
        workspace=workspace,
        brand_profile_version=version,
        status=RenderJob.Status.PENDING,
    )

    job.status = RenderJob.Status.RENDERING
    job.save(update_fields=["status", "updated_at"])
    job.refresh_from_db()
    assert job.status == RenderJob.Status.RENDERING

    job.status = RenderJob.Status.COMPLETED
    job.output_storage_key = "renders/test.png"
    job.save(update_fields=["status", "output_storage_key", "updated_at"])
    job.refresh_from_db()
    assert job.status == RenderJob.Status.COMPLETED
    assert job.output_storage_key == "renders/test.png"
