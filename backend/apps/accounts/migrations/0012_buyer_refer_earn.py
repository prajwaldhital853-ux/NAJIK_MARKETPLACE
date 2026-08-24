from django.db import migrations, models


def seed_buyer_refer_config(apps, schema_editor):
    ReferEarnConfig = apps.get_model("accounts", "ReferEarnConfig")
    if ReferEarnConfig.objects.filter(pk=2).exists():
        return
    ReferEarnConfig.objects.create(
        pk=2,
        audience="user",
        reward_amount=200,
        reward_label="Rs. 200",
        description=(
            "Each invite code works for one friend only. Share your code — when they join NAJIK as a buyer "
            "and verify their phone, you get the reward in Payments. A new code is generated after each successful invite."
        ),
        is_active=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0011_alter_referearnconfig_description"),
    ]

    operations = [
        migrations.AddField(
            model_name="referearnconfig",
            name="audience",
            field=models.CharField(
                choices=[("provider", "Service providers"), ("user", "Buyers")],
                default="provider",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="referral",
            name="audience",
            field=models.CharField(
                choices=[("provider", "Service providers"), ("user", "Buyers")],
                default="provider",
                max_length=16,
                db_index=True,
            ),
        ),
        migrations.RunPython(seed_buyer_refer_config, migrations.RunPython.noop),
    ]
