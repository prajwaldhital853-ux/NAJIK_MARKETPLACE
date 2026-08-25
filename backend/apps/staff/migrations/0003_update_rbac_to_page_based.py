# Manual migration to update RBAC schema
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('staff', '0002_role_alter_staffuser_options_staffuser_created_by_and_more'),
    ]

    operations = [
        # Step 1: Remove old constraints
        migrations.AlterUniqueTogether(
            name='permission',
            unique_together=set(),
        ),
        
        # Step 2: Remove old fields
        migrations.RemoveField(
            model_name='role',
            name='code',
        ),
        migrations.RemoveField(
            model_name='staffpermission',
            name='reason',
        ),
        migrations.RemoveField(
            model_name='permission',
            name='resource',
        ),
        
        # Step 3: Add new fields
        migrations.AddField(
            model_name='permission',
            name='page',
            field=models.CharField(
                blank=True,
                null=True,
                choices=[
                    ('dashboard', 'Dashboard'),
                    ('user_management', 'User Management'),
                    ('property_management', 'Property Management'),
                    ('job_management', 'Job Management'),
                    ('service_management', 'Service Management'),
                    ('electronics_management', 'Electronics Management'),
                    ('other_listings', 'Other Listings'),
                    ('orders_bookings', 'Orders & Bookings'),
                    ('seller_payments', 'Seller Payments'),
                    ('kyc_verification', 'KYC / Verification'),
                    ('reports_complaints', 'Reports & Complaints'),
                    ('reviews_ratings', 'Reviews & Ratings'),
                    ('notifications', 'Notifications'),
                    ('ads_promotions', 'Advertisements / Promotions'),
                    ('analytics', 'Analytics'),
                    ('app_control', 'General App Control'),
                    ('staff_management', 'Admin & Staff Management'),
                    ('settings', 'Settings'),
                ],
                db_index=True,
                max_length=50
            ),
        ),
        migrations.AddField(
            model_name='role',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_roles',
                to='staff.staffuser'
            ),
        ),
        migrations.AddField(
            model_name='role',
            name='is_system_role',
            field=models.BooleanField(
                default=False,
                help_text='System roles (Super Admin, Admin, etc.) cannot be deleted'
            ),
        ),
        
        # Step 4: Alter fields
        migrations.AlterField(
            model_name='permission',
            name='action',
            field=models.CharField(
                choices=[
                    ('view', 'View'),
                    ('create', 'Create'),
                    ('update', 'Update'),
                    ('delete', 'Delete')
                ],
                max_length=50
            ),
        ),
        migrations.AlterField(
            model_name='role',
            name='name',
            field=models.CharField(db_index=True, max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='rolepermission',
            name='permission',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='role_assignments',
                to='staff.permission'
            ),
        ),
        migrations.AlterField(
            model_name='staffpermission',
            name='expires_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Optional expiry for temporary permissions',
                null=True
            ),
        ),
        migrations.AlterField(
            model_name='staffpermission',
            name='is_granted',
            field=models.BooleanField(
                default=True,
                help_text='False = explicitly deny this permission'
            ),
        ),
        migrations.AlterField(
            model_name='staffpermission',
            name='staff',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='individual_permissions',
                to='staff.staffuser'
            ),
        ),
        
        # Step 5: Update model options
        migrations.AlterModelOptions(
            name='permission',
            options={'ordering': ['page', 'action']},
        ),
        migrations.AlterModelOptions(
            name='role',
            options={'ordering': ['-is_system_role', 'name']},
        ),
        migrations.AlterModelOptions(
            name='rolepermission',
            options={'ordering': ['role', 'permission']},
        ),
        migrations.AlterModelOptions(
            name='staffpermission',
            options={'ordering': ['staff', 'permission']},
        ),
        
        # Step 6: Add new unique constraint
        migrations.AlterUniqueTogether(
            name='permission',
            unique_together={('page', 'action')},
        ),
    ]
