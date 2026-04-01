import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkspaceAISettings",
            fields=[
                (
                    "workspace",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        related_name="ai_settings",
                        serialize=False,
                        to="accounts.workspace",
                    ),
                ),
                ("openai_api_key_enc", models.TextField(blank=True, default="")),
                ("anthropic_api_key_enc", models.TextField(blank=True, default="")),
                ("gemini_api_key_enc", models.TextField(blank=True, default="")),
                ("openrouter_api_key_enc", models.TextField(blank=True, default="")),
                ("ollama_base_url", models.CharField(blank=True, default="", max_length=500)),
                ("preferred_models", models.JSONField(blank=True, default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Workspace AI Settings",
            },
        ),
    ]
