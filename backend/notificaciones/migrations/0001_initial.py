from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('source_node', models.CharField(max_length=20)),
                ('target_node', models.CharField(db_index=True, max_length=20)),
                ('event_type', models.CharField(max_length=40)),
                ('message', models.CharField(max_length=300)),
                ('ref_type', models.CharField(blank=True, default='', max_length=40)),
                ('ref_id', models.CharField(blank=True, default='', max_length=40)),
            ],
            options={
                'db_table': 'notificaciones',
                'ordering': ['-id'],
            },
        ),
    ]
