"""
Build AI prompts that incorporate Design Bank assets for a given project.
"""

from __future__ import annotations


def build_design_prompt(
    campaign_brief: str,
    fmt: str,
    project_id: int | None = None,
    target_network: str = "",
    slide_index: int = 0,
    total_slides: int = 1,
    mode: str = "build",
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
        )

    return _build_html_prompt(
        campaign_brief=campaign_brief,
        fmt=fmt,
        project_id=project_id,
        target_network=target_network,
        slide_index=slide_index,
        total_slides=total_slides,
    )


def _build_html_prompt(
    campaign_brief: str,
    fmt: str,
    project_id: int | None = None,
    target_network: str = "",
    slide_index: int = 0,
    total_slides: int = 1,
) -> str:
    """
    Build a prompt for generating HTML/CSS design based on:
    - Design Bank assets from the given project
    - The campaign brief
    - The desired post format dimensions
    - Carousel slide context (if total_slides > 1)
    """
    from apps.rendering.formats import get_format

    dims = get_format(fmt)
    width = dims["width"]
    height = dims["height"]

    # Gather brand assets from the project's design bank
    brand_context = _gather_brand_assets(project_id)

    network_hint = f" optimized for {target_network}" if target_network else ""

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

    prompt = (
        "You are a professional social media designer. Generate a complete, "
        f"self-contained HTML/CSS post{network_hint}.\n\n"
        "DESIGN REQUIREMENTS:\n"
        f"- Canvas size: exactly {width}px × {height}px\n"
        "- The HTML must be fully self-contained (inline styles only, no external resources)\n"
        "- No JavaScript, no <script> tags, no event handlers\n"
        "- Use only these HTML tags: div, span, p, h1, h2, h3, h4, h5, h6, img, style, "
        "section, svg, figure, figcaption\n"
        f"- The body must have width:{width}px and height:{height}px with overflow:hidden\n\n"
        f"CAMPAIGN BRIEF:\n{campaign_brief}\n"
        f"{brand_context}"
        f"{carousel_context}\n\n"
        "OUTPUT FORMAT:\n"
        "Return ONLY the raw HTML/CSS. No markdown code fences, no explanations.\n"
        "Start directly with <!DOCTYPE html> or <html>."
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
) -> str:
    """
    Build a prompt for Plan mode: ideation, strategy, and copy.
    The AI responds in Markdown only — NO HTML tags or HTML output whatsoever.
    """
    brand_context = _gather_brand_assets(project_id)
    network_hint = f" for {target_network}" if target_network else ""

    brief_section = ""
    if campaign_brief.strip():
        brief_section = f"""
USER REQUEST / BRIEF:
{campaign_brief}
"""

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
{brand_context}

Provide a helpful conversational response, not a template intake form."""

    return prompt


def _gather_brand_assets(project_id: int | None) -> str:
    """
    Query DesignBankSource records for the project and format them as brand context.
    Returns empty string if no project or no assets found.
    """
    if project_id is None:
        return ""

    try:
        from apps.design_bank.models import DesignBankSource

        sources = DesignBankSource.objects.filter(
            project_id=project_id,
            status=DesignBankSource.Status.READY,
        )

        if not sources.exists():
            return ""

        sections: list[str] = ["BRAND ASSETS:"]

        colors = sources.filter(source_type=DesignBankSource.SourceType.COLOR)
        if colors.exists():
            color_list = []
            for c in colors:
                rd = c.resource_data or {}
                name = c.name or rd.get("role", "color")
                hex_val = rd.get("hex", "")
                color_list.append(f"  - {name}: {hex_val}")
            sections.append("Colors:\n" + "\n".join(color_list))

        fonts = sources.filter(source_type=DesignBankSource.SourceType.FONT)
        if fonts.exists():
            font_list = []
            for f in fonts:
                rd = f.resource_data or {}
                family = rd.get("family", f.name or "unknown")
                weights = rd.get("weights", [])
                font_list.append(f"  - {family} (weights: {weights})")
            sections.append("Fonts:\n" + "\n".join(font_list))

        texts = sources.filter(source_type=DesignBankSource.SourceType.TEXT)
        if texts.exists():
            text_list = []
            for t in texts:
                rd = t.resource_data or {}
                kind = rd.get("kind", "text")
                content = rd.get("content", t.name or "")
                text_list.append(f"  - [{kind}] {content}")
            sections.append("Brand Copy:\n" + "\n".join(text_list))

        logos = sources.filter(source_type=DesignBankSource.SourceType.LOGO)
        if logos.exists():
            logo_list = [f"  - {lg.name or lg.original_filename}" for lg in logos]
            sections.append("Logos available:\n" + "\n".join(logo_list))

        return "\n\n".join(sections)

    except Exception:
        return ""
