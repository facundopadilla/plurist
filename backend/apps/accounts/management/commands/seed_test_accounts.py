from django.core.management.base import BaseCommand

from apps.accounts.models import Membership, RoleChoices, User, Workspace


class Command(BaseCommand):
    help = "Seed owner/editor test accounts"

    def handle(self, *args, **options):
        workspace, _ = Workspace.objects.get_or_create(
            pk=1,
            defaults={"name": "Socialclaw"},
        )

        accounts = [
            ("owner@example.com", "Owner", RoleChoices.OWNER),
            ("editor@example.com", "Editor", RoleChoices.EDITOR),
            ("publisher@example.com", "Publisher", RoleChoices.PUBLISHER),
            ("owner@test.com", "Owner", RoleChoices.OWNER),
            ("editor@test.com", "Editor", RoleChoices.EDITOR),
            ("publisher@test.com", "Publisher", RoleChoices.PUBLISHER),
        ]

        for email, name, role in accounts:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"name": name},
            )
            if created:
                user.set_password("testpassword123")  # nosec B106 -- dev seed command, not production
                user.save(update_fields=["password"])
            Membership.objects.get_or_create(
                user=user,
                workspace=workspace,
                defaults={"role": role},
            )

        self.stdout.write(self.style.SUCCESS("Seeded test accounts"))
