from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('produccion', '0002_lote_observaciones_y_estado'),
    ]

    operations = [
        migrations.AddField(
            model_name='lote',
            name='observaciones',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
