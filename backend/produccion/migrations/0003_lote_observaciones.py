from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('produccion', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='lote',
            name='observaciones',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
