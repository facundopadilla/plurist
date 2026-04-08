import factory

from apps.accounts.models import RoleChoices
from apps.mcp.models import WorkspaceAPIKey
from tests.accounts.factories import UserFactory, WorkspaceFactory


class WorkspaceAPIKeyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WorkspaceAPIKey
        exclude = ["raw_key"]

    workspace = factory.SubFactory(WorkspaceFactory)
    name = factory.Sequence(lambda n: f"API Key {n}")
    prefix = "sk-test0"
    key_hash = factory.LazyAttribute(lambda o: WorkspaceAPIKey.hash_key(o.raw_key))
    role = RoleChoices.EDITOR.value
    created_by = factory.SubFactory(UserFactory)

    # Not a model field — used to compute key_hash
    raw_key = factory.Sequence(lambda n: f"sk-{'0' * 31}{n}")
