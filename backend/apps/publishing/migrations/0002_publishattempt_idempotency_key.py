from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("publishing", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="publishattempt",
            name="idempotency_key",
            field=models.CharField(blank=True, db_index=True, max_length=255),
        ),
    ]
