"""Token encryption/decryption for social OAuth credentials."""

from __future__ import annotations

import base64
import json
import os

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _build_fernet() -> Fernet:
    raw_key = os.environ.get("SOCIAL_TOKEN_ENCRYPTION_KEY") or _django_secret()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"socialclaw-tokens",
        iterations=100_000,
    )
    derived = kdf.derive(raw_key.encode())
    return Fernet(base64.urlsafe_b64encode(derived))


def _django_secret() -> str:
    try:
        from django.conf import settings

        return settings.SECRET_KEY
    except Exception:
        raise RuntimeError("No encryption key available")


class TokenVault:
    """Encrypt/decrypt OAuth token payloads stored in SocialConnection.credentials_enc."""

    @staticmethod
    def encrypt(data: dict) -> str:
        f = _build_fernet()
        return f.encrypt(json.dumps(data).encode()).decode()

    @staticmethod
    def decrypt(cipher_text: str) -> dict:
        f = _build_fernet()
        return json.loads(f.decrypt(cipher_text.encode()))
