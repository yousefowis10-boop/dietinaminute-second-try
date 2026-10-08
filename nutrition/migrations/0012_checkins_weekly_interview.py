import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0011_plantemplate_arabic'),
    ]

    operations = [
        # Check-in details on visits
        migrations.AddField('clientprofilerevision', 'source', models.CharField(blank=True, default='visit', max_length=20)),
        migrations.AddField('clientprofilerevision', 'note', models.TextField(blank=True, default='')),
        migrations.AddField('clientprofilerevision', 'body_fat_mass', models.FloatField(blank=True, null=True)),
        migrations.AddField('clientprofilerevision', 'visceral_fat', models.FloatField(blank=True, null=True)),
        migrations.AddField('clientprofilerevision', 'waist_hip', models.FloatField(blank=True, null=True)),
        migrations.AddField('clientprofilerevision', 'inbody_bmr', models.FloatField(blank=True, null=True)),
        migrations.AddField('clientprofilerevision', 'reviewed', models.BooleanField(default=True)),
        migrations.CreateModel(
            name='CheckInFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=255)),
                ('content_type', models.CharField(default='application/octet-stream', max_length=100)),
                ('data', models.BinaryField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('revision', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='file', to='nutrition.clientprofilerevision')),
            ],
        ),
        migrations.CreateModel(
            name='CheckInLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('active', models.BooleanField(default=True)),
                ('client', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='checkin_link', to='nutrition.clientprofile')),
            ],
        ),
        # Formula + adjustment remembered for recalculating after check-ins
        migrations.AddField('clientprofile', 'formula_name', models.CharField(blank=True, default='', max_length=100)),
        migrations.AddField('clientprofile', 'calorie_adjustment', models.FloatField(default=0)),
        # Meal names and the suggested week on plans
        migrations.AddField('dietplan', 'meal_slots', models.JSONField(blank=True, default=list)),
        migrations.AddField('dietplan', 'weekly', models.JSONField(blank=True, null=True)),
        # Interview food pickers and drinks
        migrations.AddField('detailedprofile', 'liked_foods', models.JSONField(blank=True, default=list, null=True)),
        migrations.AddField('detailedprofile', 'less_foods', models.JSONField(blank=True, default=list, null=True)),
        migrations.AddField('detailedprofile', 'never_foods', models.JSONField(blank=True, default=list, null=True)),
        migrations.AddField('detailedprofile', 'drinks', models.JSONField(blank=True, default=dict, null=True)),
        migrations.AddField('detailedprofilerevision', 'liked_foods', models.JSONField(blank=True, default=list, null=True)),
        migrations.AddField('detailedprofilerevision', 'less_foods', models.JSONField(blank=True, default=list, null=True)),
        migrations.AddField('detailedprofilerevision', 'never_foods', models.JSONField(blank=True, default=list, null=True)),
        migrations.AddField('detailedprofilerevision', 'drinks', models.JSONField(blank=True, default=dict, null=True)),
    ]
