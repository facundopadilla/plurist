from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="color",
            field=models.CharField(blank=True, default="#6366f1", max_length=7),
        ),
        migrations.AddField(
            model_name="project",
            name="icon_storage_key",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
    ]
