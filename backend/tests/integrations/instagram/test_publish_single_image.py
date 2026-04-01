"""Tests for successful Instagram single-image publish."""

from __future__ import annotations

from apps.integrations.providers.instagram import InstagramAdapter


def test_publish_with_image_and_caption_succeeds():
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={"image": b"fake-image-bytes", "caption": "Hello Instagram!"},
    )
    assert result.success is True
    assert result.external_post_id != ""
    assert result.error == ""


def test_publish_stores_external_post_id():
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={"image": b"fake-image-bytes", "caption": "Caption here"},
    )
    assert result.success is True
    # external_post_id must be a non-empty string (would be stored on PublishAttempt)
    assert isinstance(result.external_post_id, str)
    assert len(result.external_post_id) > 0


def test_publish_with_image_url_succeeds():
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={
            "image": "https://example.com/photo.jpg",
            "caption": "Photo caption",
        },
    )
    assert result.success is True
    assert result.external_post_id.startswith("ig-post-")


def test_publish_with_text_key_used_as_caption():
    """content['text'] falls back to caption when 'caption' key absent."""
    adapter = InstagramAdapter()
    result = adapter.publish(
        connection=None,
        content={"image": b"img", "text": "Fallback caption"},
    )
    assert result.success is True


def test_get_adapter_returns_instagram_adapter_when_flag_live(monkeypatch):
    monkeypatch.setenv("FEATURE_INSTAGRAM_LIVE", "true")
    from apps.integrations.registry import get_adapter

    adapter = get_adapter("instagram")
    assert isinstance(adapter, InstagramAdapter)


def test_get_capabilities_returns_instagram_caps():
    adapter = InstagramAdapter()
    caps = adapter.get_capabilities()
    assert caps["network"] == "instagram"
    assert caps["requires_image"] is True
    assert caps["max_images"] == 1
    assert caps["text_max_chars"] == 2200


def test_authenticate_returns_true():
    adapter = InstagramAdapter()
    assert adapter.authenticate(None) is True


def test_refresh_token_returns_true():
    adapter = InstagramAdapter()
    assert adapter.refresh_token(None) is True


def test_upload_media_returns_success():
    adapter = InstagramAdapter()
    result = adapter.upload_media(None, b"fake-image-bytes")
    assert result.success is True
    assert result.media_id.startswith("ig-container-")
