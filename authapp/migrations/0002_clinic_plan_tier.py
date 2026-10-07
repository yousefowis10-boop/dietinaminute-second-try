import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authapp', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Clinic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.AddField(
            model_name='customuser',
            name='plan_tier',
            field=models.CharField(choices=[('basic', 'Basic (manual plans)'), ('pro', 'Pro (includes AI)'), ('clinic', 'Clinic (several dietitians)')], default='basic', max_length=10),
        ),
        migrations.AddField(
            model_name='customuser',
            name='clinic',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='members', to='authapp.clinic'),
        ),
        migrations.AddField(
            model_name='customuser',
            name='is_clinic_admin',
            field=models.BooleanField(default=False),
        ),
    ]
