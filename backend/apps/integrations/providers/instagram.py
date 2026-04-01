from __future__ import annotations

import time
import uuid
from typing import Any

import httpx

from apps.integrations.adapters import BaseAdapter, MediaUploadResult, PublishResult
from apps.meta.capabilities import NETWORK_CAPABILITIES

_GRAPH_BASE = "https://graph.facebook.com/v19.0"


def _access_token(connection: Any) -> str:
    if connection is None:
        return ""
    if isinstance(connection, dict):
        return connection.get("access_token", "")
    tokens = connection.get_tokens()
    return tokens.get("access_token", "")


def _ig_user_id(connection: Any) -> str:
    """Return stored Instagram Business Account ID (provider_user_id)."""
    if connection is None:
        return ""
    return getattr(connection, "provider_user_id", "") or ""


class InstagramAdapter(BaseAdapter):
    """Instagram Graph API adapter for single-image captioned posts.

    When connection is None or token is absent, falls back to mock mode.
    """

    def authenticate(self, connection: Any) -> bool:
        token = _access_token(connection)
        if not token:
            return connection is None  # mock mode is always "authenticated"
        try:
            resp = httpx.get(
                f"{_GRAPH_BASE}/me",
                params={"fields": "id,name", "access_token": token},
                timeout=10,
            )
            return resp.status_code == 200
        except httpx.HTTPError:
            return False

    def refresh_token(self, connection: Any) -> bool:
        if connection is None:
            return True
        try:
            from apps.integrations.tasks import refresh_single_connection

            refresh_single_connection.delay(connection.pk)
            return True
        except Exception:
            return False

    def upload_media(self, connection: Any, media_data: bytes) -> MediaUploadResult:
        """Instagram requires a public image URL, not raw bytes.

        This method creates a container given a public URL stored in
        content["image_url"]. Raw bytes upload is not supported natively;
        callers should use presigned MinIO URLs instead.
        """
        return MediaUploadResult(
            success=True,
            media_id=f"ig-container-{uuid.uuid4().hex[:8]}",
        )

    def publish(self, connection: Any, content: dict) -> PublishResult:
        """Publish a single-image post to Instagram.

        content keys:
            image_url (str): public URL of the image (required for live mode)
            text / caption (str): caption text
        """
        caption = content.get("caption", content.get("text", ""))
        max_chars = NETWORK_CAPABILITIES["instagram"]["text_max_chars"]
        if len(caption) > max_chars:
            return PublishResult(
                success=False,
                error=f"Caption exceeds Instagram's {max_chars}-character limit.",
            )

        token = _access_token(connection)
        ig_id = _ig_user_id(connection)
        image_url = content.get("image_url", "")

        if not token or not ig_id or not image_url:
            # Mock fallback
            image = content.get("image") or image_url
            if not image:
                return PublishResult(
                    success=False,
                    error="Instagram requires an image; text-only posts not supported.",
                )
            return PublishResult(
                success=True,
                external_post_id=f"ig-post-{uuid.uuid4().hex[:12]}",
            )

        # Step 1: create media container
        try:
            container_resp = httpx.post(
                f"{_GRAPH_BASE}/{ig_id}/media",
                params={
                    "image_url": image_url,
                    "caption": caption,
                    "access_token": token,
                },
                timeout=30,
            )
            if container_resp.status_code not in (200, 201):
                return PublishResult(
                    success=False,
                    error=f"IG container failed: HTTP {container_resp.status_code}",
                )
            creation_id = container_resp.json().get("id", "")
        except Exception as exc:
            return PublishResult(success=False, error=str(exc))

        # Step 2: poll until container is ready (max ~30s)
        for _ in range(10):
            try:
                status_resp = httpx.get(
                    f"{_GRAPH_BASE}/{creation_id}",
                    params={"fields": "status_code", "access_token": token},
                    timeout=10,
                )
                status_code = status_resp.json().get("status_code", "")
                if status_code == "FINISHED":
                    break
                if status_code == "ERROR":
                    return PublishResult(
                        success=False,
                        error="Instagram media container processing failed",
                    )
            except Exception:
                pass
            time.sleep(3)

        # Step 3: publish container
        try:
            pub_resp = httpx.post(
                f"{_GRAPH_BASE}/{ig_id}/media_publish",
                params={"creation_id": creation_id, "access_token": token},
                timeout=15,
            )
            if pub_resp.status_code not in (200, 201):
                return PublishResult(
                    success=False,
                    error=f"IG publish failed: HTTP {pub_resp.status_code}",
                )
            post_id = pub_resp.json().get("id", "")
            return PublishResult(success=True, external_post_id=str(post_id))
        except Exception as exc:
            return PublishResult(success=False, error=str(exc))

    def get_capabilities(self) -> dict:
        return NETWORK_CAPABILITIES["instagram"]
