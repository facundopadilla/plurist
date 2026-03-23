import json

from django.test import Client


def test_health_returns_ok():
    client = Client()
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = json.loads(response.content)
    assert data == {"status": "ok"}


def test_health_content_type_is_json():
    client = Client()
    response = client.get("/api/v1/health")
    assert "application/json" in response.headers.get("Content-Type", "")
