"""
Seed the skills catalog with popular skills from GitHub.
Fetches SKILL.md files from known repositories and creates Skill records.

Usage:
    python manage.py seed_skills
    python manage.py seed_skills --force   # Update existing skills
"""

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.skills.github_fetcher import fetch_skill_from_url
from apps.skills.models import Skill

# Curated list of popular skills from skills.sh
CURATED_SKILLS = [
    {
        "url": "https://skills.sh/anthropics/skills/frontend-design",
        "icon": "Palette",
    },
    {
        "url": "https://skills.sh/anthropics/skills/skill-creator",
        "icon": "Wrench",
    },
    {
        "url": "https://skills.sh/vercel-labs/agent-skills/web-design-guidelines",
        "icon": "Layout",
    },
    {
        "url": "https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices",
        "icon": "Zap",
    },
    {
        "url": "https://skills.sh/pbakaus/impeccable/frontend-design",
        "icon": "Gem",
    },
    {
        "url": "https://skills.sh/pbakaus/impeccable/polish",
        "icon": "Sparkles",
    },
    {
        "url": "https://skills.sh/pbakaus/impeccable/critique",
        "icon": "MessageSquare",
    },
    {
        "url": "https://skills.sh/obra/superpowers/test-driven-development",
        "icon": "TestTube",
    },
    {
        "url": "https://skills.sh/obra/superpowers/systematic-debugging",
        "icon": "Bug",
    },
    {
        "url": "https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices",
        "icon": "Database",
    },
    {
        "url": "https://skills.sh/anthropics/skills/webapp-testing",
        "icon": "FlaskConical",
    },
    {
        "url": "https://skills.sh/shadcn/ui/shadcn",
        "icon": "Component",
    },
]


class Command(BaseCommand):
    help = "Seed the skills marketplace catalog with popular skills from GitHub"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Update existing skills even if they already exist",
        )

    def handle(self, *args, **options):
        force = options["force"]
        created_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0

        for entry in CURATED_SKILLS:
            url = entry["url"]
            icon = entry.get("icon", "Code2")

            self.stdout.write(f"  Fetching: {url} ... ", ending="")

            try:
                parsed = fetch_skill_from_url(url)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"FAILED ({e})"))
                error_count += 1
                continue

            slug = slugify(parsed["name"])
            existing = Skill.objects.filter(slug=slug).first()

            if existing and not force:
                self.stdout.write(self.style.WARNING(f"SKIPPED (already exists: {slug})"))
                skipped_count += 1
                continue

            if existing and force:
                existing.content = parsed["content"]
                existing.description = parsed["description"]
                existing.source_url = parsed["source_url"]
                existing.author = parsed["author"]
                existing.icon = icon
                existing.save()
                self.stdout.write(self.style.SUCCESS(f"UPDATED: {parsed['name']}"))
                updated_count += 1
            else:
                Skill.objects.create(
                    name=parsed["name"],
                    slug=slug,
                    description=parsed["description"],
                    content=parsed["content"],
                    author=parsed["author"],
                    source=Skill.Source.CATALOG,
                    source_url=parsed["source_url"],
                    icon=icon,
                )
                self.stdout.write(self.style.SUCCESS(f"CREATED: {parsed['name']}"))
                created_count += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Created: {created_count}, Updated: {updated_count}, "
                f"Skipped: {skipped_count}, Errors: {error_count}"
            )
        )
