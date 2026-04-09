"""
Celery tasks for asynchronous extraction of design bank sources.
"""

import io
import logging
import mimetypes

import requests
from celery import shared_task

from .constants import (
    CELERY_RETRY_COUNTDOWN_SECONDS,
    DESIGN_BANK_USER_AGENT,
    DOWNLOAD_CHUNK_SIZE,
    TEXT_SNIPPET_MAX_CHARS,
)
from .models import DesignBankSource
from .scanners import get_scanner
from .storage import download_file, generate_storage_key, upload_file
from .validators import (
    DOWNLOAD_TIMEOUT,
    MAX_FILE_SIZE,
    MAX_REDIRECTS,
    is_reference_only,
    validate_url,
)

logger = logging.getLogger(__name__)


def _get_source(source_id: int):
    return DesignBankSource.objects.filter(pk=source_id).first()


def _extract_text_metadata(content: bytes, content_type: str, url: str = "") -> dict:
    """
    Extract safe metadata from content. HTML/CSS/JS is stored as reference only —
    the raw bytes are kept in storage; we only extract text snippets and metadata here.
    Never execute any code.
    """
    base_type = content_type.split(";")[0].strip().lower()
    result: dict = {
        "content_type": base_type,
        "size_bytes": len(content),
        "reference_only": is_reference_only(content_type),
    }

    if base_type in {
        "text/html",
        "text/css",
        "application/javascript",
        "text/javascript",
        "text/plain",
        "text/markdown",
    }:
        # Store only a text snippet — never parse/execute
        try:
            text = content[:TEXT_SNIPPET_MAX_CHARS].decode("utf-8", errors="replace")
        except Exception as exc:
            logger.debug("Text snippet decode failed: %s", exc)
            text = ""
        result["text_snippet"] = text
        result["source_url"] = url

    return result


@shared_task(bind=True, max_retries=3)
def extract_from_url(self, source_id: int):
    """Fetch a URL, apply SSRF checks, store to S3, extract metadata."""
    source = _get_source(source_id)
    if source is None:
        logger.warning("extract_from_url: source %s not found", source_id)
        return

    source.status = DesignBankSource.Status.PROCESSING
    source.save(update_fields=["status", "updated_at"])

    try:
        # Re-validate URL at task execution time (prevents TOCTOU)
        validate_url(source.url)

        response = requests.get(
            source.url,
            timeout=DOWNLOAD_TIMEOUT,
            stream=True,
            allow_redirects=False,
            headers={"User-Agent": DESIGN_BANK_USER_AGENT},
        )

        # Manually follow redirects with SSRF validation at each hop
        redirect_count = 0
        while response.is_redirect and redirect_count < MAX_REDIRECTS:
            redirect_url = response.headers.get("Location", "")
            validate_url(redirect_url)  # SSRF check on redirect target
            response = requests.get(
                redirect_url,
                timeout=DOWNLOAD_TIMEOUT,
                stream=True,
                allow_redirects=False,
                headers={"User-Agent": DESIGN_BANK_USER_AGENT},
            )
            redirect_count += 1

        if response.is_redirect:
            raise ValueError(f"Too many redirects ({redirect_count})")

        response.raise_for_status()

        # Enforce size limit
        content_length = int(response.headers.get("Content-Length", 0))
        if content_length > MAX_FILE_SIZE:
            raise ValueError(f"Content-Length {content_length} exceeds limit")

        data = b""
        for chunk in response.iter_content(chunk_size=DOWNLOAD_CHUNK_SIZE):
            data += chunk
            if len(data) > MAX_FILE_SIZE:
                raise ValueError("Downloaded content exceeds size limit")

        content_type = response.headers.get("Content-Type", "application/octet-stream")

        # Malware scan
        scanner = get_scanner()
        scan_result = scanner.scan_bytes(data, filename=source.original_filename or "")
        if not scan_result.clean:
            raise ValueError(f"Scan failed: {scan_result.detail}")

        storage_key = generate_storage_key(source.original_filename or "file")
        upload_file(io.BytesIO(data), storage_key, content_type)

        extracted = _extract_text_metadata(data, content_type, url=source.url)

        source.storage_key = storage_key
        source.status = DesignBankSource.Status.READY
        source.extracted_data = extracted
        source.error_message = ""
        source.save(update_fields=["storage_key", "status", "extracted_data", "error_message", "updated_at"])

    except Exception as exc:
        logger.exception("extract_from_url failed for source %s: %s", source_id, exc)
        source.status = DesignBankSource.Status.FAILED
        source.error_message = str(exc)
        source.save(update_fields=["status", "error_message", "updated_at"])
        raise self.retry(exc=exc, countdown=CELERY_RETRY_COUNTDOWN_SECONDS)


@shared_task(bind=True, max_retries=3)
def extract_from_file(self, source_id: int):
    """Read a file that's already been uploaded to storage, extract metadata."""
    source = _get_source(source_id)
    if source is None:
        logger.warning("extract_from_file: source %s not found", source_id)
        return

    source.status = DesignBankSource.Status.PROCESSING
    source.save(update_fields=["status", "updated_at"])

    try:
        # Download directly via internal MinIO endpoint (avoids localhost presigned URL issue)
        data = download_file(source.storage_key)

        content_type = mimetypes.guess_type(source.original_filename or "")[0] or "application/octet-stream"

        scanner = get_scanner()
        scan_result = scanner.scan_bytes(data, filename=source.original_filename or "")
        if not scan_result.clean:
            raise ValueError(f"Scan failed: {scan_result.detail}")

        extracted = _extract_text_metadata(data, content_type)

        source.status = DesignBankSource.Status.READY
        source.extracted_data = extracted
        source.error_message = ""
        source.save(update_fields=["status", "extracted_data", "error_message", "updated_at"])

    except Exception as exc:
        logger.exception("extract_from_file failed for source %s: %s", source_id, exc)
        source.status = DesignBankSource.Status.FAILED
        source.error_message = str(exc)
        source.save(update_fields=["status", "error_message", "updated_at"])
        raise self.retry(exc=exc, countdown=CELERY_RETRY_COUNTDOWN_SECONDS)
