"""Celery tasks for social OAuth token refresh."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

import httpx
from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def refresh_expiring_tokens():
    """Enqueue refresh for connections whose tokens expire within 24 hours."""
    from apps.publishing.models import SocialConnection

    cutoff = timezone.now() + timedelta(hours=24)
    ids = SocialConnection.objects.filter(
        is_active=True,
        status=SocialConnection.Status.CONNECTED,
        token_expires_at__lte=cutoff,
    ).values_list("id", flat=True)

    for conn_id in ids:
        refresh_single_connection.delay(conn_id)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def refresh_single_connection(self, connection_id: int):
    """Refresh OAuth tokens for a single SocialConnection."""
    from apps.publishing.models import SocialConnection

    try:
        connection = SocialConnection.objects.get(id=connection_id)
    except SocialConnection.DoesNotExist:
        return

    try:
        tokens = connection.get_tokens()
        if connection.network == "x":
            _refresh_x(connection, tokens.get("refresh_token", ""))
        elif connection.network == "linkedin":
            _refresh_linkedin(connection, tokens.get("refresh_token", ""))
        elif connection.network == "instagram":
            _refresh_instagram(connection, tokens.get("access_token", ""))
        connection.mark_connected()
        connection.save()
    except Exception as exc:
        logger.exception("Token refresh failed for connection %d", connection_id)
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            connection.mark_error(str(exc))
            connection.save()


def _refresh_x(connection, refresh_token: str) -> None:
    if not refresh_token:
        raise ValueError("No refresh token for X connection")
    resp = httpx.post(
        "https://api.twitter.com/2/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.X_CLIENT_ID,
        },
        auth=(settings.X_CLIENT_ID, settings.X_CLIENT_SECRET),
    )
    resp.raise_for_status()
    connection.set_tokens(resp.json())


def _refresh_linkedin(connection, refresh_token: str) -> None:
    if not refresh_token:
        raise ValueError("No refresh token for LinkedIn connection")
    resp = httpx.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "client_secret": settings.LINKEDIN_CLIENT_SECRET,
        },
    )
    resp.raise_for_status()
    connection.set_tokens(resp.json())


def _refresh_instagram(connection, access_token: str) -> None:
    if not access_token:
        raise ValueError("No access token for Instagram connection")
    resp = httpx.get(
        "https://graph.instagram.com/refresh_access_token",
        params={"grant_type": "ig_refresh_token", "access_token": access_token},
    )
    resp.raise_for_status()
    data = resp.json()
    expires_in = data.get("expires_in", 5_184_000)  # default 60 days
    connection.set_tokens(
        {
            "access_token": data["access_token"],
            "expires_at": int(datetime.now(dt_timezone.utc).timestamp()) + expires_in,
        }
    )
