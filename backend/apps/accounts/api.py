# pyright: reportAttributeAccessIssue=false

import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from ninja import Router, Schema
from ninja.errors import HttpError

from .auth import (
    MEMBERSHIP_REQUIRED_DETAIL,
    get_membership,
    require_owner,
)
from .models import (
    Invite,
    Membership,
    OIDCProvider,
    OIDCProviderChoices,
    RoleChoices,
    User,
    Workspace,
)
from .oidc import oauth
from .session_auth import session_auth as django_auth

router = Router(tags=["auth"])

GOOGLE_OIDC_SESSION_STATE_KEY = "google_oidc_state"
GOOGLE_OIDC_SESSION_VERIFIER_KEY = "google_oidc_code_verifier"


class LoginIn(Schema):
    email: str
    password: str


class UserOut(Schema):
    email: str
    name: str
    role: str | None = None


class MemberOut(Schema):
    email: str
    name: str
    role: str


class CreateInviteIn(Schema):
    email: str
    role: RoleChoices
    expires_in_days: int = 7


class InviteOut(Schema):
    email: str
    role: str
    token: str
    accepted: bool
    expires_at: str


class AcceptInviteIn(Schema):
    name: str
    password: str
    confirm_password: str | None = None


def _workspace():
    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, "Workspace not bootstrapped")
    return workspace


def _issue_csrf_token(request):
    token = request.session.get("csrf_token")
    if not token:
        token = secrets.token_hex(16)
        request.session["csrf_token"] = token
        request.session.modified = True
    return token


def _require_csrf(request):
    token = request.session.get("csrf_token")
    header = request.headers.get("x-csrf-token") or request.META.get("HTTP_X_CSRF_TOKEN")
    if not token or not header or token != header:
        raise HttpError(403, "CSRF Failed")


def _google_email_domain(email: str) -> str:
    parsed = email.rsplit("@", 1)
    return parsed[1].lower() if len(parsed) == 2 else ""


def _is_google_domain_allowed(email: str) -> bool:
    if not settings.GOOGLE_ALLOWED_DOMAINS:
        return True
    return _google_email_domain(email) in settings.GOOGLE_ALLOWED_DOMAINS


def _google_oidc_callback_uri(request) -> str:
    return request.build_absolute_uri("/api/v1/auth/google/callback")


def _google_login_redirect_response(request, user: User):
    login(request, user)
    return HttpResponseRedirect("/")


def _membership_or_logout(request):
    membership = get_membership(request)
    if membership:
        return membership

    logout(request)
    raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)


@router.get("/google/start")
def google_start(request):
    state = secrets.token_urlsafe(24)
    code_verifier = secrets.token_urlsafe(64)
    request.session[GOOGLE_OIDC_SESSION_STATE_KEY] = state
    request.session[GOOGLE_OIDC_SESSION_VERIFIER_KEY] = code_verifier
    request.session.modified = True

    return oauth.google.authorize_redirect(
        request,
        _google_oidc_callback_uri(request),
        state=state,
        code_verifier=code_verifier,
        code_challenge_method="S256",
    )


@router.get("/google/callback")
@transaction.atomic
def google_callback(request):
    incoming_state = request.GET.get("state", "")
    expected_state = request.session.pop(GOOGLE_OIDC_SESSION_STATE_KEY, None)
    code_verifier = request.session.pop(GOOGLE_OIDC_SESSION_VERIFIER_KEY, None)
    request.session.modified = True

    if not expected_state or not code_verifier or incoming_state != expected_state:
        raise HttpError(400, "Invalid Google authentication state")

    token = oauth.google.authorize_access_token(request, code_verifier=code_verifier)
    userinfo = token.get("userinfo") or {}

    subject_id = str(userinfo.get("sub", "")).strip()
    email = str(userinfo.get("email", "")).strip().lower()
    email_verified = userinfo.get("email_verified") is True
    display_name = str(userinfo.get("name", "")).strip()

    if not subject_id or not email:
        raise HttpError(400, "Invalid Google user info")

    existing_provider = (
        OIDCProvider.objects.select_related("user")
        .filter(
            provider=OIDCProviderChoices.GOOGLE,
            subject_id=subject_id,
        )
        .first()
    )
    if existing_provider:
        return _google_login_redirect_response(request, existing_provider.user)

    if not _is_google_domain_allowed(email):
        raise HttpError(403, "An invite is required to join this workspace")

    existing_user = User.objects.filter(email=email).first()
    if existing_user and email_verified:
        user_provider, created = OIDCProvider.objects.get_or_create(
            provider=OIDCProviderChoices.GOOGLE,
            user=existing_user,
            defaults={"subject_id": subject_id},
        )
        if not created and user_provider.subject_id != subject_id:
            raise HttpError(403, "An invite is required to join this workspace")
        return _google_login_redirect_response(request, existing_user)

    valid_invite = (
        Invite.objects.select_for_update()
        .filter(
            email=email,
            accepted=False,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )

    if valid_invite:
        if existing_user:
            raise HttpError(403, "An invite is required to join this workspace")

        user = User.objects.create_user(
            email=email,
            password=secrets.token_urlsafe(32),
            name=display_name,
        )
        Membership.objects.create(
            user=user,
            workspace=valid_invite.workspace,
            role=valid_invite.role,
        )
        OIDCProvider.objects.create(
            provider=OIDCProviderChoices.GOOGLE,
            subject_id=subject_id,
            user=user,
        )
        valid_invite.accepted = True
        valid_invite.save(update_fields=["accepted"])
        return _google_login_redirect_response(request, user)

    raise HttpError(403, "An invite is required to join this workspace")


@router.post("/login")
def login_view(request, payload: LoginIn):
    user = authenticate(request, username=payload.email, password=payload.password)
    if not user:
        raise HttpError(401, "Invalid credentials")

    _require_csrf(request)

    login(request, user)
    membership = _membership_or_logout(request)
    return {
        "email": user.email,
        "name": user.name,
        "role": membership.role,
    }


@router.post("/logout", auth=django_auth)
def logout_view(request):
    _require_csrf(request)
    logout(request)
    return {"ok": True}


@router.get("/me")
def me(request):
    csrf_token = _issue_csrf_token(request)
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
    membership = _membership_or_logout(request)
    return {
        "email": request.user.email,
        "name": request.user.name,
        "role": membership.role,
        "csrf_token": csrf_token,
    }


@router.get("/csrf")
def csrf(request):
    return {"ok": True, "csrf_token": _issue_csrf_token(request)}


@router.get("/members", auth=django_auth, response=list[MemberOut])
def list_members(request):
    owner_membership = require_owner(request)
    members = (
        Membership.objects.select_related("user").filter(workspace=owner_membership.workspace).order_by("user__email")
    )
    return [MemberOut(email=m.user.email, name=m.user.name, role=m.role) for m in members]


@router.post("/invites", auth=django_auth, response={201: InviteOut})
def create_invite(request, payload: CreateInviteIn):
    _require_csrf(request)
    owner_membership = require_owner(request)

    if payload.role == RoleChoices.OWNER:
        raise HttpError(400, "Invites cannot grant owner role")

    invite = Invite.objects.create(
        email=payload.email,
        workspace=owner_membership.workspace,
        role=payload.role,
        token=Invite.generate_token(),
        invited_by=request.user,
        expires_at=timezone.now() + timedelta(days=payload.expires_in_days),
    )
    return 201, InviteOut(
        email=invite.email,
        role=invite.role,
        token=invite.token,
        accepted=invite.accepted,
        expires_at=invite.expires_at.isoformat(),
    )


@router.get("/invites", auth=django_auth, response=list[InviteOut])
def list_invites(request):
    owner_membership = require_owner(request)
    invites = Invite.objects.filter(
        workspace=owner_membership.workspace,
        accepted=False,
    ).order_by("-created_at")
    return [
        InviteOut(
            email=i.email,
            role=i.role,
            token=i.token,
            accepted=i.accepted,
            expires_at=i.expires_at.isoformat(),
        )
        for i in invites
    ]


@router.delete("/invites/{token}", auth=django_auth)
def revoke_invite(request, token: str):
    _require_csrf(request)
    owner_membership = require_owner(request)
    deleted, _ = Invite.objects.filter(
        token=token,
        workspace=owner_membership.workspace,
        accepted=False,
    ).delete()
    if not deleted:
        raise HttpError(404, "Invite not found")
    return {"ok": True}


@router.post("/invites/{token}/accept")
@transaction.atomic
def accept_invite(request, token: str, payload: AcceptInviteIn):
    _require_csrf(request)
    if payload.confirm_password is not None and payload.confirm_password != payload.password:
        raise HttpError(400, "Passwords do not match")

    invite = Invite.objects.select_for_update().filter(token=token).first()
    if not invite or invite.accepted:
        raise HttpError(404, "Invite not found")
    if invite.is_expired():
        raise HttpError(400, "Invite expired")

    if User.objects.filter(email=invite.email).exists():
        raise HttpError(400, "User already exists")

    user = User.objects.create_user(
        email=invite.email,
        password=payload.password,
        name=payload.name,
    )
    Membership.objects.create(user=user, workspace=invite.workspace, role=invite.role)
    invite.accepted = True
    invite.save(update_fields=["accepted"])
    return {"ok": True}


@router.post("/dev-seed")
def dev_seed(request):
    _require_csrf(request)
    if not settings.DEBUG:
        raise HttpError(404, "Not found")

    workspace, _ = Workspace.objects.get_or_create(
        pk=1,
        defaults={"name": "Socialclaw"},
    )

    accounts = [
        ("owner@example.com", "Owner", RoleChoices.OWNER),
        ("editor@example.com", "Editor", RoleChoices.EDITOR),
        ("publisher@example.com", "Publisher", RoleChoices.PUBLISHER),
    ]

    for email, name, role in accounts:
        user, created = User.objects.get_or_create(email=email, defaults={"name": name})
        if created:
            user.set_password("testpassword123")  # nosec B106 -- dev seed endpoint, not production
            user.save(update_fields=["password"])
        Membership.objects.get_or_create(
            user=user,
            workspace=workspace,
            defaults={"role": role},
        )

    return {"ok": True}
