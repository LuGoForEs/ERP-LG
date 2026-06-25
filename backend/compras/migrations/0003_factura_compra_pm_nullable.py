import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0002_insumo_categoria_insumo_subcategoria_insumo_unidad'),
        ('desarrollo', '0002_remove_ordencompra_of_id_alter_pedidomaterial_fecha_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='facturacompra',
            name='pedido_material_id',
            field=models.ForeignKey(
                'desarrollo.PedidoMaterial',
                on_delete=django.db.models.deletion.CASCADE,
                null=True,
                blank=True,
                db_column='pedido_material_id',
            ),
        ),
    ]
