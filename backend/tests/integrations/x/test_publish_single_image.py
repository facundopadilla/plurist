"""Tests for X adapter media-upload-then-publish sequence."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from apps.integrations.providers.x import XAdapter
from apps.integrations.adapters import MediaUploadResult, PublishResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _connection(bearer_token: str = "test-token") -> dict:
    """Minimal connection dict accepted by XAdapter._bearer_token."""
    return {"bearer_token": bearer_token}


def _mock_upload_response(media_id: str = "123456789") -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"media_id_string": media_id}
    return resp


def _mock_publish_response(post_id: str = "tweet-abc") -> MagicMock:
    resp = MagicMock()
    resp.status_code = 201
    resp.json.return_value = {"data": {"id": post_id}}
    return resp


# ---------------------------------------------------------------------------
# upload_media tests
# ---------------------------------------------------------------------------


def test_upload_media_returns_media_id():
    adapter = XAdapter()
    connection = _connection()

    with patch("httpx.post", return_value=_mock_upload_response("99887766")) as mock_post:
        result = adapter.upload_media(connection, b"fake-image-bytes")

    assert isinstance(result, MediaUploadResult)
    assert result.success is True
    assert result.media_id == "99887766"
    mock_post.assert_called_once()


def test_upload_media_failure_returns_error():
    adapter = XAdapter()
    connection = _connection()

    bad_response = MagicMock()
    bad_response.status_code = 403
    bad_response.json.return_value = {}

    with patch("httpx.post", return_value=bad_response):
        result = adapter.upload_media(connection, b"fake-image-bytes")

    assert result.success is False
    assert "403" in result.error


def test_upload_media_missing_token():
    adapter = XAdapter()
    result = adapter.upload_media({"bearer_token": ""}, b"data")
    assert result.success is False
    assert "Missing bearer token" in result.error


# ---------------------------------------------------------------------------
# publish tests
# ---------------------------------------------------------------------------


def test_publish_text_only_success():
    adapter = XAdapter()
    connection = _connection()

    with patch("httpx.post", return_value=_mock_publish_response("tweet-1")) as mock_post:
        result = adapter.publish(connection, {"text": "Hello X!"})

    assert isinstance(result, PublishResult)
    assert result.success is True
    assert result.external_post_id == "tweet-1"
    # Verify media key was NOT sent
    call_kwargs = mock_post.call_args.kwargs
    assert "media" not in call_kwargs.get("json", {})


def test_publish_with_media_id_attaches_media():
    adapter = XAdapter()
    connection = _connection()

    with patch("httpx.post", return_value=_mock_publish_response("tweet-2")) as mock_post:
        result = adapter.publish(
            connection,
            {"text": "With image", "media_id": "99887766"},
        )

    assert result.success is True
    assert result.external_post_id == "tweet-2"
    payload = mock_post.call_args.kwargs["json"]
    assert payload["media"] == {"media_ids": ["99887766"]}


def test_publish_failure_returns_error():
    adapter = XAdapter()
    connection = _connection()

    bad_response = MagicMock()
    bad_response.status_code = 429
    bad_response.json.return_value = {}

    with patch("httpx.post", return_value=bad_response):
        result = adapter.publish(connection, {"text": "Rate limited"})

    assert result.success is False
    assert "429" in result.error


def test_publish_missing_token():
    adapter = XAdapter()
    result = adapter.publish({"bearer_token": ""}, {"text": "Hello"})
    assert result.success is False
    assert "Missing bearer token" in result.error


# ---------------------------------------------------------------------------
# Upload-then-publish sequence: both share same publish attempt
# ---------------------------------------------------------------------------


def test_upload_before_publish_sequence():
    """Media must be uploaded before posting; media_id threads into publish."""
    adapter = XAdapter()
    connection = _connection()

    with patch("httpx.post") as mock_post:
        mock_post.side_effect = [
            _mock_upload_response("MEDIA_111"),
            _mock_publish_response("TWEET_222"),
        ]

        upload_result = adapter.upload_media(connection, b"image-data")
        assert upload_result.success is True
        assert upload_result.media_id == "MEDIA_111"

        publish_result = adapter.publish(
            connection,
            {
                "text": "Check this out",
                "media_id": upload_result.media_id,
                "idempotency_key": "unique-key-abc",
            },
        )

    assert publish_result.success is True
    assert publish_result.external_post_id == "TWEET_222"

    # Two HTTP calls: upload, then publish
    assert mock_post.call_count == 2

    # First call was to upload endpoint
    first_call_url = mock_post.call_args_list[0].args[0] if mock_post.call_args_list[0].args else mock_post.call_args_list[0].kwargs.get("url", "")
    assert "media/upload" in first_call_url or "upload.twitter.com" in str(mock_post.call_args_list[0])

    # Publish payload carried the media_id
    publish_payload = mock_post.call_args_list[1].kwargs["json"]
    assert publish_payload["media"]["media_ids"] == ["MEDIA_111"]


# ---------------------------------------------------------------------------
# get_capabilities
# ---------------------------------------------------------------------------


def test_get_capabilities_returns_x_dict():
    adapter = XAdapter()
    caps = adapter.get_capabilities()

    assert caps["network"] == "x"
    assert caps["max_images"] == 1
    assert caps["text_max_chars"] == 280
    assert caps["supports_text"] is True
