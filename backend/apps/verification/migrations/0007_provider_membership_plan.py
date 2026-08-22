import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_provider_plans_ledger"),
        ("verification", "0006_provider_id_card"),
    ]

    operations = [
        migrations.AddField(
            model_name="providerapplication",
            name="membership_fee_label",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="providerapplication",
            name="membership_plan",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="applications",
                to="core.providerplan",
            ),
        ),
    ]
