from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("design_bank", "0002_add_project_fk_and_resource_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="designbanksource",
            name="file_size_bytes",
            field=models.BigIntegerField(blank=True, null=True),
        ),
    ]
