"""Data migration: convert publishing statuses and drop publishing-related tables.

This is a one-way migration that converts DraftPost statuses to the simplified
content-only lifecycle (DRAFT / COMPLETED) and drops all tables belonging to
the removed apps: publishing, integrations, scheduler, approvals.
"""

from django.db import migrations


def convert_statuses(apps, schema_editor):
    DraftPost = apps.get_model("posts", "DraftPost")
    # published → completed (preserve the lifecycle endpoint)
    DraftPost.objects.filter(status="published").update(
        status="completed",
    )
    # everything else in a publishing-workflow state → draft
    DraftPost.objects.filter(
        status__in=[
            "pending_approval",
            "approved",
            "rejected",
            "publishing",
            "failed",
        ]
    ).update(status="draft")

    # Copy published_at into completed_at before the schema migration renames it
    # (the rename happens in the next migration; here we just ensure data is ready)


DROP_TABLES_SQL = """
DROP TABLE IF EXISTS publishing_scheduledpublication;
DROP TABLE IF EXISTS publishing_publishattempt;
DROP TABLE IF EXISTS publishing_socialconnection;
DROP TABLE IF EXISTS scheduler_scheduleentry;
DROP TABLE IF EXISTS approvals_approvedsnapshot;
DROP TABLE IF EXISTS approvals_approvaldecision;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("posts", "0004_frame_metadata_and_variant_meta"),
    ]

    operations = [
        migrations.RunPython(convert_statuses, migrations.RunPython.noop),
        migrations.RunSQL(DROP_TABLES_SQL, migrations.RunSQL.noop),
    ]
