"""
Format registry for post/render dimensions.
"""

FORMAT_REGISTRY: dict[str, dict] = {
    # Instagram (10)
    "ig_profile": {
        "label": "Profile photo",
        "width": 320,
        "height": 320,
        "network": "instagram",
        "hint": "A circular profile picture. Important elements must be exactly in the center. Avoid putting text on the edges.",
    },
    "ig_square": {
        "label": "Square post",
        "width": 1080,
        "height": 1080,
        "network": "instagram",
        "hint": "A standard 1:1 square post. Highly versatile. Content should have good breathing room (padding).",
    },
    "ig_landscape": {
        "label": "Landscape post",
        "width": 1080,
        "height": 608,
        "network": "instagram",
        "hint": "A wide landscape post. Emphasize horizontal layout. Keep text readable but don't crowd the top/bottom.",
    },
    "ig_portrait_c": {
        "label": "Portrait post (classic)",
        "width": 1080,
        "height": 1350,
        "network": "instagram",
        "hint": "A 4:5 vertical post. Great for reading. Make sure the content has strong vertical hierarchy. The center 1080x1080 area is what shows on the profile grid, so keep critical text there.",
    },
    "ig_portrait_n": {
        "label": "Portrait post (new)",
        "width": 1080,
        "height": 1440,
        "network": "instagram",
        "hint": "A taller portrait post. Emphasize vertical layout.",
    },
    "ig_story": {
        "label": "Stories",
        "width": 1080,
        "height": 1920,
        "network": "instagram",
        "hint": "A 9:16 story. VERY IMPORTANT: Leave the top 250px and bottom 250px completely empty of text or logos (safe zones for Instagram UI like profile name and reply box). Content must be vertically centered.",
    },
    "ig_highlight": {
        "label": "Story highlight cover",
        "width": 640,
        "height": 640,
        "network": "instagram",
        "hint": "A highlight cover. Simple icon or text strictly in the very center.",
    },
    "ig_reel": {
        "label": "Reels",
        "width": 1080,
        "height": 1920,
        "network": "instagram",
        "hint": "A 9:16 reel. VERY IMPORTANT: Keep text inside the center safe area. Avoid top 200px, bottom 400px (captions/actions), and right 150px (action buttons).",
    },
    "ig_reel_cover": {
        "label": "Reel cover",
        "width": 420,
        "height": 654,
        "network": "instagram",
        "hint": "A cover for a reel. Vertical layout.",
    },
    "ig_reel_wide": {
        "label": "Ultra-wide reels",
        "width": 5120,
        "height": 1080,
        "network": "instagram",
        "hint": "Ultra wide format. Keep elements horizontally distributed.",
    },
    # LinkedIn (5)
    "li_profile": {
        "label": "Profile photo",
        "width": 400,
        "height": 400,
        "network": "linkedin",
        "hint": "Circular profile picture. Keep elements centered.",
    },
    "li_cover": {
        "label": "Cover image",
        "width": 1584,
        "height": 396,
        "network": "linkedin",
        "hint": "A banner cover image. Keep in mind the profile picture overlaps the bottom left area. Place key text in the top or right sides.",
    },
    "li_post": {
        "label": "Image post",
        "width": 1200,
        "height": 627,
        "network": "linkedin",
        "hint": "A standard LinkedIn feed post. Professional layout, clear typography, good contrast.",
    },
    "li_link": {
        "label": "Link post",
        "width": 520,
        "height": 320,
        "network": "linkedin",
        "hint": "Thumbnail for a shared link. Very small, use big bold text if any.",
    },
    "li_carousel": {
        "label": "LinkedIn carousel (PDF)",
        "width": 1080,
        "height": 1080,
        "network": "linkedin",
        "hint": "A square slide for a LinkedIn PDF carousel. Include a subtle pagination indicator if there are multiple slides (e.g., '1/5' or an arrow).",
    },
    # X / Twitter (7)
    "x_profile": {
        "label": "Profile photo",
        "width": 400,
        "height": 400,
        "network": "x",
        "hint": "Circular profile picture. Center everything.",
    },
    "x_header": {
        "label": "Header image",
        "width": 1500,
        "height": 500,
        "network": "x",
        "hint": "A wide banner. The profile picture overlaps the bottom left. Keep text towards the center or right.",
    },
    "x_square": {
        "label": "Square image",
        "width": 1200,
        "height": 1200,
        "network": "x",
        "hint": "Standard square post for X. Versatile format.",
    },
    "x_landscape": {
        "label": "Landscape image",
        "width": 1200,
        "height": 675,
        "network": "x",
        "hint": "Standard landscape post for X. 16:9 ratio. Best for in-stream photos.",
    },
    "x_video_h": {
        "label": "Landscape video",
        "width": 1920,
        "height": 1080,
        "network": "x",
        "hint": "16:9 landscape format.",
    },
    "x_video_v": {
        "label": "Portrait video",
        "width": 1080,
        "height": 1920,
        "network": "x",
        "hint": "9:16 portrait video.",
    },
    "x_card": {
        "label": "X Cards",
        "width": 800,
        "height": 418,
        "network": "x",
        "hint": "Thumbnail for a shared web link. Use minimal, large text.",
    },
    # Facebook (5)
    "fb_profile": {
        "label": "Profile picture",
        "width": 170,
        "height": 170,
        "network": "facebook",
        "hint": "Circular profile picture. Essential elements exactly in the center.",
    },
    "fb_cover": {
        "label": "Cover photo",
        "width": 820,
        "height": 312,
        "network": "facebook",
        "hint": "Wide banner cover. Note that on mobile it crops the sides to 640x360. Keep critical text in the center safe zone.",
    },
    "fb_post_sq": {
        "label": "Square post",
        "width": 1080,
        "height": 1080,
        "network": "facebook",
        "hint": "Standard 1:1 post. Highly versatile and visible on both mobile and desktop feeds.",
    },
    "fb_post_p": {
        "label": "Portrait post",
        "width": 630,
        "height": 1200,
        "network": "facebook",
        "hint": "Vertical post for Facebook feed. Best for mobile scrolling.",
    },
    "fb_story": {
        "label": "Story / Reel",
        "width": 1080,
        "height": 1920,
        "network": "facebook",
        "hint": "9:16 vertical full screen. Leave top 250px and bottom 250px clear of important text or logos to avoid UI overlap.",
    },
    # TikTok (3)
    "tt_profile": {
        "label": "Profile photo",
        "width": 200,
        "height": 200,
        "network": "tiktok",
        "hint": "Circular profile picture.",
    },
    "tt_video": {
        "label": "TikTok video",
        "width": 1080,
        "height": 1920,
        "network": "tiktok",
        "hint": "9:16 full vertical. CRITICAL: Leave the bottom 400px entirely clear of text (for caption and sound info) and the right 150px clear (for action buttons).",
    },
    "tt_carousel": {
        "label": "Photo carousel",
        "width": 1080,
        "height": 1920,
        "network": "tiktok",
        "hint": "Vertical 9:16 slide. Apply the same safe zones as TikTok videos: bottom 400px and right 150px must be empty.",
    },
    # Pinterest (3)
    "pin_profile": {
        "label": "Profile photo",
        "width": 165,
        "height": 165,
        "network": "pinterest",
        "hint": "Circular profile picture.",
    },
    "pin_standard": {
        "label": "Standard Pin",
        "width": 1000,
        "height": 1500,
        "network": "pinterest",
        "hint": "2:3 vertical ratio. Ideal for Pinterest. Needs a clear, bold title and high visual hierarchy to stand out in the grid.",
    },
    "pin_long": {
        "label": "Long Pin",
        "width": 1000,
        "height": 2100,
        "network": "pinterest",
        "hint": "Extra tall pin (1:2.1). Great for infographics and step-by-step guides. Keep text legible at small sizes.",
    },
}

_LEGACY_ALIASES: dict[str, str] = {
    "1:1": "ig_square",
    "16:9": "x_video_h",
    "4:5": "ig_portrait_c",
    "9:16": "ig_story",
}

DEFAULT_FORMAT = "ig_square"


def get_format(fmt: str) -> dict:
    """Return format dimensions. Falls back to ig_square if unknown. Handles legacy keys."""
    resolved = _LEGACY_ALIASES.get(fmt, fmt)
    return FORMAT_REGISTRY.get(resolved, FORMAT_REGISTRY[DEFAULT_FORMAT])
