"""MCP tools for Skills management."""

from __future__ import annotations

from asgiref.sync import sync_to_async
from mcp.server.fastmcp import FastMCP

from apps.skills.models import ProjectSkill, Skill


def register_skills_tools(mcp: FastMCP) -> None:
    """Register all skills-related MCP tools."""

    @mcp.tool()
    async def list_available_skills() -> list[dict]:
        """List all available skills in the marketplace.

        Returns skills that can be installed into projects. Each skill
        is a set of Markdown instructions that modify AI agent behavior.
        """
        skills = await sync_to_async(list)(
            Skill.objects.filter(is_active=True)
            .values("id", "name", "slug", "description", "icon", "source", "author", "install_count")
            .order_by("-install_count", "name")
        )
        return list(skills)

    @mcp.tool()
    async def list_project_skills(project_id: int) -> list[dict]:
        """List skills installed in a specific project.

        Args:
            project_id: The project to list skills for.

        Returns installed skills with their active/inactive status.
        """
        installations = await sync_to_async(list)(
            ProjectSkill.objects.filter(project_id=project_id).select_related("skill").order_by("-created_at")
        )
        return [
            {
                "skill_id": inst.skill_id,
                "skill_name": inst.skill.name,
                "skill_slug": inst.skill.slug,
                "is_active": inst.is_active,
                "installed_at": inst.created_at.isoformat(),
            }
            for inst in installations
        ]

    @mcp.tool()
    async def install_skill(project_id: int, skill_slug: str) -> dict:
        """Install a skill into a project.

        Args:
            project_id: The project to install the skill into.
            skill_slug: The slug of the skill to install.

        The skill will be active by default after installation.
        """
        try:
            skill = await sync_to_async(Skill.objects.get)(slug=skill_slug, is_active=True)
        except Skill.DoesNotExist:
            return {"error": f"Skill '{skill_slug}' not found"}

        def _do_install():
            _, created = ProjectSkill.objects.get_or_create(
                project_id=project_id,
                skill=skill,
                defaults={"is_active": True},
            )
            if not created:
                return {"error": f"Skill '{skill_slug}' already installed in this project"}
            # Increment install count
            Skill.objects.filter(pk=skill.pk).update(install_count=skill.install_count + 1)
            return {
                "ok": True,
                "skill_name": skill.name,
                "project_id": project_id,
            }

        return await sync_to_async(_do_install)()

    @mcp.tool()
    async def toggle_skill(project_id: int, skill_slug: str, active: bool) -> dict:
        """Enable or disable an installed skill in a project.

        Args:
            project_id: The project containing the skill.
            skill_slug: The slug of the skill to toggle.
            active: True to enable, False to disable.
        """
        try:
            skill = await sync_to_async(Skill.objects.get)(slug=skill_slug)
        except Skill.DoesNotExist:
            return {"error": f"Skill '{skill_slug}' not found"}

        def _do_toggle():
            try:
                inst = ProjectSkill.objects.get(project_id=project_id, skill=skill)
            except ProjectSkill.DoesNotExist:
                return {"error": f"Skill '{skill_slug}' is not installed in this project"}
            inst.is_active = active
            inst.save(update_fields=["is_active"])
            return {
                "ok": True,
                "skill_name": skill.name,
                "is_active": active,
            }

        return await sync_to_async(_do_toggle)()
