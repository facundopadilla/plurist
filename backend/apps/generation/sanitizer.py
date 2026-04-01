"""
HTML sanitizer for AI-generated design content.

Uses nh3 (Rust-based) for robust sanitization with an explicit allowlist of
tags and attributes. Replaces the previous regex-based approach which was
bypassable via nested tags and attribute obfuscation.
"""

import nh3

ALLOWED_TAGS = {
    "html",
    "head",
    "body",
    "meta",
    "div",
    "span",
    "p",
    "section",
    "article",
    "figure",
    "figcaption",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "img",
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "defs",
    "use",
    "symbol",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "b",
    "i",
    "small",
    "br",
    "hr",
}

# style tag is handled separately via clean_content_tags=set() override
# to avoid the nh3 conflict between allowed tags and clean_content_tags defaults.
STYLE_TAG = {"style"}

# Attributes allowed per tag. "*" key applies to all tags.
ALLOWED_ATTRIBUTES: dict[str, set[str]] = {
    "*": {"class", "id", "style"},
    "img": {"src", "alt", "width", "height", "loading"},
    "svg": {"xmlns", "viewBox", "width", "height", "fill", "stroke", "stroke-width"},
    "g": {"transform", "fill", "stroke", "stroke-width", "opacity"},
    "path": {"d", "fill", "stroke", "stroke-width", "fill-rule", "clip-rule", "opacity"},
    "rect": {"x", "y", "width", "height", "rx", "ry", "fill", "stroke", "stroke-width", "opacity"},
    "circle": {"cx", "cy", "r", "fill", "stroke", "stroke-width", "opacity"},
    "ellipse": {"cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width", "opacity"},
    "line": {"x1", "y1", "x2", "y2", "stroke", "stroke-width", "opacity"},
    "polyline": {"points", "fill", "stroke", "stroke-width", "opacity"},
    "polygon": {"points", "fill", "stroke", "stroke-width", "opacity"},
    "text": {"x", "y", "dx", "dy", "font-size", "font-family", "fill", "text-anchor", "opacity"},
    "tspan": {"x", "y", "dx", "dy", "font-size", "fill"},
    "use": {"href", "x", "y", "width", "height"},
    "symbol": {"id", "viewBox", "width", "height"},
    "defs": set(),
    "meta": {"charset", "name", "content"},
    "p": {"align"},
    "div": {"align"},
}


def sanitize_html(html: str) -> str:
    """
    Remove dangerous constructs from AI-generated HTML.
    Returns sanitized HTML string.
    """
    if not html or not html.strip():
        return ""

    return nh3.clean(
        html,
        tags=ALLOWED_TAGS | STYLE_TAG,
        clean_content_tags=set(),
        attributes=ALLOWED_ATTRIBUTES,
        link_rel=None,
        strip_comments=True,
    )
