import secrets
from datetime import datetime
from datetime import timezone as dt_timezone

import httpx
from django.conf import settings
from django.db import transaction
from django.http import HttpResponseRedirect
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.accounts.auth import get_membership, require_owner
from apps.accounts.session_auth import session_auth as django_auth
from apps.integrations.feature_flags import SUPPORTED_NETWORKS, get_all_flags, set_flag
from apps.integrations.registry import get_adapter
from apps.publishing.models import SocialConnection

router = Router(tags=["integrations"])

SUPPORTED_OAUTH_NETWORKS = {"x", "linkedin", "instagram"}

_STATE_KEY = "social_oauth_state_{}"
_VERIFIER_KEY = "social_oauth_verifier_{}"


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ConnectionOut(Schema):
    id: int
    network: str
    display_name: str
    is_active: bool
    provider_username: str
    status: str
    token_expires_at: str | None = None
    error_detail: str


class CreateConnectionIn(Schema):
    network: str
    display_name: str


class ConnectionStatusOut(Schema):
    id: int
    network: str
    is_active: bool
    authenticated: bool


class FeatureFlagsOut(Schema):
    linkedin: bool
    x: bool
    instagram: bool


class PatchFeatureFlagsIn(Schema):
    linkedin: bool | None = None
    x: bool | None = None
    instagram: bool | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _connection_out(c: SocialConnection) -> ConnectionOut:
    return ConnectionOut(
        id=c.id,
        network=c.network,
        display_name=c.display_name,
        is_active=c.is_active,
        provider_username=c.provider_username,
        status=c.status,
        token_expires_at=c.token_expires_at.isoformat() if c.token_expires_at else None,
        error_detail=c.error_detail,
    )


def _callback_uri(request, network: str) -> str:
    return request.build_absolute_uri(f"/api/v1/integrations/oauth/{network}/callback")


# ---------------------------------------------------------------------------
# Connections endpoints
# ---------------------------------------------------------------------------


@router.get("/connections", auth=django_auth, response=list[ConnectionOut])
def list_connections(request):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    connections = SocialConnection.objects.filter(workspace=membership.workspace).order_by("id")
    return [_connection_out(c) for c in connections]


@router.post("/connections", auth=django_auth, response={201: ConnectionOut})
def create_connection(request, payload: CreateConnectionIn):
    owner_membership = require_owner(request)
    if payload.network not in SUPPORTED_NETWORKS:
        raise HttpError(400, f"Unsupported network: {payload.network}")
    connection = SocialConnection.objects.create(
        workspace=owner_membership.workspace,
        network=payload.network,
        display_name=payload.display_name,
        created_by=request.user,
    )
    return 201, _connection_out(connection)


@router.delete("/connections/{connection_id}", auth=django_auth)
def delete_connection(request, connection_id: int):
    owner_membership = require_owner(request)
    deleted, _ = SocialConnection.objects.filter(
        id=connection_id,
        workspace=owner_membership.workspace,
    ).delete()
    if not deleted:
        raise HttpError(404, "Connection not found")
    return {"ok": True}


@router.get(
    "/connections/{connection_id}/status",
    auth=django_auth,
    response=ConnectionStatusOut,
)
def connection_status(request, connection_id: int):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    connection = SocialConnection.objects.filter(id=connection_id, workspace=membership.workspace).first()
    if not connection:
        raise HttpError(404, "Connection not found")
    adapter = get_adapter(connection.network)
    authenticated = adapter.authenticate(connection)
    return ConnectionStatusOut(
        id=connection.id,
        network=connection.network,
        is_active=connection.is_active,
        authenticated=authenticated,
    )


# ---------------------------------------------------------------------------
# Feature flags endpoints
# ---------------------------------------------------------------------------


@router.get("/feature-flags", auth=django_auth, response=FeatureFlagsOut)
def get_feature_flags(request):
    require_owner(request)
    flags = get_all_flags()
    return FeatureFlagsOut(
        linkedin=flags["linkedin"],
        x=flags["x"],
        instagram=flags["instagram"],
    )


@router.patch("/feature-flags", auth=django_auth, response=FeatureFlagsOut)
def patch_feature_flags(request, payload: PatchFeatureFlagsIn):
    require_owner(request)
    if payload.linkedin is not None:
        set_flag("linkedin", payload.linkedin)
    if payload.x is not None:
        set_flag("x", payload.x)
    if payload.instagram is not None:
        set_flag("instagram", payload.instagram)
    flags = get_all_flags()
    return FeatureFlagsOut(
        linkedin=flags["linkedin"],
        x=flags["x"],
        instagram=flags["instagram"],
    )


# ---------------------------------------------------------------------------
# OAuth flow endpoints
# ---------------------------------------------------------------------------


@router.get("/oauth/{network}/start", auth=django_auth)
def oauth_start(request, network: str):
    if network not in SUPPORTED_OAUTH_NETWORKS:
        raise HttpError(400, f"Unsupported network: {network}")
    require_owner(request)

    from apps.integrations.oauth_providers import social_oauth

    state = secrets.token_urlsafe(24)
    request.session[_STATE_KEY.format(network)] = state
    callback_uri = _callback_uri(request, network)

    if network == "x":
        code_verifier = secrets.token_urlsafe(64)
        request.session[_VERIFIER_KEY.format(network)] = code_verifier
        request.session.modified = True
        return social_oauth.x.authorize_redirect(
            request,
            callback_uri,
            state=state,
            code_verifier=code_verifier,
            code_challenge_method="S256",
        )

    request.session.modified = True
    provider = getattr(social_oauth, network)
    return provider.authorize_redirect(request, callback_uri, state=state)


@router.get("/oauth/{network}/callback")
@transaction.atomic
def oauth_callback(request, network: str):
    if network not in SUPPORTED_OAUTH_NETWORKS:
        raise HttpError(400, f"Unsupported network: {network}")

    from apps.integrations.oauth_providers import social_oauth

    incoming_state = request.GET.get("state", "")
    expected_state = request.session.pop(_STATE_KEY.format(network), None)
    request.session.modified = True

    if not expected_state or incoming_state != expected_state:
        raise HttpError(400, "Invalid OAuth state")

    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Session expired — please try again")

    callback_uri = _callback_uri(request, network)

    if network == "x":
        code_verifier = request.session.pop(_VERIFIER_KEY.format(network), None)
        request.session.modified = True
        token = social_oauth.x.authorize_access_token(request, redirect_uri=callback_uri, code_verifier=code_verifier)
    elif network == "linkedin":
        token = social_oauth.linkedin.authorize_access_token(request, redirect_uri=callback_uri)
    else:
        token = social_oauth.instagram.authorize_access_token(request, redirect_uri=callback_uri)

    access_token = token.get("access_token", "")

    if network == "x":
        resp = httpx.get(
            "https://api.twitter.com/2/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        user_data = resp.json().get("data", {})
        provider_user_id = str(user_data.get("id", ""))
        provider_username = user_data.get("username", "")
        display_name = f"@{provider_username}" if provider_username else "X account"

    elif network == "linkedin":
        resp = httpx.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        user_data = resp.json()
        provider_user_id = str(user_data.get("sub", ""))
        provider_username = user_data.get("email", "")
        display_name = user_data.get("name", "LinkedIn account")

    else:  # instagram
        # Exchange short-lived token for long-lived (60 days)
        exchange = httpx.get(
            "https://graph.facebook.com/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.INSTAGRAM_CLIENT_ID,
                "client_secret": settings.INSTAGRAM_CLIENT_SECRET,
                "fb_exchange_token": access_token,
            },
        )
        if exchange.is_success:
            ll_data = exchange.json()
            access_token = ll_data.get("access_token", access_token)
            expires_in = ll_data.get("expires_in")
            if expires_in:
                token["expires_at"] = int(datetime.now(dt_timezone.utc).timestamp()) + int(expires_in)
            token["access_token"] = access_token

        resp = httpx.get(
            "https://graph.facebook.com/me",
            params={"fields": "id,name", "access_token": access_token},
        )
        resp.raise_for_status()
        user_data = resp.json()
        provider_user_id = str(user_data.get("id", ""))
        provider_username = user_data.get("name", "")
        display_name = f"Instagram ({provider_username})" if provider_username else "Instagram account"

    connection, _ = SocialConnection.objects.get_or_create(
        workspace=membership.workspace,
        network=network,
        provider_user_id=provider_user_id,
        defaults={"display_name": display_name, "created_by": request.user},
    )
    connection.display_name = display_name
    connection.provider_username = provider_username
    connection.is_active = True
    connection.set_tokens(token)
    connection.save()

    return HttpResponseRedirect(f"/settings/redes-sociales?connected={network}")


@router.post("/oauth/{connection_id}/disconnect", auth=django_auth)
def oauth_disconnect(request, connection_id: int):
    owner_membership = require_owner(request)
    connection = SocialConnection.objects.filter(id=connection_id, workspace=owner_membership.workspace).first()
    if not connection:
        raise HttpError(404, "Connection not found")

    # Best-effort revocation
    try:
        tokens = connection.get_tokens()
        access_token = tokens.get("access_token", "")
        if access_token and connection.network == "x":
            httpx.post(
                "https://api.twitter.com/2/oauth2/revoke",
                data={"token": access_token, "token_type_hint": "access_token"},
                auth=(settings.X_CLIENT_ID, settings.X_CLIENT_SECRET),
            )
    except Exception:
        pass

    connection.credentials_enc = ""
    connection.status = SocialConnection.Status.REVOKED
    connection.is_active = False
    connection.save(update_fields=["credentials_enc", "status", "is_active"])
    return {"ok": True}
