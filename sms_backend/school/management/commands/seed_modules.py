from django.core.management.base import BaseCommand
from django.db import connection
from django_tenants.utils import schema_context
from clients.models import Tenant
from school.models import Module

class Command(BaseCommand):
    help = 'Seeds default modules for a tenant schema'

    def add_arguments(self, parser):
        parser.add_argument("--schema", type=str, default=None, help="Target tenant schema name.")
        parser.add_argument(
            "--all-tenants",
            action="store_true",
            help="Seed modules for all tenant schemas.",
        )

    @staticmethod
    def _table_exists(table_name: str) -> bool:
        return table_name in connection.introspection.table_names()

    def _seed_current_schema(self, schema_name: str) -> None:
        if not self._table_exists("school_module"):
            self.stdout.write(
                self.style.WARNING(
                    f"[{schema_name}] skipped: table 'school_module' not found. "
                    "Run tenant migrations first."
                )
            )
            return

        modules = [
            ('CORE', 'Core Administration'),
            ('STUDENTS', 'Students'),
            ('ADMISSIONS', 'Admissions'),
            ('FINANCE', 'Finance'),
            ('ACADEMICS', 'Academics'),
            ('HR', 'Human Resources'),
            ('STAFF', 'Staff Management'),
            ('PARENTS', 'Parent Portal'),
            ('LIBRARY', 'Library Management'),
            ('ASSETS', 'Assets and Inventory'),
            ('COMMUNICATION', 'Communication'),
            ('REPORTING', 'Reporting and Analytics'),
        ]

        created = 0
        for key, name in modules:
            _, was_created = Module.objects.get_or_create(key=key, defaults={'name': name})
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"[{schema_name}] Created module: {key}"))

        if created == 0:
            self.stdout.write(self.style.WARNING(f"[{schema_name}] Modules already exist."))
        else:
            self.stdout.write(self.style.SUCCESS(f"[{schema_name}] Seeded {created} modules."))

    def handle(self, *args, **options):
        schema_name = options.get("schema")
        all_tenants = options.get("all_tenants", False)

        if schema_name and all_tenants:
            self.stderr.write(self.style.ERROR("Use either --schema or --all-tenants, not both."))
            return

        if all_tenants:
            tenant_schemas = list(Tenant.objects.values_list("schema_name", flat=True))
            for tenant_schema in tenant_schemas:
                with schema_context(tenant_schema):
                    self._seed_current_schema(tenant_schema)
            return

        if schema_name:
            with schema_context(schema_name):
                self._seed_current_schema(schema_name)
            return

        current_schema = getattr(connection, "schema_name", "unknown")
        self._seed_current_schema(current_schema)
        if current_schema in ("public", "unknown"):
            self.stdout.write(
                self.style.WARNING(
                    "Tip: run with a tenant schema, e.g. "
                    "`python manage.py seed_modules --schema=demo_school` or "
                    "`python manage.py seed_modules --all-tenants`."
                )
            )
