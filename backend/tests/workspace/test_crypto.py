"""Tests for AIKeyVault encrypt/decrypt (workspace crypto)."""

from __future__ import annotations

import pytest

from apps.workspace.crypto import AIKeyVault


def test_encrypt_returns_non_empty_string():
    result = AIKeyVault.encrypt("sk-test-key-123")
    assert isinstance(result, str)
    assert len(result) > 0


def test_encrypt_is_not_plaintext():
    plaintext = "sk-supersecret-key"
    cipher = AIKeyVault.encrypt(plaintext)
    assert plaintext not in cipher


def test_decrypt_roundtrip():
    plaintext = "sk-openai-abc123xyz"
    cipher = AIKeyVault.encrypt(plaintext)
    recovered = AIKeyVault.decrypt(cipher)
    assert recovered == plaintext


def test_encrypt_empty_string_returns_empty():
    assert AIKeyVault.encrypt("") == ""


def test_decrypt_empty_string_returns_empty():
    assert AIKeyVault.decrypt("") == ""


def test_encrypt_produces_different_ciphertexts_for_same_input():
    """Fernet uses a random IV — same plaintext should produce different ciphertexts."""
    plaintext = "same-key"
    c1 = AIKeyVault.encrypt(plaintext)
    c2 = AIKeyVault.encrypt(plaintext)
    assert c1 != c2


def test_decrypt_invalid_raises():
    with pytest.raises(Exception):
        AIKeyVault.decrypt("not-a-valid-fernet-token")
