import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_alter_user_managers"),
    ]

    operations = [
        migrations.CreateModel(
            name="OIDCProvider",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "provider",
                    models.CharField(
                        choices=[("google", "Google")],
                        max_length=30,
                    ),
                ),
                ("subject_id", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="oidc_providers",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("provider", "subject_id"),
                        name="accounts_oidc_provider_subject_unique",
                    ),
                    models.UniqueConstraint(
                        fields=("provider", "user"),
                        name="accounts_oidc_provider_user_unique",
                    ),
                ],
            },
        ),
    ]
