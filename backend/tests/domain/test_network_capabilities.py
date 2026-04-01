import pytest
from django.core.exceptions import ValidationError

from apps.meta.capabilities import NETWORK_CAPABILITIES, validate_publish_payload

pytestmark = pytest.mark.django_db


def test_capabilities_endpoint_returns_three_networks(client):
    response = client.get("/api/v1/meta/network-capabilities")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert {item["network"] for item in data} == {"linkedin", "x", "instagram"}


def test_instagram_requires_image():
    assert NETWORK_CAPABILITIES["instagram"]["requires_image"] is True


def test_linkedin_does_not_require_image():
    assert NETWORK_CAPABILITIES["linkedin"]["requires_image"] is False


def test_x_does_not_require_image():
    assert NETWORK_CAPABILITIES["x"]["requires_image"] is False


def test_instagram_text_only_rejected():
    with pytest.raises(ValidationError):
        validate_publish_payload(network="instagram", body_text="Caption only", has_image=False)
