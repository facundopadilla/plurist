from ninja import Router, Schema
from ninja.errors import HttpError
from apps.accounts.session_auth import session_auth as django_auth

from apps.accounts.auth import get_membership, require_owner
from apps.integrations.feature_flags import SUPPORTED_NETWORKS, get_all_flags, set_flag
from apps.integrations.registry import get_adapter
from apps.publishing.models import SocialConnection

router = Router(tags=["integrations"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ConnectionOut(Schema):
    id: int
    network: str
    display_name: str
    is_active: bool


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
# Connections endpoints
# ---------------------------------------------------------------------------


@router.get("/connections", auth=django_auth, response=list[ConnectionOut])
def list_connections(request):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    connections = SocialConnection.objects.filter(workspace=membership.workspace).order_by(
        "id"
    )
    return [
        ConnectionOut(
            id=c.id,
            network=c.network,
            display_name=c.display_name,
            is_active=c.is_active,
        )
        for c in connections
    ]


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
    return 201, ConnectionOut(
        id=connection.id,
        network=connection.network,
        display_name=connection.display_name,
        is_active=connection.is_active,
    )


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
    connection = SocialConnection.objects.filter(
        id=connection_id, workspace=membership.workspace
    ).first()
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
