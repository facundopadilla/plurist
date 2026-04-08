"""Tests for MCP resources and prompts."""

import pytest

from apps.mcp.server import create_mcp_server


@pytest.fixture
def mcp_server():
    return create_mcp_server()


class TestResourcesRegistered:
    def test_projects_resource(self, mcp_server):
        resources = mcp_server._resource_manager.list_resources()
        uris = [str(r.uri) for r in resources]
        assert "plurist://projects" in uris

    def test_providers_resource(self, mcp_server):
        resources = mcp_server._resource_manager.list_resources()
        uris = [str(r.uri) for r in resources]
        assert "plurist://providers" in uris


class TestResourceTemplatesRegistered:
    def test_project_detail_template(self, mcp_server):
        templates = mcp_server._resource_manager.list_templates()
        uris = [str(t.uri_template) for t in templates]
        assert any("projects" in u and "{project_id}" in u for u in uris)

    def test_content_detail_template(self, mcp_server):
        templates = mcp_server._resource_manager.list_templates()
        uris = [str(t.uri_template) for t in templates]
        assert any("content" in u and "{content_id}" in u for u in uris)


class TestPromptsRegistered:
    def test_campaign_brief_prompt(self, mcp_server):
        prompts = mcp_server._prompt_manager.list_prompts()
        names = [p.name for p in prompts]
        assert "campaign_brief" in names

    def test_social_carousel_prompt(self, mcp_server):
        prompts = mcp_server._prompt_manager.list_prompts()
        names = [p.name for p in prompts]
        assert "social_carousel" in names

    def test_brand_post_prompt(self, mcp_server):
        prompts = mcp_server._prompt_manager.list_prompts()
        names = [p.name for p in prompts]
        assert "brand_post" in names

    def test_total_prompts_count(self, mcp_server):
        prompts = mcp_server._prompt_manager.list_prompts()
        assert len(prompts) == 3
