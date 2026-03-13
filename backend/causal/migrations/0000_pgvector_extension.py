"""Create pgvector extension — must run before any migration that uses VectorField."""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),
    ]
