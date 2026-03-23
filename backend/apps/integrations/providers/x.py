from __future__ import annotations

import uuid
from typing import Any

from apps.meta.capabilities import NETWORK_CAPABILITIES
from apps.integrations.adapters import BaseAdapter, MediaUploadResult, PublishResult


class XAdapter(BaseAdapter):
    """Live adapter for X (formerly Twitter).

    Media must be uploaded before posting. The upload_media method returns a
    media_id that callers must pass in content["media_id"] when calling publish.

    Same-network fallback only: on failure this adapter never touches another
    network. Callers are responsible for routing.
    """

    # X API v2 base URL
    _API_BASE = "https://api.twitter.com/2"
    # X media upload endpoint (v1.1 — v2 does not yet support media upload)
    _UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json"

    def authenticate(self, connection: Any) -> bool:
        """Verify credentials by hitting GET /2/users/me."""
        import httpx

        token = self._bearer_token(connection)
        if not token:
            return False
        try:
            response = httpx.get(
                f"{self._API_BASE}/users/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    def refresh_token(self, connection: Any) -> bool:
        """Placeholder — OAuth 2.0 PKCE refresh not yet wired to token store."""
        return False

    def upload_media(self, connection: Any, media_data: bytes) -> MediaUploadResult:
        """Upload raw image bytes to X media/upload and return the media_id."""
        import httpx

        token = self._bearer_token(connection)
        if not token:
            return MediaUploadResult(success=False, error="Missing bearer token")

        try:
            response = httpx.post(
                self._UPLOAD_URL,
                headers={"Authorization": f"Bearer {token}"},
                files={"media": media_data},
                timeout=30,
            )
            if response.status_code != 200:
                return MediaUploadResult(
                    success=False,
                    error=f"Media upload failed: HTTP {response.status_code}",
                )
            data = response.json()
            media_id = str(data.get("media_id_string", ""))
            if not media_id:
                return MediaUploadResult(
                    success=False, error="No media_id_string in response"
                )
            return MediaUploadResult(success=True, media_id=media_id)
        except Exception as exc:  # noqa: BLE001
            return MediaUploadResult(success=False, error=str(exc))

    def publish(self, connection: Any, content: dict) -> PublishResult:
        """Create an X post. Attach media_id when present in content.

        content keys:
            text      (str)  — post text, max 280 chars
            media_id  (str)  — optional; returned by upload_media
            idempotency_key (str) — optional; forwarded as X request header
        """
        import httpx

        token = self._bearer_token(connection)
        if not token:
            return PublishResult(success=False, error="Missing bearer token")

        text = content.get("text", "")
        payload: dict = {"text": text}

        media_id = content.get("media_id", "")
        if media_id:
            payload["media"] = {"media_ids": [media_id]}

        idempotency_key = content.get("idempotency_key") or str(uuid.uuid4())
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Idempotency-Key": idempotency_key,
        }

        try:
            response = httpx.post(
                f"{self._API_BASE}/tweets",
                json=payload,
                headers=headers,
                timeout=15,
            )
            if response.status_code not in (200, 201):
                return PublishResult(
                    success=False,
                    error=f"Publish failed: HTTP {response.status_code}",
                )
            data = response.json()
            post_id = data.get("data", {}).get("id", "")
            return PublishResult(success=True, external_post_id=str(post_id))
        except Exception as exc:  # noqa: BLE001
            return PublishResult(success=False, error=str(exc))

    def get_capabilities(self) -> dict:
        return NETWORK_CAPABILITIES.get("x", {})

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _bearer_token(connection: Any) -> str:
        """Extract bearer token from connection credentials."""
        if connection is None:
            return ""
        # SocialConnection stores credentials_enc; in tests a plain dict is
        # acceptable too.
        if isinstance(connection, dict):
            return connection.get("bearer_token", "")
        creds = getattr(connection, "credentials_enc", "") or ""
        # credentials_enc may be a raw token string or a JSON dict; for now
        # treat the whole field as the bearer token (simple format).
        return creds.strip()
