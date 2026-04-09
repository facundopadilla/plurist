"""Encryption/decryption for workspace AI provider API keys.

Uses the same Fernet/PBKDF2 pattern as apps.integrations.crypto but with a
distinct salt and a separate env key (AI_ENCRYPTION_KEY), falling back to
SOCIAL_TOKEN_ENCRYPTION_KEY, and finally the Django SECRET_KEY.
"""

from __future__ import annotations

import base64
import os

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

_SALT = os.environ.get("AI_KEY_SALT", "plurist-ai-keys").encode()


def _build_fernet() -> Fernet:
    raw_key = os.environ.get("AI_ENCRYPTION_KEY") or os.environ.get("SOCIAL_TOKEN_ENCRYPTION_KEY") or _django_secret()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=100_000,
    )
    derived = kdf.derive(raw_key.encode())
    return Fernet(base64.urlsafe_b64encode(derived))


def _django_secret() -> str:
    try:
        from django.conf import settings
        from django.core.exceptions import ImproperlyConfigured
    except ImportError as exc:
        raise RuntimeError("No encryption key available for AIKeyVault") from exc
    try:
        return settings.SECRET_KEY
    except (ImproperlyConfigured, AttributeError) as exc:
        raise RuntimeError("No encryption key available for AIKeyVault") from exc


class AIKeyVault:
    """Encrypt/decrypt AI provider API keys stored in WorkspaceAISettings."""

    @staticmethod
    def encrypt(plaintext: str) -> str:
        """Return Fernet-encrypted ciphertext for *plaintext*."""
        if not plaintext:
            return ""
        f = _build_fernet()
        return f.encrypt(plaintext.encode()).decode()

    @staticmethod
    def decrypt(ciphertext: str) -> str:
        """Return the original plaintext for *ciphertext*.

        Returns empty string when *ciphertext* is empty so callers can treat
        an absent key as an empty string without special-casing.
        """
        if not ciphertext:
            return ""
        f = _build_fernet()
        return f.decrypt(ciphertext.encode()).decode()
