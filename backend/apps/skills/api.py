from typing import List

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError

from apps.projects.models import Project
from apps.skills.github_fetcher import fetch_skill_from_url
from apps.skills.models import ProjectSkill, Skill
from apps.skills.schemas import (
    CreateSkillIn,
    ImportSkillIn,
    ProjectSkillOut,
    SkillBriefOut,
    SkillOut,
    ToggleSkillOut,
)

router = Router(tags=["Skills"])


# ── Marketplace catalog ─────────────────────────────────────────────


@router.get("/catalog/", response=List[SkillBriefOut])
def list_catalog(request, search: str = ""):
    """
    Browse the full skill marketplace catalog.
    Optionally filter by search term (matches name, description, author).
    """
    qs = Skill.objects.filter(is_active=True)
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search) | Q(author__icontains=search))
    return qs


@router.get("/catalog/{skill_id}/", response=SkillOut)
def get_skill_detail(request, skill_id: int):
    """Get full detail of a skill (including content) for preview."""
    return get_object_or_404(Skill, id=skill_id, is_active=True)


# ── Project installed skills ────────────────────────────────────────


@router.get("/project/{project_id}/", response=List[ProjectSkillOut])
def list_installed_skills(request, project_id: int):
    """List all skills installed in a project."""
    project = get_object_or_404(Project, id=project_id)
    return ProjectSkill.objects.filter(project=project).select_related("skill")


@router.post("/project/{project_id}/install/{skill_id}/", response=ProjectSkillOut)
def install_skill(request, project_id: int, skill_id: int):
    """Install a skill from the catalog into a project."""
    project = get_object_or_404(Project, id=project_id)
    skill = get_object_or_404(Skill, id=skill_id, is_active=True)

    ps, created = ProjectSkill.objects.get_or_create(
        project=project,
        skill=skill,
        defaults={"is_active": True},
    )
    if not created and not ps.is_active:
        # Re-activate if it was previously deactivated
        ps.is_active = True
        ps.save(update_fields=["is_active"])

    if created:
        Skill.objects.filter(id=skill_id).update(install_count=skill.install_count + 1)

    return ps


@router.post("/project/{project_id}/uninstall/{skill_id}/", response=dict)
def uninstall_skill(request, project_id: int, skill_id: int):
    """Remove a skill from a project entirely."""
    project = get_object_or_404(Project, id=project_id)
    deleted, _ = ProjectSkill.objects.filter(project=project, skill_id=skill_id).delete()
    if deleted:
        Skill.objects.filter(id=skill_id, install_count__gt=0).update(
            install_count=Skill.objects.get(id=skill_id).install_count - 1
        )
    return {"ok": True}


@router.post("/project/{project_id}/toggle/{skill_id}/", response=ToggleSkillOut)
def toggle_skill(request, project_id: int, skill_id: int):
    """Toggle an installed skill on/off (without uninstalling)."""
    project = get_object_or_404(Project, id=project_id)
    ps = get_object_or_404(ProjectSkill, project=project, skill_id=skill_id)
    ps.is_active = not ps.is_active
    ps.save(update_fields=["is_active"])
    return ToggleSkillOut(
        id=ps.id,
        is_active=ps.is_active,
        skill_id=ps.skill_id,
        project_id=ps.project_id,
    )


# ── Import from URL ─────────────────────────────────────────────────


@router.post("/import/", response=SkillOut)
def import_skill(request, payload: ImportSkillIn):
    """
    Import a skill from a GitHub URL or skills.sh URL.
    Fetches the SKILL.md, parses it, and adds it to the catalog.
    """
    try:
        parsed = fetch_skill_from_url(payload.url)
    except ValueError as e:
        raise HttpError(400, str(e))

    slug = slugify(parsed["name"])

    # Check if already exists by source_url or slug
    existing = Skill.objects.filter(Q(source_url=parsed["source_url"]) | Q(slug=slug)).first()
    if existing:
        # Update content if re-importing
        existing.content = parsed["content"]
        existing.description = parsed["description"]
        existing.source_url = parsed["source_url"]
        existing.save(update_fields=["content", "description", "source_url", "updated_at"])
        return existing

    skill = Skill.objects.create(
        name=parsed["name"],
        slug=slug,
        description=parsed["description"],
        content=parsed["content"],
        author=parsed["author"],
        source=Skill.Source.GITHUB,
        source_url=parsed["source_url"],
        icon="Download",
    )
    return skill


# ── Create custom skill ─────────────────────────────────────────────


@router.post("/custom/", response=SkillOut)
def create_custom_skill(request, payload: CreateSkillIn):
    """Create a custom skill authored by the current workspace."""
    slug = slugify(payload.name)

    if Skill.objects.filter(slug=slug).exists():
        raise HttpError(409, f"A skill with slug '{slug}' already exists.")

    skill = Skill.objects.create(
        name=payload.name,
        slug=slug,
        description=payload.description,
        content=payload.content,
        icon=payload.icon or "Sparkles",
        source=Skill.Source.CUSTOM,
    )
    return skill
