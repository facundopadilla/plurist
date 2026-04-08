"""
Fetch and parse skill markdown files from GitHub repositories.

Supports:
- GitHub blob URLs: https://github.com/owner/repo/blob/main/skills/name/skill-file
- GitHub repo URLs: https://github.com/owner/repo (searches for the skill file)
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
    Extract YAML frontmatter from a skill markdown file.
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
_SKILL_MD_FILENAME = "SKILL.md"
_SKILL_SEARCH_PATHS = [
    f"skills/{{skill}}/{_SKILL_MD_FILENAME}",
    _SKILL_MD_FILENAME,
    f".agents/skills/{{skill}}/{_SKILL_MD_FILENAME}",
    f".claude/skills/{{skill}}/{_SKILL_MD_FILENAME}",
    f"plugins/{{skill}}/skills/{{skill}}/{_SKILL_MD_FILENAME}",
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


def _search_skill_in_repo(owner: str, repo: str, branch: str, skill_name: str) -> str | None:
    """Try common skill-file locations in a repo. Returns raw text or None."""
    for pattern in _SKILL_SEARCH_PATHS:
        search_path = pattern.format(skill=skill_name)
        raw_url = _github_raw_url(owner, repo, branch, search_path)
        text = _try_fetch_raw(raw_url)
        if text:
            return text
    return None


def _github_skill_candidates(path: str | None) -> list[str]:
    if not path:
        return []
    if path.endswith(_SKILL_MD_FILENAME):
        return [path]
    suffix = _SKILL_MD_FILENAME if path.endswith("/") else f"/{_SKILL_MD_FILENAME}"
    return [path + suffix]


def _parse_skill_if_found(
    owner: str, repo: str, branch: str, path: str, author: str, source_url: str
) -> ParsedSkill | None:
    text = _try_fetch_raw(_github_raw_url(owner, repo, branch, path))
    if not text:
        return None
    return _parse_skill_text(text, author, source_url)


def _fetch_from_github(url: str, original_url: str, skill_hint: str | None) -> ParsedSkill:
    owner, repo, branch, path = _resolve_github_url(url)
    branch = branch or "main"
    author = f"{owner}/{repo}"

    for candidate in _github_skill_candidates(path):
        parsed = _parse_skill_if_found(owner, repo, branch, candidate, author, original_url)
        if parsed:
            return parsed

    skill_name = skill_hint or repo
    text = _search_skill_in_repo(owner, repo, branch, skill_name)
    if text:
        return _parse_skill_text(text, author, original_url)

    if branch == "main":
        text = _search_skill_in_repo(owner, repo, "master", skill_name)
        if text:
            return _parse_skill_text(text, author, original_url)

    raise ValueError(
        f"Could not find {_SKILL_MD_FILENAME} in {owner}/{repo}. Tried skill name '{skill_name}' in common locations."
    )


def fetch_skill_from_url(url: str) -> ParsedSkill:
    """
    Given a URL (GitHub, skills.sh, or shorthand), fetch and parse the skill file.
    Returns a ParsedSkill dict ready to create a Skill model instance.
    """
    original_url = url
    skill_hint: str | None = None

    if "skills.sh" in url:
        owner, repo, skill_hint = _resolve_skills_sh_url(url)
        url = f"https://github.com/{owner}/{repo}"

    if "github.com" in url or "raw.githubusercontent.com" in url:
        return _fetch_from_github(url, original_url, skill_hint)

    raise ValueError(f"Unsupported URL format: {url}. Use a GitHub or skills.sh URL.")


def _parse_skill_text(text: str, author: str, source_url: str) -> ParsedSkill:
    """Parse raw skill-file text into a ParsedSkill dict."""
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
