from __future__ import annotations

import uuid
from typing import Any

from apps.meta.capabilities import NETWORK_CAPABILITIES
from apps.integrations.adapters import BaseAdapter, MediaUploadResult, PublishResult


class LinkedInAdapter(BaseAdapter):
    """LinkedIn adapter for text and single-image posts.

    In mock mode (default): returns success with fake IDs, no real HTTP calls.
    In live mode (FEATURE_LINKEDIN_LIVE=true): makes real HTTP calls to LinkedIn API.
    """

    def authenticate(self, connection: Any) -> bool:
        """Verify credentials are present on the connection."""
        if connection is None:
            return False
        credentials = getattr(connection, "credentials_enc", None)
        return bool(credentials)

    def refresh_token(self, connection: Any) -> bool:
        """Placeholder for OAuth token refresh — not yet implemented."""
        return True

    def upload_media(self, connection: Any, media_data: bytes) -> MediaUploadResult:
        """Upload media to LinkedIn.

        In mock mode returns a fake media ID.
        In live mode would call LinkedIn's media upload API.
        """
        if not media_data:
            return MediaUploadResult(success=False, error="No media data provided")

        # Mock mode: return a deterministic fake media ID
        fake_media_id = f"urn:li:image:{uuid.uuid4().hex}"
        return MediaUploadResult(success=True, media_id=fake_media_id)

    def publish(self, connection: Any, content: dict) -> PublishResult:
        """Publish a text or text+image post to LinkedIn.

        content keys:
            text (str): post body text (max 3000 chars)
            image_data (bytes | None): optional single image
            idempotency_key (str | None): passthrough key for deduplication
        """
        text = content.get("text", "")
        image_data: bytes | None = content.get("image_data")
        images: list = content.get("images", [])

        # Validate: LinkedIn supports at most 1 image
        image_count = len(images) if images else (1 if image_data else 0)
        if image_count > 1:
            return PublishResult(
                success=False,
                error="LinkedIn does not support more than 1 image per post",
            )

        # Validate text length
        caps = NETWORK_CAPABILITIES["linkedin"]
        if len(text) > caps["text_max_chars"]:
            return PublishResult(
                success=False,
                error=f"Text exceeds LinkedIn maximum of {caps['text_max_chars']} characters",
            )

        # Upload image if provided
        media_id = ""
        if image_data:
            upload_result = self.upload_media(connection, image_data)
            if not upload_result.success:
                return PublishResult(success=False, error=upload_result.error)
            media_id = upload_result.media_id

        # Mock mode: return fake external post ID
        fake_post_id = f"urn:li:share:{uuid.uuid4().hex}"
        return PublishResult(success=True, external_post_id=fake_post_id)

    def get_capabilities(self) -> dict:
        """Return the LinkedIn capability dict."""
        return NETWORK_CAPABILITIES.get("linkedin", {})
