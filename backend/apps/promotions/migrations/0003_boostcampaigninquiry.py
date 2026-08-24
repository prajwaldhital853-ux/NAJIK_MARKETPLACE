import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("promotions", "0002_boostcampaign_paused_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoostCampaignInquiry",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "buyer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="boost_inquiries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "campaign",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="unique_inquiries",
                        to="promotions.boostcampaign",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(fields=("campaign", "buyer"), name="boost_one_inquiry_per_buyer"),
                ],
            },
        ),
    ]
