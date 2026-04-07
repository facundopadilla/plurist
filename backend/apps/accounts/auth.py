from ninja.errors import HttpError

from .models import Membership, RoleChoices, Workspace

MEMBERSHIP_REQUIRED_DETAIL = "Workspace membership required"


def get_membership(request):
    if not request.user.is_authenticated:
        return None

    workspace = Workspace.objects.first()
    if workspace is None:
        return None

    return Membership.objects.filter(user=request.user, workspace=workspace).first()


def require_membership(request):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)
    return membership


def require_owner(request):
    membership = get_membership(request)
    if not membership or membership.role != RoleChoices.OWNER:
        raise HttpError(403, "Owner access required")
    return membership


def require_editor_capabilities(request):
    membership = get_membership(request)
    if not membership or membership.role not in {RoleChoices.OWNER, RoleChoices.EDITOR}:
        raise HttpError(403, "Editor access required")
    return membership
