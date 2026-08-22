from django.db import migrations

from apps.notifications.services import normalize_target_id

GENERIC = {"New message", "Notification", "Booking request"}


def normalize_notice_target_ids(apps, schema_editor):
    InboxNotice = apps.get_model("notifications", "InboxNotice")
    for row in InboxNotice.objects.all():
        norm = normalize_target_id(row.target_id)
        updates = {}
        if row.target_id != norm:
            updates["target_id"] = norm
        name = (row.sender_name or "").strip()
        if name in GENERIC:
            updates["sender_name"] = ""
        if updates:
            for key, value in updates.items():
                setattr(row, key, value)
            row.save(update_fields=list(updates.keys()))


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0004_backfill_sender_name"),
    ]

    operations = [
        migrations.RunPython(normalize_notice_target_ids, migrations.RunPython.noop),
    ]
