# pyright: reportArgumentType=false
"""
Brand-profile curation and versioning logic.

BrandProfileVersion lives in apps.posts.models (created in Task 6).
This module provides:
- The curated profile schema for MVP
- Curation logic to promote extracted design-bank sources into a new version
- Template mapping contract that converts a BrandProfileVersion into trusted template inputs
"""

from django.db import transaction
from django.core.exceptions import ValidationError

from apps.accounts.models import Workspace
from apps.posts.models import BrandProfileVersion


# ---------------------------------------------------------------------------
# MVP curated profile schema — every field is optional so versions
# can be incrementally built.  The schema is enforced at API level.
# ---------------------------------------------------------------------------

CURATED_PROFILE_FIELDS = {
    "brand_name": str,
    "voice_notes": str,
    "logo_asset_keys": list,       # list of storage keys
    "icon_asset_keys": list,       # optional icon assets
    "primary_color": str,          # hex e.g. "#1a1a1a"
    "secondary_color": str,
    "neutral_color": str,
    "accent_color": str,
    "approved_fonts": list,        # list of font family names
    "slogans": list,               # key slogans / taglines
    "imagery_references": list,    # storage keys or descriptions
}


def validate_profile_data(data: dict) -> dict:
    """Validate and sanitize profile_data against the MVP schema.
    Returns only recognized fields with correct types."""
    cleaned = {}
    for field, expected_type in CURATED_PROFILE_FIELDS.items():
        if field in data:
            value = data[field]
            if expected_type == list and isinstance(value, list):
                cleaned[field] = value
            elif expected_type == str and isinstance(value, str):
                cleaned[field] = value
            elif value is not None:
                raise ValidationError(
                    f"Field '{field}' must be {expected_type.__name__}, got {type(value).__name__}"
                )
    return cleaned


def create_brand_profile_version(
    workspace: Workspace,
    profile_data: dict,
    created_by,
    source_ids: list[int] | None = None,
) -> BrandProfileVersion:
    """Create a new immutable brand profile version.

    - Auto-increments version number for the workspace.
    - Validates profile_data against the curated schema.
    - Optionally links to source design-bank IDs (stored in profile_data metadata).
    """
    cleaned = validate_profile_data(profile_data)

    if source_ids:
        cleaned["_source_ids"] = source_ids

    with transaction.atomic():
        last_version = (
            BrandProfileVersion.objects.filter(workspace=workspace)
            .order_by("-version")
            .values_list("version", flat=True)
            .first()
        ) or 0

        version = BrandProfileVersion.objects.create(
            workspace=workspace,
            version=last_version + 1,
            profile_data=cleaned,
            created_by=created_by,
        )

    return version


def get_active_version(workspace: Workspace) -> BrandProfileVersion | None:
    """Return the latest (highest version number) brand profile for the workspace."""
    return (
        BrandProfileVersion.objects.filter(workspace=workspace)
        .order_by("-version")
        .first()
    )


# ---------------------------------------------------------------------------
# Template mapping contract
# ---------------------------------------------------------------------------

def map_profile_to_template_inputs(version: BrandProfileVersion) -> dict:
    """Map a BrandProfileVersion into trusted template input variables.

    This is the ONLY contract that feeds brand data into the render pipeline.
    Templates never receive raw extraction output — only curated, versioned data.
    """
    data = version.profile_data or {}
    return {
        "brand_name": data.get("brand_name", ""),
        "voice_notes": data.get("voice_notes", ""),
        "logo_asset_keys": data.get("logo_asset_keys", []),
        "icon_asset_keys": data.get("icon_asset_keys", []),
        "colors": {
            "primary": data.get("primary_color", "#000000"),
            "secondary": data.get("secondary_color", "#ffffff"),
            "neutral": data.get("neutral_color", "#888888"),
            "accent": data.get("accent_color", "#0066cc"),
        },
        "fonts": data.get("approved_fonts", []),
        "slogans": data.get("slogans", []),
        "imagery_references": data.get("imagery_references", []),
        "version_id": version.pk,
        "version_number": version.version,
    }
