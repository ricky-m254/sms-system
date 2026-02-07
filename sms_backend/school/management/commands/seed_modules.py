from django.core.management.base import BaseCommand
from school.models import Module

class Command(BaseCommand):
    help = 'Seeds default modules for a tenant schema'

    def handle(self, *args, **options):
        modules = [
            ('CORE', 'Core Administration'),
            ('STUDENTS', 'Students'),
            ('FINANCE', 'Finance'),
            ('ACADEMICS', 'Academics'),
            ('HR', 'Human Resources'),
            ('ASSETS', 'Assets and Inventory'),
            ('COMMUNICATION', 'Communication'),
            ('REPORTING', 'Reporting and Analytics'),
        ]

        created = 0
        for key, name in modules:
            obj, was_created = Module.objects.get_or_create(key=key, defaults={'name': name})
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created module: {key}"))

        if created == 0:
            self.stdout.write(self.style.WARNING("Modules already exist."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Seeded {created} modules."))
