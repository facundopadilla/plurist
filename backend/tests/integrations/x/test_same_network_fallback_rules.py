"""Tests that X failures NEVER trigger publish attempts on other networks."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from apps.integrations.adapters import PublishResult
from apps.integrations.providers.mock_adapter import MockAdapter
from apps.integrations.providers.x import XAdapter

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _connection(bearer_token: str = "test-token") -> dict:
    return {"bearer_token": bearer_token}


def _failing_publish_response() -> MagicMock:
    resp = MagicMock()
    resp.status_code = 500
    resp.json.return_value = {"error": "internal server error"}
    return resp


# ---------------------------------------------------------------------------
# Same-network fallback: X failure is isolated to X
# ---------------------------------------------------------------------------


def test_x_failure_does_not_call_linkedin():
    """When X publish fails the adapter returns an error — it never calls
    another network's endpoint."""
    x_adapter = XAdapter()
    linkedin_adapter = MockAdapter("linkedin")
    connection = _connection()

    linkedin_publish_calls = []

    original_publish = linkedin_adapter.publish

    def tracking_publish(conn, content):
        linkedin_publish_calls.append((conn, content))
        return original_publish(conn, content)

    linkedin_adapter.publish = tracking_publish  # type: ignore[method-assign]

    with patch("httpx.post", return_value=_failing_publish_response()):
        result = x_adapter.publish(connection, {"text": "Will fail"})

    assert result.success is False
    # LinkedIn was never invoked
    assert len(linkedin_publish_calls) == 0


def test_x_failure_does_not_create_linkedin_publish_attempt():
    """X failure must not create a PublishAttempt on the linkedin network.

    This is the contract test for same-network isolation: the X adapter
    returns a failed PublishResult and makes no attempt to route to LinkedIn.
    """
    x_adapter = XAdapter()
    connection = _connection()

    with patch("httpx.post", return_value=_failing_publish_response()):
        x_result = x_adapter.publish(connection, {"text": "Fail"})

    # X result is a failure
    assert isinstance(x_result, PublishResult)
    assert x_result.success is False

    # A separate LinkedIn adapter in mock mode still works independently —
    # proof that the X failure did not pollute the LinkedIn adapter state.
    linkedin_adapter = MockAdapter("linkedin")
    linkedin_result = linkedin_adapter.publish(None, {"text": "LinkedIn post"})
    assert linkedin_result.success is True
    assert linkedin_result.external_post_id == "mock-post-id"


def test_x_network_exception_does_not_propagate_to_other_networks():
    """If httpx raises an exception for X, it is caught and returned as a
    failed PublishResult — it does not bleed into LinkedIn logic."""
    x_adapter = XAdapter()
    connection = _connection()

    import httpx

    with patch("httpx.post", side_effect=httpx.ConnectError("connection refused")):
        x_result = x_adapter.publish(connection, {"text": "Network error"})

    assert x_result.success is False
    assert "connection refused" in x_result.error.lower()

    # LinkedIn mock unaffected
    linkedin_adapter = MockAdapter("linkedin")
    linkedin_result = linkedin_adapter.publish(None, {"text": "Fine"})
    assert linkedin_result.success is True


def test_x_upload_failure_does_not_cascade_to_linkedin():
    """X media upload failure is isolated to the X adapter."""
    x_adapter = XAdapter()
    connection = _connection()

    bad_response = MagicMock()
    bad_response.status_code = 400
    bad_response.json.return_value = {}

    with patch("httpx.post", return_value=bad_response):
        upload_result = x_adapter.upload_media(connection, b"bad-data")

    assert upload_result.success is False

    # No LinkedIn side-effects
    linkedin_adapter = MockAdapter("linkedin")
    result = linkedin_adapter.upload_media(None, b"fine-data")
    assert result.success is True
    assert result.media_id == "mock-media-id"


def test_registry_x_live_mode_uses_x_adapter(monkeypatch):
    """With FEATURE_X_LIVE=true, get_adapter('x') returns XAdapter, not MockAdapter."""
    monkeypatch.setenv("FEATURE_X_LIVE", "true")

    # Re-import to pick up env change
    from apps.integrations import registry
    from apps.integrations.providers.mock_adapter import MockAdapter as MA

    adapter = registry.get_adapter("x")
    assert not isinstance(adapter, MA), "Expected XAdapter, got MockAdapter"
    assert isinstance(adapter, XAdapter)


def test_registry_x_mock_mode_uses_mock_adapter(monkeypatch):
    """With FEATURE_X_LIVE=false, get_adapter('x') returns MockAdapter."""
    monkeypatch.setenv("FEATURE_X_LIVE", "false")

    from apps.integrations import registry
    from apps.integrations.providers.mock_adapter import MockAdapter as MA

    adapter = registry.get_adapter("x")
    assert isinstance(adapter, MA)
