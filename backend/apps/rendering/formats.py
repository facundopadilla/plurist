"""
Format registry for post/render dimensions.
"""

FORMAT_REGISTRY: dict[str, dict] = {
    # Instagram (10)
    "ig_profile": {"label": "Foto de perfil", "width": 320, "height": 320, "network": "instagram"},
    "ig_square": {"label": "Post cuadrado", "width": 1080, "height": 1080, "network": "instagram"},
    "ig_landscape": {"label": "Post horizontal", "width": 1080, "height": 608, "network": "instagram"},
    "ig_portrait_c": {"label": "Post vertical (clásico)", "width": 1080, "height": 1350, "network": "instagram"},
    "ig_portrait_n": {"label": "Post vertical (nuevo)", "width": 1080, "height": 1440, "network": "instagram"},
    "ig_story": {"label": "Stories", "width": 1080, "height": 1920, "network": "instagram"},
    "ig_highlight": {"label": "Portada Stories dest.", "width": 640, "height": 640, "network": "instagram"},
    "ig_reel": {"label": "Reels", "width": 1080, "height": 1920, "network": "instagram"},
    "ig_reel_cover": {"label": "Portada Reel", "width": 420, "height": 654, "network": "instagram"},
    "ig_reel_wide": {"label": "Reels ultra anchos", "width": 5120, "height": 1080, "network": "instagram"},
    # LinkedIn (5)
    "li_profile": {"label": "Perfil", "width": 400, "height": 400, "network": "linkedin"},
    "li_cover": {"label": "Imagen de portada", "width": 1584, "height": 396, "network": "linkedin"},
    "li_post": {"label": "Post con imagen", "width": 1200, "height": 627, "network": "linkedin"},
    "li_link": {"label": "Post con enlace", "width": 520, "height": 320, "network": "linkedin"},
    "li_carousel": {"label": "Carrusel LinkedIn (PDF)", "width": 1080, "height": 1080, "network": "linkedin"},
    # X / Twitter (7)
    "x_profile": {"label": "Foto de perfil", "width": 400, "height": 400, "network": "x"},
    "x_header": {"label": "Imagen de cabecera", "width": 1500, "height": 500, "network": "x"},
    "x_square": {"label": "Imagen cuadrada", "width": 1200, "height": 1200, "network": "x"},
    "x_landscape": {"label": "Imagen horizontal", "width": 1200, "height": 675, "network": "x"},
    "x_video_h": {"label": "Vídeo horizontal", "width": 1920, "height": 1080, "network": "x"},
    "x_video_v": {"label": "Vídeo vertical", "width": 1080, "height": 1920, "network": "x"},
    "x_card": {"label": "X Cards", "width": 800, "height": 418, "network": "x"},
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
