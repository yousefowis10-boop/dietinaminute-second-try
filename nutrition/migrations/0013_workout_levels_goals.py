from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0012_checkins_weekly_interview'),
    ]

    operations = [
        migrations.AlterField(
            model_name='workouttemplate',
            name='goal',
            field=models.CharField(choices=[('fat_loss', 'Fat loss'), ('muscle_gain', 'Muscle gain'), ('general_health', 'General health'), ('muscle_focus', 'Muscle focus')], max_length=20),
        ),
        migrations.AlterField(
            model_name='workouttemplate',
            name='level',
            field=models.CharField(choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced'), ('all_levels', 'All levels')], default='beginner', max_length=20),
        ),
    ]
