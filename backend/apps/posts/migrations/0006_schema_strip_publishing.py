"""Schema migration: remove publishing fields from DraftPost, rename published_at → completed_at."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("posts", "0005_data_strip_publishing"),
    ]

    operations = [
        migrations.RemoveField(model_name="draftpost", name="target_networks"),
        migrations.RemoveField(model_name="draftpost", name="submitted_at"),
        migrations.RemoveField(model_name="draftpost", name="approved_at"),
        migrations.RemoveField(model_name="draftpost", name="failure_message"),
        migrations.RenameField(
            model_name="draftpost",
            old_name="published_at",
            new_name="completed_at",
        ),
        migrations.AlterField(
            model_name="draftpost",
            name="status",
            field=models.CharField(
                choices=[("draft", "Draft"), ("completed", "Completed")],
                default="draft",
                max_length=20,
            ),
        ),
    ]
