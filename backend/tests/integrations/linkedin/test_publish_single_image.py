"""Tests for the LinkedIn adapter — mock mode publish."""

from __future__ import annotations

from apps.integrations.adapters import PublishResult
from apps.integrations.providers.linkedin import LinkedInAdapter

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_connection(credentials: str = "fake-access-token"):
    """Return a minimal connection-like object with credentials."""

    class _Conn:
        credentials_enc = credentials
        network = "linkedin"

    return _Conn()


# ---------------------------------------------------------------------------
# authenticate
# ---------------------------------------------------------------------------


def test_authenticate_returns_true_when_credentials_present():
    adapter = LinkedInAdapter()
    conn = _make_connection()
    assert adapter.authenticate(conn) is True


def test_authenticate_returns_false_when_no_credentials():
    adapter = LinkedInAdapter()
    conn = _make_connection(credentials="")
    assert adapter.authenticate(conn) is False


def test_authenticate_returns_false_for_none_connection():
    adapter = LinkedInAdapter()
    assert adapter.authenticate(None) is False


# ---------------------------------------------------------------------------
# publish — text only
# ---------------------------------------------------------------------------


def test_mock_publish_text_only_succeeds():
    adapter = LinkedInAdapter()
    conn = _make_connection()
    result = adapter.publish(conn, {"text": "Hello LinkedIn!"})

    assert isinstance(result, PublishResult)
    assert result.success is True
    assert result.external_post_id.startswith("urn:li:share:")
    assert result.error == ""


def test_mock_publish_stores_external_post_id():
    """Confirm external_post_id is non-empty and unique across calls."""
    adapter = LinkedInAdapter()
    conn = _make_connection()

    result1 = adapter.publish(conn, {"text": "Post one"})
    result2 = adapter.publish(conn, {"text": "Post two"})

    assert result1.success is True
    assert result2.success is True
    assert result1.external_post_id != result2.external_post_id


# ---------------------------------------------------------------------------
# publish — single image
# ---------------------------------------------------------------------------


def test_mock_publish_single_image_succeeds():
    adapter = LinkedInAdapter()
    conn = _make_connection()
    fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # minimal fake PNG bytes

    result = adapter.publish(conn, {"text": "Image post", "image_data": fake_image})

    assert result.success is True
    assert result.external_post_id.startswith("urn:li:share:")


def test_adapter_call_count_is_one_per_publish():
    """publish() is called exactly once and returns one result."""
    call_count = 0
    original_publish = LinkedInAdapter.publish

    class _CountingAdapter(LinkedInAdapter):
        def publish(self, connection, content):
            nonlocal call_count
            call_count += 1
            return original_publish(self, connection, content)

    adapter = _CountingAdapter()
    conn = _make_connection()
    result = adapter.publish(conn, {"text": "Count me"})

    assert result.success is True
    assert call_count == 1


# ---------------------------------------------------------------------------
# publish — validation: 2+ images rejected
# ---------------------------------------------------------------------------


def test_publish_rejects_two_images():
    """LinkedIn max_images=1; passing images list with 2 items must fail."""
    adapter = LinkedInAdapter()
    conn = _make_connection()
    fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100

    result = adapter.publish(
        conn,
        {
            "text": "Two images",
            "images": [fake_image, fake_image],
        },
    )

    assert result.success is False
    assert "1 image" in result.error or "more than 1" in result.error


def test_publish_rejects_text_exceeding_3000_chars():
    adapter = LinkedInAdapter()
    conn = _make_connection()
    long_text = "x" * 3001

    result = adapter.publish(conn, {"text": long_text})

    assert result.success is False
    assert "3000" in result.error


# ---------------------------------------------------------------------------
# get_capabilities
# ---------------------------------------------------------------------------


def test_get_capabilities_returns_linkedin_caps():
    adapter = LinkedInAdapter()
    caps = adapter.get_capabilities()

    assert caps["network"] == "linkedin"
    assert caps["max_images"] == 1
    assert caps["text_max_chars"] == 3000
    assert caps["supports_text"] is True


# ---------------------------------------------------------------------------
# upload_media
# ---------------------------------------------------------------------------


def test_upload_media_returns_mock_media_id():
    adapter = LinkedInAdapter()
    conn = _make_connection()
    result = adapter.upload_media(conn, b"fake-image-bytes")

    assert result.success is True
    assert result.media_id.startswith("urn:li:image:")


def test_upload_media_fails_on_empty_bytes():
    adapter = LinkedInAdapter()
    conn = _make_connection()
    result = adapter.upload_media(conn, b"")

    assert result.success is False
    assert result.error != ""


# ---------------------------------------------------------------------------
# registry integration — mock mode
# ---------------------------------------------------------------------------


def test_registry_returns_mock_adapter_when_flag_off(monkeypatch):
    monkeypatch.setenv("FEATURE_LINKEDIN_LIVE", "false")
    from apps.integrations.providers.mock_adapter import MockAdapter
    from apps.integrations.registry import get_adapter

    adapter = get_adapter("linkedin")
    assert isinstance(adapter, MockAdapter)


def test_registry_returns_linkedin_adapter_when_flag_on(monkeypatch):
    monkeypatch.setenv("FEATURE_LINKEDIN_LIVE", "true")
    from apps.integrations.registry import get_adapter

    adapter = get_adapter("linkedin")
    assert isinstance(adapter, LinkedInAdapter)
