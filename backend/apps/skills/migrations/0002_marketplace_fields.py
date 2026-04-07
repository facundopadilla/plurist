# Generated migration for marketplace fields
# Adds slug, source, source_url, author, workspace FK, install_count to Skill
# Updates related names on ProjectSkill

import django.db.models.deletion
from django.db import migrations, models
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    """Generate slugs from existing skill names."""
    Skill = apps.get_model("skills", "Skill")
    for skill in Skill.objects.all():
        slug = slugify(skill.name)
        # Ensure uniqueness
        base_slug = slug
        counter = 1
        while Skill.objects.filter(slug=slug).exclude(pk=skill.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        skill.slug = slug
        skill.save(update_fields=["slug"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("skills", "0001_initial"),
    ]

    operations = [
        # 1. Change name from unique=True to unique=False
        migrations.AlterField(
            model_name="skill",
            name="name",
            field=models.CharField(max_length=255),
        ),
        # 2. Add slug as CharField first (no _like index), nullable
        migrations.AddField(
            model_name="skill",
            name="slug",
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        # 3. Add marketplace fields
        migrations.AddField(
            model_name="skill",
            name="source",
            field=models.CharField(
                choices=[
                    ("catalog", "Curated Catalog"),
                    ("github", "Imported from GitHub"),
                    ("custom", "Custom (user-created)"),
                ],
                default="catalog",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="skill",
            name="source_url",
            field=models.URLField(
                blank=True,
                help_text="GitHub URL or skills.sh URL where the skill was imported from.",
            ),
        ),
        migrations.AddField(
            model_name="skill",
            name="author",
            field=models.CharField(
                blank=True,
                help_text="Author or organization (e.g. 'anthropics/skills').",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="skill",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                help_text="Only set for custom skills created by a workspace.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="custom_skills",
                to="accounts.workspace",
            ),
        ),
        migrations.AddField(
            model_name="skill",
            name="install_count",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Number of project installs.",
            ),
        ),
        # 4. Update help texts on existing fields
        migrations.AlterField(
            model_name="skill",
            name="content",
            field=models.TextField(help_text="The markdown content of the skill (SKILL.md body)."),
        ),
        migrations.AlterField(
            model_name="skill",
            name="icon",
            field=models.CharField(blank=True, help_text="Lucide icon name", max_length=50),
        ),
        migrations.AlterField(
            model_name="skill",
            name="is_active",
            field=models.BooleanField(default=True, help_text="Whether this skill is visible in the marketplace."),
        ),
        # 5. Populate slugs from existing names
        migrations.RunPython(populate_slugs, migrations.RunPython.noop),
        # 6. Convert CharField to SlugField with unique=True
        migrations.AlterField(
            model_name="skill",
            name="slug",
            field=models.SlugField(max_length=255, unique=True),
        ),
        # 7. Update ordering
        migrations.AlterModelOptions(
            name="skill",
            options={"ordering": ["-install_count", "name"]},
        ),
        # 8. Update ProjectSkill related names and help text
        migrations.AlterField(
            model_name="projectskill",
            name="project",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="installed_skills",
                to="projects.project",
            ),
        ),
        migrations.AlterField(
            model_name="projectskill",
            name="skill",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="installations",
                to="skills.skill",
            ),
        ),
        migrations.AlterField(
            model_name="projectskill",
            name="is_active",
            field=models.BooleanField(default=True, help_text="Whether this installed skill is currently enabled."),
        ),
    ]
