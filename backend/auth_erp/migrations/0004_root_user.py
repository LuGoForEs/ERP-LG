import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_erp', '0003_password_reset'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='is_root',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='must_change_credentials',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='must_enable_2fa',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='pending_email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='pending_password',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='cred_change_token',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='cred_change_token_created_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='PendingSystemAdmin',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(blank=True, default='', max_length=150)),
                ('last_name', models.CharField(blank=True, default='', max_length=150)),
                ('dni', models.CharField(blank=True, default='', max_length=20)),
                ('email', models.EmailField(max_length=254)),
                ('confirm_token', models.UUIDField(db_index=True, default=uuid.uuid4)),
                ('confirm_token_created_at', models.DateTimeField(auto_now_add=True)),
                ('requested_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pending_admins_requested', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'pending_system_admins'},
        ),
    ]
