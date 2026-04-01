from unittest.mock import patch

import pytest

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


def test_list_templates_returns_three_mvp_templates(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner-rendering@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    _login(client, user.email)

    response = client.get("/api/v1/rendering/templates")

    assert response.status_code == 200
    keys = {item["key"] for item in response.json()}
    assert keys == {"social-post-standard", "social-post-minimal", "social-post-bold"}


def test_legacy_render_job_endpoint_returns_gone(client):
    workspace = WorkspaceFactory()
    user = UserFactory(email="owner-rendering-2@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    _login(client, user.email)

    response = client.post(
        "/api/v1/rendering/render-jobs",
        data={"template_key": "social-post-standard", "brand_profile_version_id": 1},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 410


def test_legacy_render_task_marks_job_failed():
    from apps.rendering.models import RenderJob
    from apps.rendering.tasks import render_template
    from tests.rendering.factories import BrandProfileVersionFactory, RenderJobFactory

    workspace = WorkspaceFactory()
    version = BrandProfileVersionFactory(workspace=workspace)
    job = RenderJobFactory(
        workspace=workspace,
        brand_profile_version=version,
        status=RenderJob.Status.PENDING,
    )

    render_template(job.pk)

    job.refresh_from_db()
    assert job.status == RenderJob.Status.FAILED
    assert "client-side canvas export" in job.error_message


def test_get_completed_render_image_redirects(client):
    from apps.rendering.models import RenderJob
    from tests.rendering.factories import BrandProfileVersionFactory, RenderJobFactory

    workspace = WorkspaceFactory()
    user = UserFactory(email="owner-rendering-3@example.com")
    MembershipFactory(user=user, workspace=workspace, role="owner")
    version = BrandProfileVersionFactory(workspace=workspace)
    job = RenderJobFactory(
        workspace=workspace,
        brand_profile_version=version,
        status=RenderJob.Status.COMPLETED,
        output_storage_key="renders/example.png",
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
