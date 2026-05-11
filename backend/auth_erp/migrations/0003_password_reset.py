from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_erp', '0002_rbac'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='reset_token',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='reset_token_created_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
