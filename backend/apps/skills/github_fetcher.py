"""
Fetch and parse SKILL.md files from GitHub repositories.

Supports:
- GitHub blob URLs: https://github.com/owner/repo/blob/main/skills/name/SKILL.md
- GitHub repo URLs: https://github.com/owner/repo (searches for SKILL.md)
- skills.sh URLs:   https://skills.sh/owner/repo/skill-name (converted to GitHub)
- Shorthand:        owner/repo or owner/repo --skill name
"""

from __future__ import annotations

import re
from typing import TypedDict
from urllib.parse import urlparse

import requests
import yaml


class ParsedSkill(TypedDict):
    name: str
    description: str
    content: str
    author: str
    source_url: str


def _extract_yaml_frontmatter(raw: str) -> tuple[dict, str]:
    """
    Extract YAML frontmatter from a SKILL.md file.
    Returns (metadata_dict, markdown_body).
    """
    if not raw.startswith("---"):
        return {}, raw

    parts = raw.split("---", 2)
    if len(parts) < 3:
        return {}, raw

    try:
        metadata = yaml.safe_load(parts[1]) or {}
    except yaml.YAMLError:
        metadata = {}

    body = parts[2].strip()
    return metadata, body


def _github_raw_url(owner: str, repo: str, branch: str, path: str) -> str:
    return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"


def _try_fetch_raw(url: str) -> str | None:
    """Attempt to fetch a URL, return text or None."""
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.text
    except requests.RequestException:
        pass
    return None


# Common locations where skills live in a repo
_SKILL_SEARCH_PATHS = [
    "skills/{skill}/SKILL.md",
    "SKILL.md",
    ".agents/skills/{skill}/SKILL.md",
    ".claude/skills/{skill}/SKILL.md",
    "plugins/{skill}/skills/{skill}/SKILL.md",
]


def _resolve_skills_sh_url(url: str) -> tuple[str, str, str | None]:
    """
    Parse a skills.sh URL like https://skills.sh/anthropics/skills/frontend-design
    Returns (owner, repo, skill_name_or_None).
    """
    parsed = urlparse(url)
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) >= 3:
        return parts[0], parts[1], parts[2]
    if len(parts) >= 2:
        return parts[0], parts[1], None
    raise ValueError(f"Cannot parse skills.sh URL: {url}")


def _resolve_github_url(url: str) -> tuple[str, str, str | None, str | None]:
    """
    Parse a GitHub URL.
    Returns (owner, repo, branch_or_None, path_or_None).
    """
    parsed = urlparse(url)
    parts = [p for p in parsed.path.strip("/").split("/") if p]

    if len(parts) < 2:
        raise ValueError(f"Cannot parse GitHub URL: {url}")

    owner, repo = parts[0], parts[1]
    # Remove .git suffix
    repo = re.sub(r"\.git$", "", repo)

    if len(parts) >= 4 and parts[2] in ("blob", "tree"):
        branch = parts[3]
        path = "/".join(parts[4:]) if len(parts) > 4 else None
        return owner, repo, branch, path

    return owner, repo, None, None


def fetch_skill_from_url(url: str) -> ParsedSkill:
    """
    Given a URL (GitHub, skills.sh, or shorthand), fetch and parse the SKILL.md.
    Returns a ParsedSkill dict ready to create a Skill model instance.
    """
    original_url = url
    skill_hint: str | None = None

    # Handle skills.sh URLs
    if "skills.sh" in url:
        owner, repo, skill_hint = _resolve_skills_sh_url(url)
        url = f"https://github.com/{owner}/{repo}"

    # Handle GitHub URLs
    if "github.com" in url or "raw.githubusercontent.com" in url:
        owner, repo, branch, path = _resolve_github_url(url)
        branch = branch or "main"

        # If we have a direct path to SKILL.md
        if path and path.endswith("SKILL.md"):
            raw_url = _github_raw_url(owner, repo, branch, path)
            text = _try_fetch_raw(raw_url)
            if text:
                return _parse_skill_text(text, f"{owner}/{repo}", original_url)

        # If we have a path to a skill directory
        if path and not path.endswith("SKILL.md"):
            skill_path = f"{path}/SKILL.md" if not path.endswith("/") else f"{path}SKILL.md"
            raw_url = _github_raw_url(owner, repo, branch, skill_path)
            text = _try_fetch_raw(raw_url)
            if text:
                return _parse_skill_text(text, f"{owner}/{repo}", original_url)

        # Search common locations
        skill_name = skill_hint or repo
        for pattern in _SKILL_SEARCH_PATHS:
            search_path = pattern.format(skill=skill_name)
            raw_url = _github_raw_url(owner, repo, branch, search_path)
            text = _try_fetch_raw(raw_url)
            if text:
                return _parse_skill_text(text, f"{owner}/{repo}", original_url)

        # Try 'main' failed, try 'master'
        if branch == "main":
            for pattern in _SKILL_SEARCH_PATHS:
                search_path = pattern.format(skill=skill_name)
                raw_url = _github_raw_url(owner, repo, "master", search_path)
                text = _try_fetch_raw(raw_url)
                if text:
                    return _parse_skill_text(text, f"{owner}/{repo}", original_url)

        raise ValueError(
            f"Could not find SKILL.md in {owner}/{repo}. Tried skill name '{skill_name}' in common locations."
        )

    raise ValueError(f"Unsupported URL format: {url}. Use a GitHub or skills.sh URL.")


def _parse_skill_text(text: str, author: str, source_url: str) -> ParsedSkill:
    """Parse raw SKILL.md text into a ParsedSkill dict."""
    metadata, body = _extract_yaml_frontmatter(text)

    name = metadata.get("name", "")
    description = metadata.get("description", "")

    # If no name in frontmatter, try to extract from first heading
    if not name:
        for line in body.split("\n"):
            line = line.strip()
            if line.startswith("# "):
                name = line[2:].strip()
                break

    if not name:
        name = "Unnamed Skill"

    return ParsedSkill(
        name=name,
        description=description,
        content=body,
        author=author,
        source_url=source_url,
    )
