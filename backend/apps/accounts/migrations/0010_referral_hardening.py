import uuid

from django.db import migrations, models


def backfill_referred_identity(apps, schema_editor):
    Referral = apps.get_model("accounts", "Referral")
    ReferralConsumedIdentity = apps.get_model("accounts", "ReferralConsumedIdentity")
    AppUser = apps.get_model("accounts", "AppUser")
    for row in Referral.objects.select_related("referred").iterator():
        phone = (row.referred_phone or "").strip()
        email = (row.referred_email or "").strip().lower()
        if not phone:
            try:
                user = AppUser.objects.get(pk=row.referred_id)
                phone = (user.phone or "").strip()
                email = (user.email or "").strip().lower()
            except AppUser.DoesNotExist:
                continue
        if phone:
            Referral.objects.filter(pk=row.pk).update(referred_phone=phone, referred_email=email)
            if not ReferralConsumedIdentity.objects.filter(phone=phone).exists():
                ReferralConsumedIdentity.objects.create(
                    phone=phone,
                    email=email or None,
                )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_refer_earn"),
    ]

    operations = [
        migrations.AddField(
            model_name="referral",
            name="referred_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="referral",
            name="referred_phone",
            field=models.CharField(db_index=True, default="", max_length=15),
            preserve_default=False,
        ),
        migrations.CreateModel(
            name="ReferralConsumedIdentity",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("phone", models.CharField(db_index=True, max_length=15, unique=True)),
                (
                    "email",
                    models.EmailField(blank=True, db_index=True, max_length=254, null=True, unique=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.RunPython(backfill_referred_identity, migrations.RunPython.noop),
    ]
