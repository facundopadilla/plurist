from datetime import timedelta

import factory
from django.utils import timezone

from apps.accounts.models import Invite, Membership, RoleChoices, User, Workspace


class WorkspaceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Workspace
        django_get_or_create = ("id",)

    id = 1
    name = "Socialclaw"
    timezone = "UTC"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Sequence(lambda n: f"User {n}")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if not create:
            return
        password = extracted or "testpassword123"
        self.set_password(password)
        self.save(update_fields=["password"])


class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Membership

    user = factory.SubFactory(UserFactory)
    workspace = factory.SubFactory(WorkspaceFactory)
    role = RoleChoices.EDITOR.value


class InviteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Invite

    email = factory.Sequence(lambda n: f"invite{n}@example.com")
    workspace = factory.SubFactory(WorkspaceFactory)
    role = RoleChoices.EDITOR.value
    token = factory.Sequence(lambda n: f"token{n:064d}"[-64:])
    invited_by = factory.SubFactory(UserFactory)
    accepted = False
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))
