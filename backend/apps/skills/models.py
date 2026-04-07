from django.db import models

from apps.projects.models import Project


class Skill(models.Model):
    """
    A skill in the global marketplace catalog.
    Skills are Markdown instruction sets that modify AI agent behavior.
    They can come from the curated catalog, be imported from GitHub, or
    be created as custom skills by users.
    """

    class Source(models.TextChoices):
        CATALOG = "catalog", "Curated Catalog"
        GITHUB = "github", "Imported from GitHub"
        CUSTOM = "custom", "Custom (user-created)"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    content = models.TextField(help_text="The markdown content of the skill (SKILL.md body).")
    icon = models.CharField(max_length=50, blank=True, help_text="Lucide icon name")
    is_active = models.BooleanField(default=True, help_text="Whether this skill is visible in the marketplace.")

    # Marketplace metadata
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.CATALOG,
    )
    source_url = models.URLField(
        blank=True,
        help_text="GitHub URL or skills.sh URL where the skill was imported from.",
    )
    author = models.CharField(
        max_length=255,
        blank=True,
        help_text="Author or organization (e.g. 'anthropics/skills').",
    )
    # For custom skills, track which workspace created it
    workspace = models.ForeignKey(
        "accounts.Workspace",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_skills",
        help_text="Only set for custom skills created by a workspace.",
    )
    install_count = models.PositiveIntegerField(default=0, help_text="Number of project installs.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-install_count", "name"]

    def __str__(self):
        return self.name


class ProjectSkill(models.Model):
    """
    A skill installed in a specific project.
    Installing a skill makes it available; is_active controls whether
    it's currently injected into the AI agent's prompt.
    """

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="installed_skills",
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="installations",
    )
    is_active = models.BooleanField(default=True, help_text="Whether this installed skill is currently enabled.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["project", "skill"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.project.name} ← {self.skill.name}"
