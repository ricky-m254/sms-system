from django.core.management.base import BaseCommand
from django.core.management import call_command
from clients.models import Tenant, Domain

class Command(BaseCommand):
    help = 'Creates a new School (Tenant), Domain, and migrates its schema.'

    def add_arguments(self, parser):
        parser.add_argument('--schema_name', type=str, help='Schema name (e.g., test_school)')
        parser.add_argument('--name', type=str, help='Display Name (e.g., Test High School)')
        parser.add_argument('--domain', type=str, help='Domain (e.g., test.localhost)')

    def handle(self, *args, **options):
        schema_name = options['schema_name']
        name = options['name']
        domain = options['domain']

        if not all([schema_name, name, domain]):
            self.stdout.write(self.style.ERROR("Missing arguments. Usage: --schema_name 'x' --name 'y' --domain 'z'"))
            return

        # 1. Create Tenant
        # If auto_create_schema = True is set in the model, the schema is created here.
        try:
            tenant = Tenant.objects.create(
                schema_name=schema_name,
                name=name,
                paid_until='2030-01-01' # Give them access for now
            )
            self.stdout.write(self.style.SUCCESS(f"✔ Tenant '{name}' created."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✘ Error creating tenant: {e}"))
            return

        # 2. Create Domain
        try:
            Domain.objects.create(
                domain=domain,
                tenant=tenant,
                is_primary=True
            )
            self.stdout.write(self.style.SUCCESS(f"✔ Domain '{domain}' linked."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✘ Error creating domain: {e}"))
            return

        # 3. Migrate Tenant Schema
        # We explicitly run migrations only for this new tenant to populate tables.
        try:
            self.stdout.write(f"⏳ Migrating schema '{schema_name}'...")
            call_command('migrate_schemas', '--schema', schema_name)
            self.stdout.write(self.style.SUCCESS(f"✔ Schema '{schema_name}' migrated successfully."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✘ Error migrating schema: {e}"))
            return

        self.stdout.write(self.style.SUCCESS(f"🏫 School '{name}' is ready!"))