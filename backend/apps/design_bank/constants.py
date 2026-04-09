"""Shared constants for the design_bank app (messages, limits, upload sets)."""

from __future__ import annotations

# ── API / HTTP messages ─────────────────────────────────────────────

SOURCE_NOT_FOUND = "Source not found"
WORKSPACE_NOT_BOOTSTRAPPED = "Workspace not bootstrapped"
NO_FILE_STORED_FOR_SOURCE = "No file stored for this source"
PROJECT_NOT_FOUND = "Project not found"
SOURCE_HAS_NO_STORED_FILE = "Source has no stored file"
INSUFFICIENT_PERMISSIONS = "Insufficient permissions"
STORAGE_MINIO_UNAVAILABLE = "Cannot connect to storage (MinIO unavailable)"
STORAGE_BUCKET_MISSING = "Storage bucket does not exist — contact the administrator"
STORAGE_UPLOAD_FAILED_PREFIX = "Failed to upload file:"

# ── Upload type detection ───────────────────────────────────────────

IMAGE_UPLOAD_EXTENSIONS: frozenset[str] = frozenset(
    {"jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"},
)
MARKDOWN_UPLOAD_EXTENSIONS: frozenset[str] = frozenset({"md", "markdown"})

# ── Presigned URLs & snippets ───────────────────────────────────────

PRESIGNED_URL_TTL_SECONDS = 300
TEXT_SNIPPET_MAX_CHARS = 4096
UPLOAD_ERROR_MESSAGE_MAX_CHARS = 120
DEFAULT_CONTENT_TYPE_INLINE = "text/html; charset=utf-8"

# ── Celery / HTTP download ───────────────────────────────────────────

DESIGN_BANK_USER_AGENT = "Plurist-DesignBank/1.0"
DOWNLOAD_CHUNK_SIZE = 65536
CELERY_RETRY_COUNTDOWN_SECONDS = 60
