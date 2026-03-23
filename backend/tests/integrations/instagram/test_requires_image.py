"""Tests that Instagram rejects text-only posts (image is required)."""
from __future__ import annotations

import pytest

from apps.integrations.providers.instagram import InstagramAdapter


def test_text_only_publish_is_rejected():
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={"text": "No image here"},
    )
    assert result.success is False
    assert result.external_post_id == ""
    assert "image" in result.error.lower()


def test_publish_with_empty_image_is_rejected():
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={"image": "", "caption": "Empty image URL"},
    )
    assert result.success is False
    assert "image" in result.error.lower()


def test_publish_with_none_image_is_rejected():
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={"image": None, "caption": "None image"},
    )
    assert result.success is False
    assert "image" in result.error.lower()


def test_publish_with_missing_image_key_is_rejected():
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={"caption": "Caption only, no image key at all"},
    )
    assert result.success is False
    assert "image" in result.error.lower()


def test_error_message_mentions_text_only_not_supported():
    adapter = InstagramAdapter()
    result = adapter.publish(connection=None, content={})
    assert result.success is False
    assert "text-only" in result.error.lower() or "image" in result.error.lower()


def test_caption_exceeding_max_chars_is_rejected():
    adapter = InstagramAdapter()
    long_caption = "a" * 2201
    result = adapter.publish(
        connection=None,
        content={"image": b"img", "caption": long_caption},
    )
    assert result.success is False
    assert "2200" in result.error or "limit" in result.error.lower()


def test_caption_at_max_chars_is_accepted():
    adapter = InstagramAdapter()
    max_caption = "a" * 2200
    result = adapter.publish(
        connection=None,
        content={"image": b"img", "caption": max_caption},
    )
    assert result.success is True


def test_mock_mode_returns_mock_adapter_not_instagram(monkeypatch):
    monkeypatch.setenv("FEATURE_INSTAGRAM_LIVE", "false")
    from apps.integrations.registry import get_adapter
    from apps.integrations.providers.mock_adapter import MockAdapter

    adapter = get_adapter("instagram")
    assert isinstance(adapter, MockAdapter)
