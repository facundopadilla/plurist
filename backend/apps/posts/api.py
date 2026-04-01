# pyright: reportAttributeAccessIssue=false

from django.core.exceptions import ValidationError
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.accounts.auth import (
    get_membership,
    require_editor_capabilities,
    require_owner,
    require_publisher_capabilities,
)
from apps.accounts.session_auth import session_auth as django_auth
from apps.posts.models import DraftFrameMetadata, DraftPost, DraftVariant

router = Router(tags=["posts"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class DraftPostIn(Schema):
    title: str
    body_text: str = ""
    target_networks: list[str] = []
    render_asset_key: str = ""
    project_id: int | None = None
    format: str = "1:1"
    html_content: str = ""


class DraftPostOut(Schema):
    id: int
    title: str
    body_text: str
    target_networks: list[str]
    render_asset_key: str
    project_id: int | None = None
    format: str
    html_content: str
    status: str
    submitted_at: str | None = None
    approved_at: str | None = None
    published_at: str | None = None
    failure_message: str


class FrameMetadataIn(Schema):
    slide_index: int
    name: str = ""
    is_favorite: bool = False
    annotations: list[dict] = []


class FrameMetadataOut(Schema):
    slide_index: int
    name: str
    is_favorite: bool
    annotations: list[dict]


class VariantSyncIn(Schema):
    local_id: int
    slide_index: int | None = None
    provider: str
    model_id: str = ""
    generated_html: str = ""
    generated_text: str = ""
    variant_type: str = "default"
    derived_from_local_id: int | None = None
    generation_meta: dict = {}


class VariantOut(Schema):
    id: int
    provider: str
    model_id: str
    generated_text: str
    generated_html: str
    is_selected: bool
    slide_index: int | None = None
    variant_type: str = "default"
    derived_from_variant_id: int | None = None
    generation_meta: dict = {}
    created_at: str


class DraftPostDetailOut(DraftPostOut):
    frame_metadata: list[FrameMetadataOut] = []
    variants: list[VariantOut] = []


class ReasonIn(Schema):
    reason: str = ""


class DraftPostPatchIn(Schema):
    title: str | None = None
    body_text: str | None = None
    html_content: str | None = None
    render_asset_key: str | None = None
    format: str | None = None
    target_networks: list[str] | None = None
    project_id: int | None = None
    frame_metadata: list[FrameMetadataIn] | None = None
    variants: list[VariantSyncIn] | None = None


class VariantUpdateIn(Schema):
    generated_html: str
    variant_type: str | None = None
    derived_from_variant_id: int | None = None
    generation_meta: dict | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _post_out(post: DraftPost) -> DraftPostOut:
    return DraftPostOut(
        id=post.pk,
        title=post.title,
        body_text=post.body_text,
        target_networks=list(post.target_networks or []),
        render_asset_key=post.render_asset_key,
        project_id=post.project_id,
        format=post.format or "1:1",
        html_content=post.html_content,
        status=post.status,
        submitted_at=post.submitted_at.isoformat() if post.submitted_at else None,
        approved_at=post.approved_at.isoformat() if post.approved_at else None,
        published_at=post.published_at.isoformat() if post.published_at else None,
        failure_message=post.failure_message,
    )


def _frame_metadata_out(frame: DraftFrameMetadata) -> FrameMetadataOut:
    return FrameMetadataOut(
        slide_index=frame.slide_index,
        name=frame.name,
        is_favorite=frame.is_favorite,
        annotations=list(frame.annotations or []),
    )


def _variant_out(variant: DraftVariant) -> VariantOut:
    return VariantOut(
        id=variant.pk,
        provider=variant.provider,
        model_id=variant.model_id,
        generated_text=variant.generated_text,
        generated_html=variant.generated_html,
        is_selected=variant.is_selected,
        slide_index=variant.slide_index,
        variant_type=variant.variant_type,
        derived_from_variant_id=variant.derived_from_variant_id,
        generation_meta=dict(variant.generation_meta or {}),
        created_at=variant.created_at.isoformat(),
    )


def _post_detail_out(post: DraftPost) -> DraftPostDetailOut:
    return DraftPostDetailOut(
        **_post_out(post).dict(),
        frame_metadata=[_frame_metadata_out(frame) for frame in post.frame_metadata.all()],
        variants=[_variant_out(variant) for variant in post.variants.all().order_by("slide_index", "id")],
    )


def _sync_frame_metadata(post: DraftPost, frames: list[FrameMetadataIn]) -> None:
    seen_indices: set[int] = set()
    for frame in frames:
        seen_indices.add(frame.slide_index)
        DraftFrameMetadata.objects.update_or_create(
            draft_post=post,
            slide_index=frame.slide_index,
            defaults={
                "name": frame.name,
                "is_favorite": frame.is_favorite,
                "annotations": frame.annotations,
            },
        )

    post.frame_metadata.exclude(slide_index__in=seen_indices).delete()


def _sync_variants(post: DraftPost, variants: list[VariantSyncIn]) -> None:
    post.variants.all().delete()
    local_to_variant: dict[int, DraftVariant] = {}
    deferred_links: list[tuple[DraftVariant, int]] = []

    for item in variants:
        created = DraftVariant.objects.create(
            draft_post=post,
            provider=item.provider,
            model_id=item.model_id,
            prompt_text=str((item.generation_meta or {}).get("sourcePrompt") or ""),
            generated_text=item.generated_text,
            generated_html=item.generated_html,
            slide_index=item.slide_index,
            variant_type=item.variant_type,
            generation_meta=item.generation_meta or {},
        )
        local_to_variant[item.local_id] = created
        if item.derived_from_local_id is not None:
            deferred_links.append((created, item.derived_from_local_id))

    for created, parent_local_id in deferred_links:
        parent = local_to_variant.get(parent_local_id)
        if parent:
            created.derived_from_variant = parent
            created.save(update_fields=["derived_from_variant"])


def _get_post_for_workspace(post_id: int, workspace) -> DraftPost:
    post = DraftPost.objects.filter(pk=post_id, workspace=workspace).first()
    if not post:
        raise HttpError(404, "Post not found")
    return post


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/", auth=django_auth, response=list[DraftPostOut])
def list_posts(request):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    posts = DraftPost.objects.filter(workspace=membership.workspace).order_by("-created_at")
    return [_post_out(p) for p in posts]


@router.post("/", auth=django_auth, response={201: DraftPostDetailOut})
def create_post(request, payload: DraftPostIn):
    membership = require_editor_capabilities(request)

    project = None
    if payload.project_id is not None:
        try:
            from apps.projects.models import Project

            project = Project.objects.get(pk=payload.project_id, workspace=membership.workspace)
        except Project.DoesNotExist:
            raise HttpError(404, "Project not found")

    post = DraftPost.objects.create(
        workspace=membership.workspace,
        created_by=request.user,
        title=payload.title,
        body_text=payload.body_text,
        target_networks=payload.target_networks,
        render_asset_key=payload.render_asset_key,
        project=project,
        format=payload.format,
        html_content=payload.html_content,
    )
    return 201, _post_detail_out(post)


@router.get("/{post_id}", auth=django_auth, response=DraftPostDetailOut)
def get_post(request, post_id: int):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    post = _get_post_for_workspace(post_id, membership.workspace)
    return _post_detail_out(post)


@router.post("/{post_id}/submit", auth=django_auth, response=DraftPostOut)
def submit_post(request, post_id: int):
    membership = require_editor_capabilities(request)
    post = _get_post_for_workspace(post_id, membership.workspace)
    try:
        post.submit_for_approval(request.user)
    except (ValidationError, PermissionError) as exc:
        raise HttpError(400, str(exc))
    return _post_out(post)


@router.post("/{post_id}/approve", auth=django_auth, response=DraftPostOut)
def approve_post(request, post_id: int, payload: ReasonIn):
    membership = require_owner(request)
    post = _get_post_for_workspace(post_id, membership.workspace)
    try:
        post.approve(request.user, reason=payload.reason)
    except (ValidationError, PermissionError) as exc:
        raise HttpError(400, str(exc))
    return _post_out(post)


@router.post("/{post_id}/reject", auth=django_auth, response=DraftPostOut)
def reject_post(request, post_id: int, payload: ReasonIn):
    membership = require_owner(request)
    post = _get_post_for_workspace(post_id, membership.workspace)
    try:
        post.reject(request.user, reason=payload.reason)
    except (ValidationError, PermissionError) as exc:
        raise HttpError(400, str(exc))
    return _post_out(post)


@router.post("/{post_id}/publish", auth=django_auth, response={202: DraftPostOut})
def publish_post(request, post_id: int):
    """Trigger immediate publish for an approved post (Owner/Publisher only)."""
    membership = require_publisher_capabilities(request)
    post = _get_post_for_workspace(post_id, membership.workspace)

    if post.status != DraftPost.Status.APPROVED:
        raise HttpError(400, "Post must be in approved status to publish")

    # Delegate to the publishing API's idempotent handler.
    from apps.publishing.api import _do_publish_now

    idempotency_key = request.headers.get("Idempotency-Key", "")
    _do_publish_now(post, actor=request.user, idempotency_key=idempotency_key)

    post.refresh_from_db()
    return 202, _post_out(post)


@router.get("/{post_id}/variants", auth=django_auth, response=list[VariantOut])
def list_post_variants(request, post_id: int):
    """Return all DraftVariants for a post."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    post = _get_post_for_workspace(post_id, membership.workspace)

    variants = post.variants.all().order_by("slide_index", "id")
    return [_variant_out(v) for v in variants]


@router.patch("/{post_id}", auth=django_auth, response=DraftPostDetailOut)
def patch_post(request, post_id: int, payload: DraftPostPatchIn):
    """Update editable fields on a draft post (Editor+)."""
    membership = require_editor_capabilities(request)
    post = _get_post_for_workspace(post_id, membership.workspace)

    update_fields = ["updated_at"]

    if payload.title is not None:
        post.title = payload.title
        update_fields.append("title")

    if payload.body_text is not None:
        post.body_text = payload.body_text
        update_fields.append("body_text")

    if payload.html_content is not None:
        post.html_content = payload.html_content
        update_fields.append("html_content")

    if payload.render_asset_key is not None:
        post.render_asset_key = payload.render_asset_key
        update_fields.append("render_asset_key")

    if payload.format is not None:
        post.format = payload.format
        update_fields.append("format")

    if payload.target_networks is not None:
        post.target_networks = payload.target_networks
        update_fields.append("target_networks")

    if payload.project_id is not None:
        try:
            from apps.projects.models import Project

            project = Project.objects.get(pk=payload.project_id, workspace=membership.workspace)
            post.project = project
            update_fields.append("project")
        except Project.DoesNotExist:
            raise HttpError(404, "Project not found")

    if payload.frame_metadata is not None:
        _sync_frame_metadata(post, payload.frame_metadata)

    if payload.variants is not None:
        _sync_variants(post, payload.variants)

    post.save(update_fields=update_fields)
    post.refresh_from_db()
    return _post_detail_out(post)


@router.put(
    "/{post_id}/variants/{variant_id}",
    auth=django_auth,
    response=DraftPostDetailOut,
)
def update_variant(request, post_id: int, variant_id: int, payload: VariantUpdateIn):
    """Update generated_html on a draft variant (Editor+)."""
    membership = require_editor_capabilities(request)
    post = _get_post_for_workspace(post_id, membership.workspace)

    from apps.posts.models import DraftVariant

    try:
        variant = post.variants.get(pk=variant_id)
    except DraftVariant.DoesNotExist:
        raise HttpError(404, "Variant not found")

    variant.generated_html = payload.generated_html
    update_fields = ["generated_html"]
    if payload.variant_type is not None:
        variant.variant_type = payload.variant_type
        update_fields.append("variant_type")
    if payload.derived_from_variant_id is not None:
        variant.derived_from_variant_id = payload.derived_from_variant_id
        update_fields.append("derived_from_variant")
    if payload.generation_meta is not None:
        variant.generation_meta = payload.generation_meta
        update_fields.append("generation_meta")
    variant.save(update_fields=update_fields)

    post.refresh_from_db()
    return _post_detail_out(post)
