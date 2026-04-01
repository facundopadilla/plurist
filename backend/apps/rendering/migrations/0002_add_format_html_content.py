import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rendering", "0001_initial"),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="renderjob",
            name="project",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="render_jobs",
                to="projects.project",
            ),
        ),
        migrations.AddField(
            model_name="renderjob",
            name="format",
            field=models.CharField(default="1:1", max_length=10),
        ),
        migrations.AddField(
            model_name="renderjob",
            name="html_content",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="renderjob",
            name="template_key",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name="renderjob",
            name="brand_profile_version",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="render_jobs",
                to="posts.brandprofileversion",
            ),
        ),
    ]
