import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("staff", "0004_staffloginlockout"),
    ]

    operations = [
        migrations.AddField(
            model_name="staffuser",
            name="totp_secret_encrypted",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="staffuser",
            name="totp_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="staffuser",
            name="totp_confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="staffuser",
            name="totp_backup_issued",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="StaffTotpBackupCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code_hash", models.CharField(max_length=128)),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "staff",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="totp_backup_codes",
                        to="staff.staffuser",
                    ),
                ),
            ],
            options={
                "db_table": "staff_totp_backup_codes",
                "indexes": [models.Index(fields=["staff", "used_at"], name="staff_totp_backup_used_idx")],
            },
        ),
    ]
