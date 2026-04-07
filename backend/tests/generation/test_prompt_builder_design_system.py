import pytest

from apps.design_bank.models import DesignBankSource
from apps.generation.prompt_builder import build_design_prompt
from apps.projects.models import Project
from tests.accounts.factories import UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def test_design_prompt_prefers_compacted_project_context_over_raw_assets():
    workspace = WorkspaceFactory()
    user = UserFactory()
    project = Project.objects.create(workspace=workspace, name="Brand", created_by=user)
    DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.TEXT,
        name="Raw copy",
        resource_data={"content": "Raw design bank copy should not be injected once a compact design system exists."},
        status=DesignBankSource.Status.READY,
        created_by=user,
    )
    DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.DESIGN_SYSTEM,
        name="Project Design System",
        resource_data={
            "artifact_kind": "design_system",
            "content": "# Project Design System\n\nUse premium editorial hierarchy.",
        },
        status=DesignBankSource.Status.READY,
        created_by=user,
    )
    DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.MARKDOWN,
        name="Project Reference Brief",
        resource_data={
            "artifact_kind": "reference_brief",
            "content": "# Project Reference Brief\n\nAudience: premium pet brands.",
        },
        status=DesignBankSource.Status.READY,
        created_by=user,
    )

    prompt = build_design_prompt(
        campaign_brief="Make a launch slide",
        fmt="ig_square",
        project_id=project.pk,
    )

    assert "PROJECT DESIGN SYSTEM:" in prompt
    assert "PROJECT REFERENCE BRIEF:" in prompt
    assert "Use premium editorial hierarchy." in prompt
    assert "BRAND ASSETS:" not in prompt
    assert "Raw design bank copy should not be injected" not in prompt
