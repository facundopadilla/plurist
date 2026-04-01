from __future__ import annotations

from typing import Any

from apps.integrations.adapters import BaseAdapter, MediaUploadResult, PublishResult
from apps.meta.capabilities import NETWORK_CAPABILITIES


class MockAdapter(BaseAdapter):
    """Mock adapter that returns success for all operations.

    Used in tests and when the network feature flag is off (mock mode).
    """

    def __init__(self, network: str) -> None:
        self.network = network

    def authenticate(self, connection: Any) -> bool:
        return True

    def refresh_token(self, connection: Any) -> bool:
        return True

    def upload_media(self, connection: Any, media_data: bytes) -> MediaUploadResult:
        return MediaUploadResult(success=True, media_id="mock-media-id")

    def publish(self, connection: Any, content: dict) -> PublishResult:
        return PublishResult(success=True, external_post_id="mock-post-id")

    def get_capabilities(self) -> dict:
        return NETWORK_CAPABILITIES.get(self.network, {})
