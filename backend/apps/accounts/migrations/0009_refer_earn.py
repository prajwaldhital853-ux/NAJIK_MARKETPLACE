from django.db import migrations, models
import uuid
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_appuser_phone_privacy"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="referral_code",
            field=models.CharField(blank=True, db_index=True, max_length=32, null=True, unique=True),
        ),
        migrations.CreateModel(
            name="ReferEarnConfig",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ("reward_amount", models.PositiveIntegerField(default=200)),
                ("reward_label", models.CharField(default="Rs. 200", max_length=40)),
                (
                    "description",
                    models.TextField(
                        blank=True,
                        default="Friends who join as service providers earn you Rs. 200 after their first live listing.",
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "refer & earn config",
                "verbose_name_plural": "refer & earn config",
            },
        ),
        migrations.CreateModel(
            name="Referral",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("invite_code", models.CharField(db_index=True, max_length=32)),
                (
                    "status",
                    models.CharField(
                        choices=[("joined", "Joined"), ("earned", "Earned")],
                        default="joined",
                        max_length=12,
                    ),
                ),
                ("reward_amount", models.PositiveIntegerField(default=0)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("earned_at", models.DateTimeField(blank=True, null=True)),
                (
                    "referred",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_received",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "referrer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referrals_sent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-joined_at"],
            },
        ),
    ]
