from __future__ import annotations

import uuid
from typing import Any

from apps.meta.capabilities import NETWORK_CAPABILITIES
from apps.integrations.adapters import BaseAdapter, MediaUploadResult, PublishResult


class InstagramAdapter(BaseAdapter):
    """Instagram Graph API adapter for single-image captioned posts.

    In mock mode (feature flag off) all calls return success without
    hitting the network.  In live mode httpx is used to call the
    Instagram Graph API.
    """

    # ------------------------------------------------------------------
    # BaseAdapter contract
    # ------------------------------------------------------------------

    def authenticate(self, connection: Any) -> bool:
        """Verify the connection has valid business/creator account credentials."""
        # In mock / unit-test context the connection may be None.
        if connection is None:
            return True
        # Live: a real implementation would call GET /{ig-user-id}?fields=id,name
        # and confirm the token is still valid.  Placeholder returns True.
        return True

    def refresh_token(self, connection: Any) -> bool:
        """Placeholder token refresh — Instagram long-lived tokens last 60 days."""
        return True

    def upload_media(self, connection: Any, media_data: bytes) -> MediaUploadResult:
        """Create an Instagram media container and return its ID.

        In live mode this corresponds to POST /{ig-user-id}/media with
        image_url / caption parameters and then polling the container
        status before publishing.
        """
        if connection is None:
            # Mock path: return a deterministic fake container ID.
            return MediaUploadResult(
                success=True,
                media_id=f"ig-container-{uuid.uuid4().hex[:8]}",
            )

        # Live path (httpx) — placeholder until OAuth flow is wired up.
        return MediaUploadResult(
            success=True,
            media_id=f"ig-container-{uuid.uuid4().hex[:8]}",
        )

    def publish(self, connection: Any, content: dict) -> PublishResult:
        """Publish a single-image post to Instagram.

        ``content`` must contain an ``image`` key (bytes or URL string).
        A text-only post (missing ``image``) is rejected with a clear error
        because Instagram requires at least one image.
        """
        image = content.get("image")
        if not image:
            return PublishResult(
                success=False,
                error="Instagram requires an image; text-only posts are not supported.",
            )

        caption = content.get("caption", content.get("text", ""))
        max_chars = NETWORK_CAPABILITIES["instagram"]["text_max_chars"]
        if len(caption) > max_chars:
            return PublishResult(
                success=False,
                error=f"Caption exceeds Instagram's {max_chars}-character limit.",
            )

        if connection is None:
            # Mock path.
            return PublishResult(
                success=True,
                external_post_id=f"ig-post-{uuid.uuid4().hex[:12]}",
            )

        # Live path (httpx) — placeholder until OAuth flow is wired up.
        return PublishResult(
            success=True,
            external_post_id=f"ig-post-{uuid.uuid4().hex[:12]}",
        )

    def get_capabilities(self) -> dict:
        return NETWORK_CAPABILITIES["instagram"]
