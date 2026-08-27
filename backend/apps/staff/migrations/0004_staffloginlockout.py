from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("staff", "0003_update_rbac_to_page_based"),
    ]

    operations = [
        migrations.CreateModel(
            name="StaffLoginLockout",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("lock_key", models.CharField(db_index=True, max_length=512, unique=True)),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("device_fingerprint", models.CharField(blank=True, default="", max_length=255)),
                ("fail_count", models.PositiveIntegerField(default=0)),
                ("locked_until", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("last_failed_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
