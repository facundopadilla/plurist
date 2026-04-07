import pytest

from apps.design_bank.models import DesignBankSource
from apps.projects.models import Project
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


def test_design_system_status_reports_missing_artifacts(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    project = Project.objects.create(workspace=workspace, name="Brand", created_by=owner)
    DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.TEXT,
        name="Voice notes",
        resource_data={"content": "Confident, playful, pet-focused.", "kind": "voice"},
        status=DesignBankSource.Status.READY,
        created_by=owner,
    )

    _login(client, owner.email)

    response = client.get(f"/api/v1/design-bank/projects/{project.pk}/design-system/status")

    assert response.status_code == 200
    data = response.json()
    assert data["has_design_system"] is False
    assert data["has_reference_brief"] is False
    assert data["has_relevant_sources"] is True
    assert data["is_outdated"] is True
    assert data["has_manual_edits"] is False


def test_sync_design_system_creates_artifacts(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner2@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    project = Project.objects.create(workspace=workspace, name="Brand", created_by=owner)
    source = DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.TEXT,
        name="Brand voice",
        resource_data={"content": "Minimal, premium, editorial.", "kind": "voice"},
        status=DesignBankSource.Status.READY,
        created_by=owner,
    )

    _login(client, owner.email)
    response = client.post(
        f"/api/v1/design-bank/projects/{project.pk}/design-system/sync",
        data={
            "provider": "openai",
            "guidance": "Focus on premium editorial layouts.",
        },
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["status"]["has_design_system"] is True
    assert payload["status"]["has_reference_brief"] is True
    assert payload["status"]["is_outdated"] is False
    assert payload["status"]["has_manual_edits"] is False

    design_system = DesignBankSource.objects.get(pk=payload["design_system_source_id"])
    reference_brief = DesignBankSource.objects.get(pk=payload["reference_brief_source_id"])

    assert design_system.source_type == DesignBankSource.SourceType.DESIGN_SYSTEM
    assert design_system.resource_data["artifact_kind"] == "design_system"
    assert source.pk in design_system.resource_data["derived_from_source_ids"]
    assert "Project Design System" in design_system.resource_data["content"]
    assert reference_brief.resource_data["artifact_kind"] == "reference_brief"
    assert "Project Reference Brief" in reference_brief.resource_data["content"]


def test_status_becomes_outdated_when_new_relevant_content_arrives(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner3@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    project = Project.objects.create(workspace=workspace, name="Brand", created_by=owner)
    DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.TEXT,
        name="Initial notes",
        resource_data={"content": "Confident tone.", "kind": "voice"},
        status=DesignBankSource.Status.READY,
        created_by=owner,
    )

    _login(client, owner.email)
    client.post(
        f"/api/v1/design-bank/projects/{project.pk}/design-system/sync",
        data={"provider": "openai"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.TEXT,
        name="New launch angle",
        resource_data={"content": "Push premium storytelling and before/after proof.", "kind": "strategy"},
        status=DesignBankSource.Status.READY,
        created_by=owner,
    )

    response = client.get(f"/api/v1/design-bank/projects/{project.pk}/design-system/status")

    assert response.status_code == 200
    assert response.json()["is_outdated"] is True


def test_sync_does_not_overwrite_manual_markdown_with_reserved_name(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner4@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    project = Project.objects.create(workspace=workspace, name="Brand", created_by=owner)
    manual_markdown = DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.MARKDOWN,
        name="Project Reference Brief",
        resource_data={"content": "Manual user note, do not overwrite."},
        status=DesignBankSource.Status.READY,
        created_by=owner,
    )
    DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.TEXT,
        name="Voice",
        resource_data={"content": "Editorial and premium."},
        status=DesignBankSource.Status.READY,
        created_by=owner,
    )

    _login(client, owner.email)
    response = client.post(
        f"/api/v1/design-bank/projects/{project.pk}/design-system/sync",
        data={"provider": "openai"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 200
    manual_markdown.refresh_from_db()
    assert manual_markdown.resource_data["content"] == "Manual user note, do not overwrite."

    generated_reference = DesignBankSource.objects.get(pk=response.json()["reference_brief_source_id"])
    assert generated_reference.pk != manual_markdown.pk
    assert generated_reference.resource_data["artifact_kind"] == "reference_brief"
