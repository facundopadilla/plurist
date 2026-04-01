"""Tests for TokenVault encrypt/decrypt."""

from __future__ import annotations

import pytest

from apps.integrations.crypto import TokenVault


def test_encrypt_returns_non_empty_string():
    result = TokenVault.encrypt({"access_token": "tok123"})
    assert isinstance(result, str)
    assert len(result) > 0


def test_encrypt_is_not_plaintext():
    data = {"access_token": "supersecret"}
    cipher = TokenVault.encrypt(data)
    assert "supersecret" not in cipher


def test_decrypt_roundtrip():
    data = {
        "access_token": "my_token",
        "refresh_token": "refresh_123",
        "expires_at": 9999999999,
    }
    cipher = TokenVault.encrypt(data)
    recovered = TokenVault.decrypt(cipher)
    assert recovered == data


def test_encrypt_produces_different_ciphertexts_for_same_input():
    # Fernet uses a random IV — same plaintext should produce different ciphertexts.
    data = {"access_token": "tok"}
    c1 = TokenVault.encrypt(data)
    c2 = TokenVault.encrypt(data)
    assert c1 != c2


def test_decrypt_invalid_raises():
    with pytest.raises(Exception):
        TokenVault.decrypt("not-a-valid-fernet-token")


def test_roundtrip_with_empty_dict():
    cipher = TokenVault.encrypt({})
    assert TokenVault.decrypt(cipher) == {}
