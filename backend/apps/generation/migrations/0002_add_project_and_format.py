import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("generation", "0001_initial"),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="comparerun",
            name="project",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="compare_runs",
                to="projects.project",
            ),
        ),
        migrations.AddField(
            model_name="comparerun",
            name="format",
            field=models.CharField(default="1:1", max_length=10),
        ),
        migrations.AlterField(
            model_name="comparerun",
            name="template_key",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
