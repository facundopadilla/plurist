# pyright: reportAttributeAccessIssue=false

from django.db import transaction
from ninja import Router, Schema
from ninja.errors import HttpError
from apps.accounts.session_auth import session_auth as django_auth

from apps.accounts.auth import get_membership, require_publisher_capabilities
from apps.posts.models import DraftPost
from apps.publishing.models import PublishAttempt
from apps.publishing.tasks import execute_publish

router = Router(tags=["publishing"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class PublishAttemptOut(Schema):
    id: int
    network: str
    status: str
    external_post_id: str
    error_message: str
    idempotency_key: str


class PublishNowOut(Schema):
    post_id: int
    post_status: str
    attempts: list[PublishAttemptOut]


# ---------------------------------------------------------------------------
# Internal helper (also called from posts.api)
# ---------------------------------------------------------------------------


def _do_publish_now(
    post: DraftPost,
    actor,
    idempotency_key: str = "",
) -> list[PublishAttempt]:
    """Idempotent publish: create PublishAttempt rows per network and enqueue tasks.

    If idempotency_key is provided and attempts already exist for this
    (post, idempotency_key) pair, return those existing attempts without
    creating new ones or re-enqueueing.
    """
    # Idempotency check: if attempts already exist for this key, return them.
    if idempotency_key:
        existing = list(
            PublishAttempt.objects.filter(
                draft_post=post,
                idempotency_key=idempotency_key,
            )
        )
        if existing:
            return existing

    snapshot = getattr(post, "approved_snapshot", None)
    if snapshot is None:
        raise HttpError(400, "No approved snapshot found for post")

    target_networks = list(post.target_networks or [])
    if not target_networks:
        raise HttpError(400, "Post has no target networks")

    attempts: list[PublishAttempt] = []

    with transaction.atomic():
        # Transition post to publishing.
        try:
            post.start_publishing(actor)
        except Exception as exc:
            raise HttpError(400, str(exc))

        for network in target_networks:
            attempt = PublishAttempt.objects.create(
                draft_post=post,
                approved_snapshot=snapshot,
                network=network,
                idempotency_key=idempotency_key,
            )
            attempts.append(attempt)

        # Enqueue tasks after DB commit so Celery sees the rows.
        for attempt in attempts:
            transaction.on_commit(
                lambda aid=attempt.pk: execute_publish.delay(aid)
            )

    return attempts


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/publish-now/{post_id}", auth=django_auth, response={202: PublishNowOut})
def publish_now(request, post_id: int):
    """Idempotent immediate publish for an approved post (Owner/Publisher only)."""
    membership = require_publisher_capabilities(request)

    post = DraftPost.objects.filter(
        pk=post_id, workspace=membership.workspace
    ).first()
    if not post:
        raise HttpError(404, "Post not found")

    idempotency_key = request.headers.get("Idempotency-Key", "")

    # Idempotency check before status guard: if we already have attempts for
    # this key, return them even if post has moved beyond approved.
    if idempotency_key:
        existing = list(
            PublishAttempt.objects.filter(
                draft_post=post,
                idempotency_key=idempotency_key,
            )
        )
        if existing:
            post.refresh_from_db()
            return 202, PublishNowOut(
                post_id=post.pk,
                post_status=post.status,
                attempts=[
                    PublishAttemptOut(
                        id=a.pk,
                        network=a.network,
                        status=a.status,
                        external_post_id=a.external_post_id,
                        error_message=a.error_message,
                        idempotency_key=a.idempotency_key,
                    )
                    for a in existing
                ],
            )

    if post.status != DraftPost.Status.APPROVED:
        raise HttpError(400, "Post must be in approved status to publish")

    attempts = _do_publish_now(post, actor=request.user, idempotency_key=idempotency_key)

    post.refresh_from_db()

    return 202, PublishNowOut(
        post_id=post.pk,
        post_status=post.status,
        attempts=[
            PublishAttemptOut(
                id=a.pk,
                network=a.network,
                status=a.status,
                external_post_id=a.external_post_id,
                error_message=a.error_message,
                idempotency_key=a.idempotency_key,
            )
            for a in attempts
        ],
    )
