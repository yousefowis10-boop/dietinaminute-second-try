from django.db import migrations


def mark(apps, schema_editor):
    """Interviews the dietitian filled in themselves were left as "not sent"; show them as reviewed."""
    ClientProfile = apps.get_model('nutrition', 'ClientProfile')
    # Every client has an (empty) interview record; one that was saved at least once has a revision.
    Revision = apps.get_model('nutrition', 'DetailedProfileRevision')
    ids = Revision.objects.values_list('client_id', flat=True)
    ClientProfile.objects.filter(interview_status='none', id__in=ids).update(interview_status='reviewed')


class Migration(migrations.Migration):
    dependencies = [('nutrition', '0019_recipes')]
    operations = [migrations.RunPython(mark, migrations.RunPython.noop)]
