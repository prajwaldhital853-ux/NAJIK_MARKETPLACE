from django.db import migrations, models


def seed_buyer_payment_config(apps, schema_editor):
    SellerPaymentConfig = apps.get_model("core", "SellerPaymentConfig")
    if SellerPaymentConfig.objects.filter(pk=2).exists():
        return
    SellerPaymentConfig.objects.create(
        pk=2,
        audience="user",
        listing_fee_rupees=0,
        listing_fee_label="Rs. 0",
        min_load_rupees=100,
        max_load_rupees=50000,
        bank_name="",
        bank_account_name="",
        bank_account_number="",
        bank_branch="",
        payment_instructions="Buyer wallet top-ups are approved here after offline bank transfer.",
        is_active=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0007_sellerwallettransaction_boost_campaign_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="sellerpaymentconfig",
            name="audience",
            field=models.CharField(
                choices=[("provider", "Service providers"), ("user", "Buyers")],
                default="provider",
                max_length=16,
            ),
        ),
        migrations.RunPython(seed_buyer_payment_config, migrations.RunPython.noop),
    ]
