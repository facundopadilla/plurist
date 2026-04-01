from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("publishing", "0002_publishattempt_idempotency_key"),
    ]

    operations = [
        migrations.AddField(
            model_name="socialconnection",
            name="provider_user_id",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="socialconnection",
            name="provider_username",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="socialconnection",
            name="token_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="socialconnection",
            name="status",
            field=models.CharField(
                choices=[
                    ("connected", "Connected"),
                    ("expired", "Expired"),
                    ("error", "Error"),
                    ("revoked", "Revoked"),
                ],
                default="connected",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="socialconnection",
            name="last_refreshed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="socialconnection",
            name="error_detail",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="publishattempt",
            name="social_connection",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="publish_attempts",
                to="publishing.socialconnection",
            ),
        ),
    ]
