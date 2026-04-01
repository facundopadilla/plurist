import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0001_initial"),
        ("posts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ScheduleEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("network", models.CharField(max_length=20)),
                ("scheduled_for", models.DateTimeField()),
                ("timezone", models.CharField(default="UTC", max_length=50)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("triggered", "Triggered"), ("cancelled", "Cancelled")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="schedule_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "draft_post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_entries",
                        to="posts.draftpost",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_entries",
                        to="accounts.workspace",
                    ),
                ),
            ],
            options={
                "ordering": ["scheduled_for"],
            },
        ),
    ]
