import factory

from apps.design_bank.models import DesignBankSource
from tests.accounts.factories import UserFactory, WorkspaceFactory


class DesignBankSourceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DesignBankSource

    workspace = factory.SubFactory(WorkspaceFactory)
    source_type = DesignBankSource.SourceType.UPLOAD
    original_filename = factory.Sequence(lambda n: f"file{n}.png")
    storage_key = factory.Sequence(lambda n: f"design-bank/key{n}")
    url = ""
    status = DesignBankSource.Status.PENDING
    extracted_data = factory.LazyFunction(dict)
    error_message = ""
    created_by = factory.SubFactory(UserFactory)
