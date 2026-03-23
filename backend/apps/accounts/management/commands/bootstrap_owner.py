from django.core.management.base import BaseCommand

from apps.accounts.models import Membership, RoleChoices, User, Workspace


class Command(BaseCommand):
    help = "Create initial workspace and owner account"

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]

        workspace, _ = Workspace.objects.get_or_create(
            pk=1,
            defaults={"name": "Socialclaw"},
        )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"name": "Owner"},
        )
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])

        membership, membership_created = Membership.objects.get_or_create(
            user=user,
            workspace=workspace,
            defaults={"role": RoleChoices.OWNER},
        )
        if not membership_created and membership.role != RoleChoices.OWNER:
            membership.role = RoleChoices.OWNER
            membership.save(update_fields=["role"])

        self.stdout.write(self.style.SUCCESS(f"Bootstrapped owner: {email}"))
