import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("design_bank", "0001_initial"),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="designbanksource",
            name="project",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="design_bank_sources",
                to="projects.project",
            ),
        ),
        migrations.AddField(
            model_name="designbanksource",
            name="name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="designbanksource",
            name="resource_data",
            field=models.JSONField(default=dict),
        ),
        migrations.AlterField(
            model_name="designbanksource",
            name="source_type",
            field=models.CharField(
                choices=[
                    ("upload", "Upload"),
                    ("url", "URL"),
                    ("pdf", "PDF"),
                    ("image", "Image"),
                    ("color", "Color"),
                    ("font", "Font"),
                    ("logo", "Logo"),
                    ("text", "Text"),
                    ("html", "HTML"),
                    ("design_system", "Design System"),
                    ("markdown", "Markdown"),
                ],
                default="upload",
                max_length=20,
            ),
        ),
    ]
