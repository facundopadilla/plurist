import pytest
from django.core.exceptions import ValidationError

from apps.design_bank.brand_profile import (
    create_brand_profile_version,
    get_active_version,
    map_profile_to_template_inputs,
    validate_profile_data,
)
from apps.posts.models import BrandProfileVersion, DraftPost
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


# ---------------------------------------------------------------------------
# Version creation and auto-increment
# ---------------------------------------------------------------------------


class TestVersionCreation:
    def test_first_version_is_1(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        version = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme"},
            created_by=user,
        )
        assert version.version == 1

    def test_auto_increments_version(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        v1 = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme v1"},
            created_by=user,
        )
        v2 = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme v2"},
            created_by=user,
        )
        assert v1.version == 1
        assert v2.version == 2

    def test_version_is_immutable_in_db(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        v1 = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme"},
            created_by=user,
        )
        # Creating v2 does not mutate v1
        create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme Updated"},
            created_by=user,
        )
        v1.refresh_from_db()
        assert v1.profile_data["brand_name"] == "Acme"
        assert v1.version == 1

    def test_stores_source_ids_in_metadata(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        version = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme"},
            created_by=user,
            source_ids=[10, 20],
        )
        assert version.profile_data["_source_ids"] == [10, 20]


# ---------------------------------------------------------------------------
# Active version
# ---------------------------------------------------------------------------


class TestActiveVersion:
    def test_returns_latest_version(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "v1"},
            created_by=user,
        )
        v2 = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "v2"},
            created_by=user,
        )
        active = get_active_version(workspace)
        assert active is not None
        assert active.pk == v2.pk
        assert active.version == 2

    def test_returns_none_when_no_versions(self):
        workspace = WorkspaceFactory()
        assert get_active_version(workspace) is None


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


class TestValidation:
    def test_accepts_valid_fields(self):
        data = {
            "brand_name": "Acme",
            "primary_color": "#ff0000",
            "approved_fonts": ["Inter", "Roboto"],
        }
        cleaned = validate_profile_data(data)
        assert cleaned["brand_name"] == "Acme"
        assert cleaned["approved_fonts"] == ["Inter", "Roboto"]

    def test_strips_unknown_fields(self):
        data = {"brand_name": "Acme", "unknown_field": "should be ignored"}
        cleaned = validate_profile_data(data)
        assert "unknown_field" not in cleaned

    def test_rejects_wrong_type(self):
        data = {"brand_name": 12345}  # should be str
        with pytest.raises(ValidationError, match="brand_name"):
            validate_profile_data(data)


# ---------------------------------------------------------------------------
# Template mapping
# ---------------------------------------------------------------------------


class TestTemplateMapping:
    def test_maps_profile_to_template_inputs(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        version = create_brand_profile_version(
            workspace=workspace,
            profile_data={
                "brand_name": "Acme Corp",
                "primary_color": "#111111",
                "secondary_color": "#eeeeee",
                "approved_fonts": ["Inter"],
                "slogans": ["Think Different"],
            },
            created_by=user,
        )
        inputs = map_profile_to_template_inputs(version)
        assert inputs["brand_name"] == "Acme Corp"
        assert inputs["colors"]["primary"] == "#111111"
        assert inputs["fonts"] == ["Inter"]
        assert inputs["slogans"] == ["Think Different"]
        assert inputs["version_id"] == version.pk
        assert inputs["version_number"] == version.version

    def test_defaults_for_missing_fields(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        version = create_brand_profile_version(
            workspace=workspace,
            profile_data={},
            created_by=user,
        )
        inputs = map_profile_to_template_inputs(version)
        assert inputs["brand_name"] == ""
        assert inputs["colors"]["primary"] == "#000000"
        assert inputs["fonts"] == []


# ---------------------------------------------------------------------------
# Existing content keeps old version (immutability)
# ---------------------------------------------------------------------------


class TestImmutabilityWithPosts:
    def test_draft_keeps_old_version_after_new_version_created(self):
        workspace = WorkspaceFactory()
        user = UserFactory()
        MembershipFactory(user=user, workspace=workspace, role="editor")

        v1 = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme v1"},
            created_by=user,
        )

        # Create a draft referencing v1
        draft = DraftPost.objects.create(
            workspace=workspace,
            created_by=user,
            title="Test Post",
            body_text="Hello",
            brand_profile_version=v1,
        )

        # Create v2 — should NOT affect the draft
        v2 = create_brand_profile_version(
            workspace=workspace,
            profile_data={"brand_name": "Acme v2"},
            created_by=user,
        )

        draft.refresh_from_db()
        assert draft.brand_profile_version_id == v1.pk
        assert draft.brand_profile_version_id != v2.pk
        assert v1.profile_data["brand_name"] == "Acme v1"


# ---------------------------------------------------------------------------
# API tests
# ---------------------------------------------------------------------------


class TestBrandProfileAPI:
    def test_editor_can_create_version(self, client):
        workspace = WorkspaceFactory()
        editor = UserFactory(email="editor@example.com", password="testpassword123")
        MembershipFactory(user=editor, workspace=workspace, role="editor")
        _login(client, editor.email)

        response = client.post(
            "/api/v1/brand-profile/versions",
            data={
                "brand_name": "Acme",
                "primary_color": "#ff0000",
                "approved_fonts": ["Inter"],
            },
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=_csrf(client),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["version"] == 1
        assert body["profile_data"]["brand_name"] == "Acme"

    def test_publisher_cannot_create_version(self, client):
        workspace = WorkspaceFactory()
        publisher = UserFactory(email="pub@example.com", password="testpassword123")
        MembershipFactory(user=publisher, workspace=workspace, role="publisher")
        _login(client, publisher.email)

        response = client.post(
            "/api/v1/brand-profile/versions",
            data={"brand_name": "Acme"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=_csrf(client),
        )
        assert response.status_code == 403

    def test_list_versions(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="owner@example.com", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)

        # Create two versions
        client.post(
            "/api/v1/brand-profile/versions",
            data={"brand_name": "v1"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=_csrf(client),
        )
        client.post(
            "/api/v1/brand-profile/versions",
            data={"brand_name": "v2"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=_csrf(client),
        )

        response = client.get("/api/v1/brand-profile/versions")
        assert response.status_code == 200
        versions = response.json()
        assert len(versions) == 2
        assert versions[0]["version"] == 2  # newest first

    def test_get_active_version(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="owner@example.com", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)

        client.post(
            "/api/v1/brand-profile/versions",
            data={"brand_name": "Acme"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=_csrf(client),
        )

        response = client.get("/api/v1/brand-profile/versions/active")
        assert response.status_code == 200
        assert response.json()["version"] == 1

    def test_get_template_inputs(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="owner@example.com", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)

        create_resp = client.post(
            "/api/v1/brand-profile/versions",
            data={"brand_name": "Acme", "primary_color": "#123456"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=_csrf(client),
        )
        version_id = create_resp.json()["id"]

        response = client.get(f"/api/v1/brand-profile/versions/{version_id}/template-inputs")
        assert response.status_code == 200
        body = response.json()
        assert body["brand_name"] == "Acme"
        assert body["colors"]["primary"] == "#123456"
