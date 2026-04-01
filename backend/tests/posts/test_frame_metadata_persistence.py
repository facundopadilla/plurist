# pyright: reportAttributeAccessIssue=false

import pytest

from apps.posts.models import DraftFrameMetadata, DraftPost, DraftVariant
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _csrf(client):
    response = client.get("/api/v1/auth/csrf")
    return response.json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    return client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


def test_patch_post_persists_frame_metadata_and_variants(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor-meta@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=editor,
        title="Canvas",
    )

    _login(client, editor.email)
    response = client.patch(
        f"/api/v1/content/{post.pk}",
        data={
            "frame_metadata": [
                {
                    "slide_index": 0,
                    "name": "Hero",
                    "is_favorite": True,
                    "annotations": [
                        {
                            "id": "note-1",
                            "text": "Revisar CTA",
                            "createdAt": "2026-04-01T00:00:00Z",
                        }
                    ],
                }
            ],
            "variants": [
                {
                    "local_id": 1,
                    "slide_index": 0,
                    "provider": "openai",
                    "model_id": "gpt-4o",
                    "generated_html": "<p>Default</p>",
                    "generated_text": "",
                    "variant_type": "default",
                    "generation_meta": {},
                },
                {
                    "local_id": 2,
                    "slide_index": 0,
                    "provider": "openai",
                    "model_id": "gpt-4o",
                    "generated_html": "<p>Mobile</p>",
                    "generated_text": "",
                    "variant_type": "mobile",
                    "derived_from_local_id": 1,
                    "generation_meta": {
                        "variantType": "mobile",
                        "derivedFromVariantId": 1,
                    },
                },
            ],
        },
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )

    assert response.status_code == 200
    post.refresh_from_db()

    frame = DraftFrameMetadata.objects.get(draft_post=post, slide_index=0)
    assert frame.name == "Hero"
    assert frame.is_favorite is True
    assert frame.annotations[0]["text"] == "Revisar CTA"

    variants = list(post.variants.order_by("id"))
    assert len(variants) == 2
    assert variants[0].variant_type == "default"
    assert variants[1].variant_type == "mobile"
    assert variants[1].derived_from_variant_id == variants[0].id

    payload = response.json()
    assert payload["frame_metadata"][0]["name"] == "Hero"
    assert payload["variants"][1]["variant_type"] == "mobile"


def test_get_post_returns_persisted_metadata(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor-get-meta@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=editor,
        title="Canvas",
    )
    DraftFrameMetadata.objects.create(
        draft_post=post,
        slide_index=0,
        name="Frame cargado",
        is_favorite=True,
        annotations=[{"id": "ann-1", "text": "Nota"}],
    )
    root_variant = DraftVariant.objects.create(
        draft_post=post,
        provider="openai",
        model_id="gpt-4o",
        prompt_text="",
        generated_text="",
        generated_html="<div>Default</div>",
        slide_index=0,
        variant_type="default",
    )
    DraftVariant.objects.create(
        draft_post=post,
        provider="openai",
        model_id="gpt-4o",
        prompt_text="",
        generated_text="",
        generated_html="<div>Desktop</div>",
        slide_index=0,
        variant_type="desktop",
        derived_from_variant=root_variant,
        generation_meta={"variantType": "desktop"},
    )

    _login(client, editor.email)
    response = client.get(f"/api/v1/content/{post.pk}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["frame_metadata"][0]["is_favorite"] is True
    assert payload["variants"][1]["variant_type"] == "desktop"
    assert payload["variants"][1]["derived_from_variant_id"] == root_variant.id
