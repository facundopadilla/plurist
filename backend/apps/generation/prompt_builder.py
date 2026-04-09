"""
Build AI prompts that incorporate Design Bank assets for a given project.
"""

from __future__ import annotations

import logging
import re

from apps.design_bank.design_system_service import build_compacted_project_context
from apps.design_bank.models import DesignBankSource
from apps.rendering.formats import get_format
from apps.skills.models import ProjectSkill

logger = logging.getLogger(__name__)


def build_design_prompt(
    campaign_brief: str,
    fmt: str,
    project_id: int | None = None,
    target_network: str = "",
    slide_index: int = 0,
    total_slides: int = 1,
    mode: str = "build",
    current_html: str = "",
) -> str:
    """
    Build a prompt for the AI based on the requested mode:
    - mode="build": HTML/CSS design generation (default behaviour).
    - mode="plan": Markdown-based ideation, strategy, and copy. No HTML output.
    """
    if mode == "plan":
        return _build_plan_prompt(
            campaign_brief=campaign_brief,
            project_id=project_id,
            target_network=target_network,
            current_html=current_html,
        )

    if mode == "element-edit":
        return _build_element_edit_prompt(
            project_id=project_id,
            target_network=target_network,
            current_html=current_html,
        )

    return _build_html_prompt(
        campaign_brief=campaign_brief,
        fmt=fmt,
        project_id=project_id,
        target_network=target_network,
        slide_index=slide_index,
        total_slides=total_slides,
        current_html=current_html,
    )


def _build_html_prompt(
    campaign_brief: str,
    fmt: str,
    project_id: int | None = None,
    target_network: str = "",
    slide_index: int = 0,
    total_slides: int = 1,
    current_html: str = "",
) -> str:
    """
    Build a prompt for generating HTML/CSS design based on:
    - Design Bank assets from the given project
    - The campaign brief
    - The desired post format dimensions
    - Carousel slide context (if total_slides > 1)
    - The current HTML code on the canvas (if any)
    """
    dims = get_format(fmt)
    width = dims["width"]
    height = dims["height"]
    format_hint = dims.get("hint", "")

    # Gather brand assets from the project's design bank
    brand_context = _gather_brand_assets(project_id)

    network_hint = f" optimized for {target_network}" if target_network else ""
    if format_hint:
        format_hint = f"\n- Layout rules for this format: {format_hint}"

    # Carousel context instruction
    if total_slides > 1:
        carousel_context = (
            f"\n\nCARROUSEL CONTEXT:\n"
            f"This is slide {slide_index + 1} of {total_slides} in a carousel post. "
            f"The content should be progressive and complementary to the other slides. "
            f"Each slide should have a clear visual focus and continue the story/message."
        )
    else:
        carousel_context = ""

    current_code_context = ""
    if current_html.strip():
        # Count existing slides in context
        existing_indices = re.findall(r"<!--\s*SLIDE\s+(\d+)\s*-->", current_html)
        next_index = max((int(i) for i in existing_indices), default=-1) + 1

        slide_instructions = ""
        if next_index > 0:
            slide_instructions = (
                f"\n\nSLIDE MANAGEMENT:"
                f"\nThere are currently {next_index} slide(s) on the canvas (indices 0 to {next_index - 1})."
                "\n- To MODIFY an existing slide, wrap your HTML in "
                "<!-- SLIDE_START N --> ... <!-- SLIDE_END --> using the same index N."
                f"\n- To CREATE a NEW slide, use <!-- SLIDE_START {next_index} --> ... <!-- SLIDE_END -->."
                f"\n- If the user asks to 'create', 'add', or 'make a new' slide, ALWAYS use a new index."
            )

        current_code_context = (
            f"\n\nCURRENT DESIGN ON CANVAS:\n```html\n{current_html}\n```\n"
            f"Modify or improve the current design based on the user's request. "
            f"Keep what works and change only what is necessary unless asked for a total redesign."
            f"{slide_instructions}"
        )

    # Gather active skills for the project
    skills_context = _gather_active_skills(project_id)

    prompt = (
        "You are a professional social media designer. Generate a complete, "
        f"self-contained HTML/CSS post{network_hint}.\n\n"
        "DESIGN REQUIREMENTS:\n"
        f"- Canvas size: exactly {width}px × {height}px\n"
        f"- The HTML must be fully self-contained (inline styles only, no external resources)\n"
        f"- No JavaScript, no <script> tags, no event handlers\n"
        f"- Use only these HTML tags: div, span, p, h1, h2, h3, h4, h5, h6, img, style, "
        "section, svg, figure, figcaption\n"
        f"- The body must have width:{width}px and height:{height}px with overflow:hidden{format_hint}\n\n"
        f"{skills_context}"
        f"CAMPAIGN BRIEF:\n{campaign_brief}\n"
        f"{brand_context}"
        f"{carousel_context}"
        f"{current_code_context}\n\n"
        "OUTPUT FORMAT:\n"
        "Your response has TWO parts:\n"
        "1. A short conversational message (1-2 sentences) explaining what you designed and why.\n"
        "2. The raw HTML/CSS wrapped in a markdown code block (```html ... ```).\n\n"
        "CRITICAL RULES FOR THE CONVERSATIONAL MESSAGE:\n"
        "- The user will NEVER see your code. The design renders automatically on a visual canvas beside the chat.\n"
        "- Therefore, NEVER say 'here is', 'here you go', 'below is',\n"
        "  or similar presentation phrases.\n"
        "- NEVER end your message with a colon (:). This is strictly forbidden.\n"
        "- Write as if you just finished painting something and you're telling the user about it.\n"
        "- Good examples: 'I went with warm tones and a playful layout to match the puppy theme.', "
        "'Used a bold gradient background with centered typography for maximum impact.', "
        "'Designed a clean grid with rounded cards highlighting each puppy breed.'\n"
        "- Bad examples: 'Here is your design:', 'Here is what I created:'\n\n"
        "Inside the code block, start directly with <!DOCTYPE html> or <html>."
    )

    return prompt


def build_text_prompt(
    campaign_brief: str,
    target_network: str = "",
    project_id: int | None = None,
) -> str:
    """
    Build a prompt for generating post text copy.
    """
    brand_context = _gather_brand_assets(project_id)
    network_hint = f" for {target_network}" if target_network else ""

    prompt = f"""You are a professional social media copywriter. Write engaging post copy{network_hint}.

CAMPAIGN BRIEF:
{campaign_brief}

{brand_context}

Write only the post copy. No explanations."""

    return prompt


def _build_plan_prompt(
    campaign_brief: str,
    project_id: int | None = None,
    target_network: str = "",
    current_html: str = "",
) -> str:
    """
    Build a prompt for Plan mode: ideation, strategy, and copy.
    The AI responds in Markdown only — NO HTML tags or HTML output whatsoever.
    """
    brand_context = _gather_brand_assets(project_id)
    network_hint = f" for {target_network}" if target_network else ""

    # Gather active skills for the project
    skills_context = _gather_active_skills(project_id)

    brief_section = ""
    if campaign_brief.strip():
        brief_section = f"""
USER REQUEST / BRIEF:
{campaign_brief}
"""

    current_code_context = ""
    if current_html.strip():
        current_code_context = (
            f"\n\nCURRENT DESIGN ON CANVAS:\n```html\n{current_html}\n```\n"
            "You can reference this code to answer user questions about the current design state."
        )

    prompt = f"""You are a Social Media Art Director and Copywriter{network_hint}.
Your role is to help with strategy, ideation, creative direction, and copy as a CONVERSATIONAL collaborator.

IMPORTANT RULES:
- Respond naturally and directly to the user's latest message and the conversation history.
- Do NOT force a formal discovery questionnaire.
- Only ask a clarifying question if the request is genuinely too ambiguous to answer usefully.
- If the user says something simple like "hola", greet them naturally and ask what they want to plan.
- Respond exclusively in Markdown-friendly plain text.
- NEVER output HTML, HTML tags, or any markup resembling HTML.
- Do NOT produce code blocks containing HTML.
- Focus on concepts, messaging strategy, copy angles, hashtags, structure, and creative direction.

{brief_section}
{skills_context}
{brand_context}
{current_code_context}

Provide a helpful conversational response, not a template intake form."""

    return prompt


def _build_element_edit_prompt(
    project_id: int | None = None,
    target_network: str = "",
    current_html: str = "",
) -> str:
    """Build a prompt for targeted element edits that must return JSON only."""
    brand_context = _gather_brand_assets(project_id)
    skills_context = _gather_active_skills(project_id)
    network_hint = f" for {target_network}" if target_network else ""

    current_code_context = ""
    if current_html.strip():
        current_code_context = (
            f"\n\nCURRENT SLIDE HTML:\n```html\n{current_html}\n```\n"
            "Use this only as reference for the surrounding structure. Modify only the requested target element."
        )

    return f"""You are a precise HTML editing assistant{network_hint}.
Your task is to modify exactly one already-identified element inside an existing slide.

IMPORTANT RULES:
- You will receive the user request plus a technical element reference.
- Apply the change ONLY to that referenced element.
- Preserve every other element exactly as-is.
- Return ONLY a raw JSON object.
- Do NOT return markdown.
- Do NOT return explanations.
- Do NOT return the full slide HTML.
- The JSON must match this shape exactly:
  {{"type":"element_patch","slideIndex":0,"cssPath":"...","updatedOuterHtml":"<...>"}}

{skills_context}
{brand_context}
{current_code_context}
"""


def _gather_active_skills(project_id: int | None) -> str:
    """
    Query active ProjectSkill records for the project and format their markdown content.
    Returns empty string if no project or no active skills found.
    """
    if project_id is None:
        return ""

    # Active skills assigned to the project where the global skill is also active
    skills = (
        ProjectSkill.objects.filter(project_id=project_id, is_active=True, skill__is_active=True)
        .select_related("skill")
        .order_by("skill__name")
    )

    if not skills.exists():
        return ""

    context = "AGENT SKILLS AND INSTRUCTIONS (MANDATORY):\n"
    context += (
        "The following skills are enabled for this project. "
        "You must strictly follow these instructions when designing or planning.\n\n"
    )

    for ps in skills:
        context += f"--- START SKILL: {ps.skill.name.upper()} ---\n"
        context += f"{ps.skill.content}\n"
        context += f"--- END SKILL: {ps.skill.name.upper()} ---\n\n"

    return context


def _append_brand_section(
    sections: list[str],
    title: str,
    lines: list[str],
) -> None:
    if lines:
        body = "\n".join(lines)
        sections.append(f"{title}:\n{body}")


def _build_color_section(sources) -> list[str]:
    color_list = []
    for source in sources:
        resource_data = source.resource_data or {}
        name = source.name or resource_data.get("role", "color")
        hex_value = resource_data.get("hex", "")
        color_list.append(f"  - {name}: {hex_value}")
    return color_list


def _build_font_section(sources) -> list[str]:
    font_list = []
    for source in sources:
        resource_data = source.resource_data or {}
        family = resource_data.get("family", source.name or "unknown")
        weights = resource_data.get("weights", [])
        font_list.append(f"  - {family} (weights: {weights})")
    return font_list


def _build_text_section(sources) -> list[str]:
    text_list = []
    for source in sources:
        resource_data = source.resource_data or {}
        kind = resource_data.get("kind", "text")
        content = resource_data.get("content", source.name or "")
        text_list.append(f"  - [{kind}] {content}")
    return text_list


def _build_logo_section(sources) -> list[str]:
    return [f"  - {source.name or source.original_filename}" for source in sources]


def _gather_brand_assets(project_id: int | None) -> str:
    """
    Query DesignBankSource records for the project and format them as brand context.
    Returns empty string if no project or no assets found.
    """
    if project_id is None:
        return ""

    try:
        compacted_context = build_compacted_project_context(project_id)
        if compacted_context.strip():
            return compacted_context

        sources = DesignBankSource.objects.filter(
            project_id=project_id,
            status=DesignBankSource.Status.READY,
        )

        if not sources.exists():
            return ""

        sections: list[str] = ["BRAND ASSETS:"]

        colors = sources.filter(source_type=DesignBankSource.SourceType.COLOR)
        _append_brand_section(sections, "Colors", _build_color_section(colors))

        fonts = sources.filter(source_type=DesignBankSource.SourceType.FONT)
        _append_brand_section(sections, "Fonts", _build_font_section(fonts))

        texts = sources.filter(source_type=DesignBankSource.SourceType.TEXT)
        _append_brand_section(sections, "Brand Copy", _build_text_section(texts))

        logos = sources.filter(source_type=DesignBankSource.SourceType.LOGO)
        _append_brand_section(
            sections,
            "Logos available",
            _build_logo_section(logos),
        )

        return "\n\n".join(sections)

    except Exception:
        logger.exception("Failed to gather brand assets for project %s", project_id)
        return ""
