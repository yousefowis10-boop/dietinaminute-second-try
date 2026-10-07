from django.db import migrations, models


class Migration(migrations.Migration):
    """Store servings as a decimal number so 1.5 servings stays 1.5.

    Existing whole-number values are kept exactly as they are.
    """

    dependencies = [
        ('nutrition', '0008_userprofile'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dietitem',
            name='quantity',
            field=models.FloatField(default=1, help_text='Number of servings (default = 1)'),
        ),
    ]
