"""
Multi-format export for rendered images.
Converts PNG output from MinIO to JPG, WebP, or PDF using Pillow.
"""

import io

SUPPORTED_FORMATS = {"png", "jpg", "jpeg", "webp", "pdf"}

CONTENT_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "pdf": "application/pdf",
}


def export_render(png_bytes: bytes, fmt: str, quality: int = 90) -> tuple[bytes, str]:
    """
    Convert PNG bytes to the requested format.

    Returns (output_bytes, content_type).
    """
    from PIL import Image

    fmt = fmt.lower()
    if fmt not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported export format: {fmt!r}")

    content_type = CONTENT_TYPES[fmt]

    if fmt == "png":
        return png_bytes, content_type

    img = Image.open(io.BytesIO(png_bytes))

    if fmt in ("jpg", "jpeg"):
        # JPEG requires RGB (no alpha)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        return buf.getvalue(), content_type

    if fmt == "webp":
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality)
        return buf.getvalue(), content_type

    if fmt == "pdf":
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="PDF")
        return buf.getvalue(), content_type

    raise ValueError(f"Unhandled export format: {fmt!r}")


def get_png_from_storage(storage_key: str) -> bytes:
    """Download PNG bytes from MinIO."""
    from apps.design_bank.storage import download_file

    return download_file(storage_key)
