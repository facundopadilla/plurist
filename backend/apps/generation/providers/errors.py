"""
Provider error classification.

Maps raw HTTP/network exceptions from provider APIs into structured,
user-friendly error information that the frontend can display.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

# ── Error codes (stable identifiers for the frontend) ────────────────

RATE_LIMITED = "rate_limited"
QUOTA_EXCEEDED = "quota_exceeded"
AUTH_INVALID = "auth_invalid"
AUTH_MISSING = "auth_missing"
MODEL_NOT_FOUND = "model_not_found"
CONTENT_FILTERED = "content_filtered"
CONTEXT_TOO_LONG = "context_too_long"
SERVER_ERROR = "server_error"
SERVER_OVERLOADED = "server_overloaded"
NETWORK_ERROR = "network_error"
TIMEOUT = "timeout"
UNKNOWN = "unknown"

# ── Categories (for frontend styling / grouping) ─────────────────────

CATEGORY_AUTH = "auth"
CATEGORY_LIMIT = "limit"
CATEGORY_CONTENT = "content"
CATEGORY_PROVIDER = "provider"
CATEGORY_NETWORK = "network"


# ── Provider error exception ─────────────────────────────────────────


class ProviderError(Exception):
    """Structured exception carrying classified error info through the stream pipeline."""

    def __init__(
        self,
        message: str,
        code: str = UNKNOWN,
        category: str = CATEGORY_PROVIDER,
        hint: str = "",
        retryable: bool = False,
        provider: str = "",
    ) -> None:
        super().__init__(message)
        self.code = code
        self.category = category
        self.hint = hint
        self.retryable = retryable
        self.provider = provider


# ── Classification result ────────────────────────────────────────────


@dataclass(frozen=True)
class ClassifiedError:
    """Structured error information ready for the frontend."""

    code: str
    category: str
    message: str  # User-friendly message
    hint: str  # Actionable suggestion
    retryable: bool
    provider: str = ""


# ── HTTP status → error mapping ──────────────────────────────────────

_STATUS_MAP: dict[int, tuple[str, str, str, str, bool]] = {
    # (code, category, message, hint, retryable)
    401: (
        AUTH_INVALID,
        CATEGORY_AUTH,
        "Invalid API key",
        "Check your API key in Workspace Settings. It may have been revoked or is incorrect.",
        False,
    ),
    403: (
        AUTH_INVALID,
        CATEGORY_AUTH,
        "Access denied",
        "Your API key doesn't have permission for this model. Check your provider account.",
        False,
    ),
    404: (
        MODEL_NOT_FOUND,
        CATEGORY_PROVIDER,
        "Model not found",
        "The selected model doesn't exist or isn't available in your plan. Try a different model.",
        False,
    ),
    429: (
        RATE_LIMITED,
        CATEGORY_LIMIT,
        "Rate limit exceeded",
        "You've hit the API rate limit. Wait a moment and try again, or check your plan's quota.",
        True,
    ),
    402: (
        QUOTA_EXCEEDED,
        CATEGORY_LIMIT,
        "Insufficient credits",
        "Your account has run out of credits. Add billing info or upgrade your plan in the provider's dashboard.",
        False,
    ),
    # Some providers use 400 for context length / content filter issues
    400: (
        CONTENT_FILTERED,
        CATEGORY_CONTENT,
        "Request rejected",
        "The request was rejected by the provider. This may be a content policy violation or the prompt is too long.",
        False,
    ),
    408: (
        TIMEOUT,
        CATEGORY_NETWORK,
        "Request timed out",
        "The provider took too long to respond. Try again or use a faster model.",
        True,
    ),
    500: (
        SERVER_ERROR,
        CATEGORY_PROVIDER,
        "Provider server error",
        "The AI provider is experiencing issues. This is on their end — try again in a few minutes.",
        True,
    ),
    502: (
        SERVER_ERROR,
        CATEGORY_PROVIDER,
        "Provider unavailable",
        "The AI provider's server is temporarily unreachable. Try again shortly.",
        True,
    ),
    503: (
        SERVER_OVERLOADED,
        CATEGORY_PROVIDER,
        "Provider overloaded",
        "The AI provider is currently overloaded. Wait a moment and try again.",
        True,
    ),
    529: (
        SERVER_OVERLOADED,
        CATEGORY_PROVIDER,
        "Provider overloaded",
        "The AI provider is currently overloaded. Wait a moment and try again.",
        True,
    ),
}

# ── Body-based refinement (some 429s are actually quota, not rate limit) ──

_QUOTA_KEYWORDS = [
    "quota",
    "billing",
    "exceeded your current",
    "insufficient_quota",
    "RESOURCE_EXHAUSTED",
    "budget",
    "credits",
    "payment",
    "plan",
]

_CONTEXT_LENGTH_KEYWORDS = [
    "context_length",
    "token limit",
    "maximum context",
    "too many tokens",
    "max_tokens",
    "content_too_large",
]


def _refine_by_body(
    status_code: int, body: str, base: tuple[str, str, str, str, bool]
) -> tuple[str, str, str, str, bool]:
    """Refine classification using the response body text."""
    body_lower = body.lower()

    # A 429 that mentions quota/billing is actually a quota exhaustion, not a rate limit
    if status_code == 429 and any(kw in body_lower for kw in _QUOTA_KEYWORDS):
        return (
            QUOTA_EXCEEDED,
            CATEGORY_LIMIT,
            "Quota or credits exhausted",
            (
                "You've used all available tokens/credits for this provider. "
                "Check your billing dashboard or upgrade your plan."
            ),
            False,
        )

    # A 400 about context length is different from a content filter
    if status_code == 400 and any(kw in body_lower for kw in _CONTEXT_LENGTH_KEYWORDS):
        return (
            CONTEXT_TOO_LONG,
            CATEGORY_CONTENT,
            "Conversation too long",
            (
                "The conversation history exceeds the model's context window. "
                "Start a new chat or use a model with a larger context."
            ),
            False,
        )

    return base


# ── Public API ───────────────────────────────────────────────────────


def classify_provider_error(exc: Exception, provider_name: str) -> ClassifiedError:
    """Classify any provider exception into a structured error.

    Handles httpx.HTTPStatusError, httpx.TimeoutException,
    httpx.ConnectError, and generic exceptions.
    """
    # ── httpx.HTTPStatusError (4xx / 5xx from provider API) ──────
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        body = ""
        try:
            body = exc.response.text
        except Exception as read_exc:
            logger.debug("Could not read provider error response body: %s", read_exc)

        base = _STATUS_MAP.get(
            status,
            (UNKNOWN, CATEGORY_PROVIDER, f"Provider error ({status})", str(exc), status >= 500),
        )

        code, category, message, hint, retryable = _refine_by_body(status, body, base)

        logger.warning(
            "Provider %s returned HTTP %d (%s): %s",
            provider_name,
            status,
            code,
            body[:200] if body else str(exc),
        )

        return ClassifiedError(
            code=code,
            category=category,
            message=message,
            hint=hint,
            retryable=retryable,
            provider=provider_name,
        )

    # ── httpx.TimeoutException ───────────────────────────────────
    if isinstance(exc, httpx.TimeoutException):
        return ClassifiedError(
            code=TIMEOUT,
            category=CATEGORY_NETWORK,
            message="Request timed out",
            hint="The provider took too long to respond. Try again or switch to a faster model.",
            retryable=True,
            provider=provider_name,
        )

    # ── httpx.ConnectError / httpx.NetworkError ──────────────────
    if isinstance(exc, (httpx.ConnectError, httpx.NetworkError)):
        return ClassifiedError(
            code=NETWORK_ERROR,
            category=CATEGORY_NETWORK,
            message="Connection failed",
            hint="Could not reach the AI provider. Check your internet connection or try again.",
            retryable=True,
            provider=provider_name,
        )

    # ── RuntimeError from stream wrappers ────────────────────────
    if isinstance(exc, RuntimeError) and exc.__cause__:
        return classify_provider_error(exc.__cause__, provider_name)

    # ── Catch-all ────────────────────────────────────────────────
    return ClassifiedError(
        code=UNKNOWN,
        category=CATEGORY_PROVIDER,
        message="Generation failed",
        hint=str(exc)[:200],
        retryable=False,
        provider=provider_name,
    )
