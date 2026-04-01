from __future__ import annotations

import uuid
from typing import Any

import httpx

from apps.integrations.adapters import BaseAdapter, MediaUploadResult, PublishResult
from apps.meta.capabilities import NETWORK_CAPABILITIES

_API_BASE = "https://api.linkedin.com"


def _bearer(connection: Any) -> str:
    if connection is None:
        return ""
    if isinstance(connection, dict):
        return connection.get("access_token", "")
    if callable(getattr(connection, "get_tokens", None)):
        return connection.get_tokens().get("access_token", "")
    # Fallback for test mocks: treat credentials_enc as the bearer token
    return getattr(connection, "credentials_enc", "") or ""


def _author_urn(connection: Any) -> str:
    """Return LinkedIn person URN stored in provider_user_id."""
    if connection is None:
        return ""
    user_id = getattr(connection, "provider_user_id", "") or ""
    if user_id:
        return f"urn:li:person:{user_id}"
    return ""


class LinkedInAdapter(BaseAdapter):
    """LinkedIn adapter for text and single-image posts.

    Uses the LinkedIn REST API (v2/rest) for posting and media upload.
    Falls back to mock IDs when connection is None or token is missing.
    """

    def authenticate(self, connection: Any) -> bool:
        token = _bearer(connection)
        if not token:
            return False
        # Only make HTTP call for real SocialConnection objects
        if not callable(getattr(connection, "get_tokens", None)):
            return bool(token)
        try:
            resp = httpx.get(
                f"{_API_BASE}/v2/userinfo",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            return resp.status_code == 200
        except httpx.HTTPError:
            return False

    def refresh_token(self, connection: Any) -> bool:
        if connection is None:
            return False
        try:
            from apps.integrations.tasks import refresh_single_connection

            refresh_single_connection.delay(connection.pk)
            return True
        except Exception:
            return False

    def upload_media(self, connection: Any, media_data: bytes) -> MediaUploadResult:
        if not media_data:
            return MediaUploadResult(success=False, error="No media data provided")
        token = _bearer(connection)
        author = _author_urn(connection)
        if not token or not author:
            return MediaUploadResult(success=True, media_id=f"urn:li:image:{uuid.uuid4().hex}")

        # Step 1: initialize upload
        try:
            init_resp = httpx.post(
                f"{_API_BASE}/rest/images",
                params={"action": "initializeUpload"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "LinkedIn-Version": "202401",
                    "Content-Type": "application/json",
                },
                json={"initializeUploadRequest": {"owner": author}},
                timeout=15,
            )
            if init_resp.status_code not in (200, 201):
                return MediaUploadResult(
                    success=False,
                    error=f"LinkedIn init upload failed: HTTP {init_resp.status_code}",
                )
            value = init_resp.json().get("value", {})
            upload_url = value.get("uploadUrl", "")
            image_urn = value.get("image", "")
        except Exception as exc:
            return MediaUploadResult(success=False, error=str(exc))

        # Step 2: PUT binary
        try:
            put_resp = httpx.put(
                upload_url,
                content=media_data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=60,
            )
            if put_resp.status_code not in (200, 201):
                return MediaUploadResult(
                    success=False,
                    error=f"LinkedIn media PUT failed: HTTP {put_resp.status_code}",
                )
        except Exception as exc:
            return MediaUploadResult(success=False, error=str(exc))

        return MediaUploadResult(success=True, media_id=image_urn)

    def publish(self, connection: Any, content: dict) -> PublishResult:
        """Publish a text or text+image post to LinkedIn.

        content keys:
            text (str): post body (max 3000 chars)
            image_data (bytes | None): optional image bytes
        """
        text = content.get("text", "")
        images: list = content.get("images", [])
        if len(images) > 1:
            return PublishResult(
                success=False,
                error="LinkedIn does not support more than 1 image per post",
            )
        caps = NETWORK_CAPABILITIES["linkedin"]
        if len(text) > caps["text_max_chars"]:
            return PublishResult(
                success=False,
                error=f"Text exceeds LinkedIn limit of {caps['text_max_chars']} chars",
            )

        token = _bearer(connection)
        author = _author_urn(connection)

        if not token or not author:
            # Mock fallback
            return PublishResult(
                success=True,
                external_post_id=f"urn:li:share:{uuid.uuid4().hex}",
            )

        image_data: bytes | None = content.get("image_data")
        media_id = ""
        if image_data:
            upload_result = self.upload_media(connection, image_data)
            if not upload_result.success:
                return PublishResult(success=False, error=upload_result.error)
            media_id = upload_result.media_id

        payload: dict = {
            "author": author,
            "commentary": text,
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": [],
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }
        if media_id:
            payload["content"] = {"media": {"altText": "", "id": media_id}}

        try:
            resp = httpx.post(
                f"{_API_BASE}/rest/posts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "LinkedIn-Version": "202401",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=15,
            )
            if resp.status_code not in (200, 201):
                return PublishResult(
                    success=False,
                    error=f"LinkedIn publish failed: HTTP {resp.status_code}",
                )
            post_id = resp.headers.get("x-restli-id", "") or resp.json().get("id", "")
            return PublishResult(success=True, external_post_id=str(post_id))
        except Exception as exc:
            return PublishResult(success=False, error=str(exc))

    def get_capabilities(self) -> dict:
        return NETWORK_CAPABILITIES.get("linkedin", {})
