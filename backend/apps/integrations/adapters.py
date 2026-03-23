from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class MediaUploadResult:
    success: bool
    media_id: str = ""
    error: str = ""


@dataclass
class PublishResult:
    success: bool
    external_post_id: str = ""
    error: str = ""


class BaseAdapter(ABC):
    """Abstract base adapter contract for social network integrations."""

    @abstractmethod
    def authenticate(self, connection: Any) -> bool:
        """Verify the connection credentials are valid."""
        ...

    @abstractmethod
    def refresh_token(self, connection: Any) -> bool:
        """Refresh the OAuth token for the connection."""
        ...

    @abstractmethod
    def upload_media(self, connection: Any, media_data: bytes) -> MediaUploadResult:
        """Upload media to the network and return a media ID."""
        ...

    @abstractmethod
    def publish(self, connection: Any, content: dict) -> PublishResult:
        """Publish content via the connection."""
        ...

    @abstractmethod
    def get_capabilities(self) -> dict:
        """Return the network capability dict for this adapter."""
        ...
