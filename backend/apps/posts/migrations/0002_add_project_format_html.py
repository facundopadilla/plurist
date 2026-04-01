import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("posts", "0001_initial"),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="draftpost",
            name="project",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="posts",
                to="projects.project",
            ),
        ),
        migrations.AddField(
            model_name="draftpost",
            name="format",
            field=models.CharField(
                choices=[
                    ("1:1", "Square (1080x1080)"),
                    ("16:9", "Landscape (1920x1080)"),
                    ("4:5", "Portrait (1080x1350)"),
                    ("9:16", "Story (1080x1920)"),
                ],
                default="1:1",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="draftpost",
            name="html_content",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="draftvariant",
            name="generated_html",
            field=models.TextField(blank=True),
        ),
    ]
