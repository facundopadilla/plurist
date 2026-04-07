"""
Tests for the chat_service module (canvas compose streaming).
"""

from django.test import TestCase

from apps.generation.chat_service import (
    _extract_element_patch,
    _extract_html_blocks,
    stream_chat,
)


class ExtractHtmlBlocksTest(TestCase):
    def test_no_markers_no_html_returns_empty(self):
        text = "This is plain text with no HTML."
        blocks = _extract_html_blocks(text)
        self.assertEqual(blocks, [])

    def test_no_markers_with_html_returns_slide_0(self):
        html = "<div>Hello world</div>"
        blocks = _extract_html_blocks(html)
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]["slide_index"], 0)
        self.assertIn("<div>", blocks[0]["html"])

    def test_slide_start_end_markers_extracted(self):
        text = (
            "<!-- SLIDE_START 0 -->"
            "<div>Slide zero content</div>"
            "<!-- SLIDE_END -->"
            "<!-- SLIDE_START 1 -->"
            "<div>Slide one content</div>"
            "<!-- SLIDE_END -->"
        )
        blocks = _extract_html_blocks(text)
        self.assertEqual(len(blocks), 2)
        self.assertEqual(blocks[0]["slide_index"], 0)
        self.assertIn("Slide zero", blocks[0]["html"])
        self.assertEqual(blocks[1]["slide_index"], 1)
        self.assertIn("Slide one", blocks[1]["html"])

    def test_single_slide_marker(self):
        text = "<!-- SLIDE_START 2 --><section>Content</section><!-- SLIDE_END -->"
        blocks = _extract_html_blocks(text)
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]["slide_index"], 2)
        self.assertIn("<section>", blocks[0]["html"])

    def test_no_markers_with_existing_slides_uses_default_index(self):
        blocks = _extract_html_blocks("<div>New slide</div>", default_index=3)

        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]["slide_index"], 3)

    def test_markdown_html_blocks_increment_from_default_index(self):
        text = "```html\n<div>One</div>\n```\n```html\n<div>Two</div>\n```"
        blocks = _extract_html_blocks(text, default_index=4)

        self.assertEqual([block["slide_index"] for block in blocks], [4, 5])


class ExtractElementPatchTest(TestCase):
    def test_extracts_raw_json_element_patch(self):
        patch = _extract_element_patch(
            '{"type":"element_patch","slideIndex":1,"cssPath":"section > h2","updatedOuterHtml":"<h2>Nuevo</h2>"}'
        )

        self.assertEqual(
            patch,
            {
                "slide_index": 1,
                "css_path": "section > h2",
                "updated_outer_html": "<h2>Nuevo</h2>",
            },
        )

    def test_extracts_json_patch_inside_code_fence(self):
        patch = _extract_element_patch(
            '```json\n{"type":"element_patch","slideIndex":0,"cssPath":"div > p","updatedOuterHtml":"<p>Ok</p>"}\n```'
        )

        self.assertEqual(patch["slide_index"], 0)
        self.assertEqual(patch["css_path"], "div > p")
        self.assertEqual(patch["updated_outer_html"], "<p>Ok</p>")

    def test_returns_none_for_invalid_payload(self):
        self.assertIsNone(_extract_element_patch("<div>not json</div>"))

    def test_extracts_patch_with_leading_wrapper_noise(self):
        payload = (
            "Listo, aplico el cambio.\n"
            '{"type":"element_patch","slideIndex":2,'
            '"cssPath":"section > p","updatedOuterHtml":"<p>Nuevo</p>"}'
        )
        patch = _extract_element_patch(payload)

        self.assertEqual(patch["slide_index"], 2)
        self.assertEqual(patch["css_path"], "section > p")
        self.assertEqual(patch["updated_outer_html"], "<p>Nuevo</p>")


class StreamChatTest(TestCase):
    def test_stream_yields_token_and_done_events(self):
        messages = [{"role": "user", "content": "Create a simple post"}]
        events = list(
            stream_chat(
                messages=messages,
                provider_key="openai",
                project_id=None,
                fmt="ig_square",
                network="",
            )
        )
        # Should have at least token events and a done event
        event_types = [e.split("\n")[0] for e in events if e.strip()]
        self.assertIn("event: token", event_types)
        self.assertIn("event: done", event_types)
        # done is the last event
        last_event = [e for e in events if e.strip()][-1]
        self.assertIn("event: done", last_event)

    def test_stream_error_on_unknown_provider(self):
        messages = [{"role": "user", "content": "test"}]
        events = list(
            stream_chat(
                messages=messages,
                provider_key="nonexistent_provider",
                project_id=None,
                fmt="ig_square",
                network="",
            )
        )
        self.assertEqual(len(events), 1)
        self.assertIn("event: error", events[0])

    def test_stream_error_on_empty_messages(self):
        events = list(
            stream_chat(
                messages=[],
                provider_key="openai",
                project_id=None,
                fmt="ig_square",
                network="",
            )
        )
        self.assertEqual(len(events), 1)
        self.assertIn("event: error", events[0])
        self.assertIn("No user message", events[0])

    def test_stream_with_anthropic_mock(self):
        messages = [{"role": "user", "content": "Generate a post about coffee"}]
        events = list(
            stream_chat(
                messages=messages,
                provider_key="anthropic",
                project_id=None,
                fmt="ig_square",
                network="instagram",
            )
        )
        event_types = [e.split("\n")[0] for e in events if e.strip()]
        self.assertIn("event: token", event_types)
        self.assertIn("event: done", event_types)
