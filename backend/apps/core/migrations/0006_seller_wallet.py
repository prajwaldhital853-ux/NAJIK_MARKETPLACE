import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_provider_plans_ledger"),
        ("listings", "0008_listing_urgent"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("staff", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SellerPaymentConfig",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ("listing_fee_rupees", models.PositiveIntegerField(default=10)),
                ("listing_fee_label", models.CharField(default="Rs. 10", max_length=40)),
                ("bank_name", models.CharField(blank=True, default="", max_length=120)),
                ("bank_account_name", models.CharField(blank=True, default="", max_length=120)),
                ("bank_account_number", models.CharField(blank=True, default="", max_length=64)),
                ("bank_branch", models.CharField(blank=True, default="", max_length=120)),
                ("payment_instructions", models.TextField(blank=True, default="")),
                ("qr_code", models.ImageField(blank=True, upload_to="app-control/payment-qr.png")),
                ("min_load_rupees", models.PositiveIntegerField(default=100)),
                ("max_load_rupees", models.PositiveIntegerField(default=50000)),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "seller payment config",
                "verbose_name_plural": "seller payment config",
            },
        ),
        migrations.CreateModel(
            name="SellerWallet",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("balance_paisa", models.BigIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "provider",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seller_wallet",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="SellerLoadRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount_paisa", models.PositiveBigIntegerField()),
                ("payment_reference", models.CharField(blank=True, default="", max_length=120)),
                ("proof_image", models.ImageField(blank=True, upload_to="seller-loads/proof.jpg")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                        ],
                        default="pending",
                        max_length=12,
                    ),
                ),
                ("admin_note", models.TextField(blank=True, default="")),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "provider",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seller_load_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="seller_load_reviews",
                        to="staff.staffuser",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="SellerWalletTransaction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("load", "Load approved"),
                            ("listing_fee", "Listing fee"),
                            ("admin_credit", "Admin credit"),
                            ("admin_debit", "Admin debit"),
                            ("refund", "Refund"),
                        ],
                        max_length=16,
                    ),
                ),
                ("amount_paisa", models.BigIntegerField()),
                ("balance_after_paisa", models.BigIntegerField()),
                ("note", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="seller_wallet_adjustments",
                        to="staff.staffuser",
                    ),
                ),
                (
                    "listing",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="wallet_transactions",
                        to="listings.listing",
                    ),
                ),
                (
                    "load_request",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="wallet_transactions",
                        to="core.sellerloadrequest",
                    ),
                ),
                (
                    "wallet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transactions",
                        to="core.sellerwallet",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="sellerloadrequest",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status", "pending")),
                fields=("provider",),
                name="seller_one_pending_load",
            ),
        ),
        migrations.AddConstraint(
            model_name="sellerwallettransaction",
            constraint=models.UniqueConstraint(
                condition=models.Q(("kind", "listing_fee")),
                fields=("listing",),
                name="seller_unique_listing_fee",
            ),
        ),
    ]
