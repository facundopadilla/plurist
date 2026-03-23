import json

from django.test import Client


def test_openapi_json_is_reachable():
    client = Client()
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200


def test_openapi_json_contains_health_route():
    client = Client()
    response = client.get("/api/v1/openapi.json")
    schema = json.loads(response.content)
    paths = schema.get("paths", {})
    assert "/api/v1/health" in paths


def test_unknown_api_route_returns_404_json():
    client = Client()
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    assert "application/json" in response.headers.get("Content-Type", "")
