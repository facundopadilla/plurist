from datetime import datetime

from ninja import Schema


class SkillOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    content: str
    icon: str
    source: str
    source_url: str
    author: str
    install_count: int
    created_at: datetime


class SkillBriefOut(Schema):
    """Lightweight version for marketplace listings (without full content)."""

    id: int
    name: str
    slug: str
    description: str
    icon: str
    source: str
    source_url: str
    author: str
    install_count: int


class ProjectSkillOut(Schema):
    id: int
    project_id: int
    skill: SkillOut
    is_active: bool
    created_at: datetime


class ImportSkillIn(Schema):
    url: str  # GitHub URL or skills.sh URL


class CreateSkillIn(Schema):
    name: str
    description: str = ""
    content: str
    icon: str = ""


class ToggleSkillOut(Schema):
    id: int
    is_active: bool
    skill_id: int
    project_id: int
