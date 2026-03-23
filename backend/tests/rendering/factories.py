import factory

from apps.posts.models import BrandProfileVersion
from apps.rendering.models import RenderJob
from tests.accounts.factories import UserFactory, WorkspaceFactory


class BrandProfileVersionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BrandProfileVersion

    workspace = factory.SubFactory(WorkspaceFactory)
    version = factory.Sequence(lambda n: n + 1)
    profile_data = factory.LazyFunction(lambda: {
        "brand_name": "ACME",
        "primary_color": "#111111",
        "secondary_color": "#ffffff",
        "accent_color": "#ff5500",
        "slogans": ["Quality first"],
    })
    created_by = factory.SubFactory(UserFactory)


class RenderJobFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RenderJob

    workspace = factory.SubFactory(WorkspaceFactory)
    template_key = "social-post-standard"
    brand_profile_version = factory.SubFactory(BrandProfileVersionFactory)
    input_variables = factory.LazyFunction(dict)
    input_hash = factory.Sequence(lambda n: f"{'a' * 63}{n}"[:64])
    status = RenderJob.Status.PENDING
    output_storage_key = ""
    error_message = ""
    created_by = factory.SubFactory(UserFactory)
