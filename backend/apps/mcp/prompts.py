"""MCP Prompt templates for Plurist.

Pre-built prompts that agents can use to generate content
with appropriate context and structure.
"""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP


def register_prompts(mcp: FastMCP) -> None:
    """Register all MCP prompt templates."""

    @mcp.prompt()
    def campaign_brief(
        topic: str,
        network: str = "instagram",
        style: str = "modern and clean",
        format: str = "ig_square",
    ) -> str:
        """Generate a creative brief for social media content.

        Creates a structured prompt for generating visual content
        tailored to a specific social network and style.
        """
        return (
            f"Create a visually striking {format} social media post for {network}.\n\n"
            f"Topic: {topic}\n"
            f"Visual style: {style}\n\n"
            f"Requirements:\n"
            f"- Design should be optimized for {network}\n"
            f"- Use bold typography and clear visual hierarchy\n"
            f"- Include a strong call-to-action\n"
            f"- Ensure text is readable on mobile screens\n"
            f"- Follow {network} best practices for engagement"
        )

    @mcp.prompt()
    def social_carousel(
        topic: str,
        slides: int = 5,
        network: str = "instagram",
        style: str = "educational",
    ) -> str:
        """Generate a multi-slide carousel content plan.

        Creates a structured prompt for generating carousel/swipe content
        with a narrative arc across multiple slides.
        """
        return (
            f"Create a {slides}-slide carousel for {network} about: {topic}\n\n"
            f"Style: {style}\n\n"
            f"Structure each slide:\n"
            f"- Slide 1: Hook — grab attention with a bold statement or question\n"
            f"- Slides 2-{slides - 1}: Value — deliver key points with visual hierarchy\n"
            f"- Slide {slides}: CTA — clear call-to-action (save, share, follow)\n\n"
            f"Design guidelines:\n"
            f"- Consistent visual theme across all slides\n"
            f"- Each slide should work standalone but flow as a story\n"
            f"- Use large, readable text (mobile-first)\n"
            f"- Include progress indicators or slide numbers"
        )

    @mcp.prompt()
    def brand_post(
        topic: str,
        project_name: str = "",
        tone: str = "professional",
    ) -> str:
        """Generate on-brand content using the project's design system.

        Creates a prompt that references the project's design bank assets
        for consistent brand expression.
        """
        project_ref = f" for the '{project_name}' project" if project_name else ""
        return (
            f"Create a brand-consistent social media post{project_ref}.\n\n"
            f"Topic: {topic}\n"
            f"Tone: {tone}\n\n"
            f"Instructions:\n"
            f"- Use the project's design system (colors, fonts, logo) from the Design Bank\n"
            f"- Maintain brand consistency with existing content\n"
            f"- Follow the brand's visual language and tone of voice\n"
            f"- Ensure the design feels cohesive with other project content\n\n"
            f"Before generating, check the project's Design Bank for:\n"
            f"- Brand colors and palette\n"
            f"- Typography choices\n"
            f"- Logo and brand marks\n"
            f"- Any design system documentation"
        )
