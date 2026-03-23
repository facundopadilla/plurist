"""
Trusted template registry for the render pipeline.

Only templates explicitly listed here can be rendered.
Templates are identified by a stable string key.
"""

from typing import TypedDict


class TemplateConfig(TypedDict):
    name: str
    description: str
    viewport_width: int
    viewport_height: int


_REGISTRY: dict[str, TemplateConfig] = {
    "social-post-standard": {
        "name": "Social Post — Standard",
        "description": "Standard 1:1 social post with brand colors and logo.",
        "viewport_width": 1080,
        "viewport_height": 1080,
    },
    "social-post-minimal": {
        "name": "Social Post — Minimal",
        "description": "Clean minimal layout: brand name and slogan on white.",
        "viewport_width": 1080,
        "viewport_height": 1080,
    },
    "social-post-bold": {
        "name": "Social Post — Bold",
        "description": "High-contrast bold layout with large typography.",
        "viewport_width": 1080,
        "viewport_height": 1080,
    },
}


def get_template(key: str) -> TemplateConfig:
    """Return template config for key. Raises KeyError if not found."""
    if key not in _REGISTRY:
        raise KeyError(f"Unknown template key: {key!r}")
    return _REGISTRY[key]


def list_templates() -> list[dict]:
    """Return all registered templates as a list with their key included."""
    return [{"key": key, **config} for key, config in _REGISTRY.items()]
