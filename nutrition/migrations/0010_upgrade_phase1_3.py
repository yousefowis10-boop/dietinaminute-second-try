import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """Adds the upgrade features. Only adds tables and columns; changes no existing data."""

    dependencies = [
        ('nutrition', '0009_dietitem_quantity_float'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='logo_data',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='clinic_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='ai_enabled',
            field=models.BooleanField(default=True, help_text='Dietitian can switch all AI features off'),
        ),
        migrations.AddField(
            model_name='clientprofile',
            name='excluded_foods',
            field=models.ManyToManyField(blank=True, related_name='excluded_for_clients', to='nutrition.fooditem'),
        ),
        migrations.AddField(
            model_name='clientprofile',
            name='interview_status',
            field=models.CharField(choices=[('none', 'Not sent'), ('sent', 'Link sent'), ('submitted', 'Answered, waiting for review'), ('reviewed', 'Reviewed')], default='none', max_length=10),
        ),
        migrations.AddField(
            model_name='dietitem',
            name='meal_shares',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.CreateModel(
            name='WorkoutTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('name_ar', models.CharField(blank=True, default='', max_length=200)),
                ('goal', models.CharField(choices=[('fat_loss', 'Fat loss'), ('muscle_gain', 'Muscle gain'), ('general_health', 'General health')], max_length=20)),
                ('level', models.CharField(choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate')], default='beginner', max_length=20)),
                ('place', models.CharField(choices=[('home', 'Home'), ('gym', 'Gym')], default='home', max_length=10)),
                ('is_safe_version', models.BooleanField(default=False)),
                ('is_draft', models.BooleanField(default=False)),
                ('notes', models.TextField(blank=True, default='')),
                ('notes_ar', models.TextField(blank=True, default='')),
                ('days', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='workout_templates', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='dietplan',
            name='workout',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='plans', to='nutrition.workouttemplate'),
        ),
        migrations.CreateModel(
            name='PlanTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, default='')),
                ('is_medical', models.BooleanField(default=False)),
                ('condition', models.CharField(blank=True, default='', max_length=100)),
                ('is_draft', models.BooleanField(default=False)),
                ('items', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='plan_templates', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='InterviewInvite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('answers', models.JSONField(blank=True, default=dict)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interview_invites', to='nutrition.clientprofile')),
            ],
        ),
        migrations.CreateModel(
            name='AIResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('summary', 'Interview summary'), ('message', 'Client message'), ('followup', 'Follow-up suggestion')], max_length=20)),
                ('content', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_results', to='nutrition.clientprofile')),
                ('plan', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='ai_results', to='nutrition.dietplan')),
            ],
        ),
    ]
