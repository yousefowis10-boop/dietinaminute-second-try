from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0010_upgrade_phase1_3'),
    ]

    operations = [
        migrations.AddField(
            model_name='plantemplate',
            name='name_ar',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='plantemplate',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
    ]
