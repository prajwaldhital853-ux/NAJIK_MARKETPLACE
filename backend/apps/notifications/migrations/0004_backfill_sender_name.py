from django.db import migrations


def backfill_sender_names(apps, schema_editor):
    InboxNotice = apps.get_model("notifications", "InboxNotice")
    for row in InboxNotice.objects.filter(sender_name=""):
        title = (row.title or "").strip()
        if title and title not in {"New message", "Notification", "Booking request"}:
            row.sender_name = title[:120]
            row.save(update_fields=["sender_name"])


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0003_inbox_sender_name"),
    ]

    operations = [
        migrations.RunPython(backfill_sender_names, migrations.RunPython.noop),
    ]
