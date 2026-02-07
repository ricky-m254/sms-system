from django.core.management.base import BaseCommand
from school.models import Role

class Command(BaseCommand):
    help = 'Creates default roles for the system'

    def handle(self, *args, **options):
        roles = [
            {'name': 'TENANT_SUPER_ADMIN', 'description': 'Tenant Super Admin'},
            {'name': 'ADMIN', 'description': 'School Administrator'},
            {'name': 'ACCOUNTANT', 'description': 'Finance Manager'},
            {'name': 'TEACHER', 'description': 'Teaching Staff'},
        ]
        
        created_count = 0
        for role_data in roles:
            obj, created = Role.objects.get_or_create(name=role_data['name'], defaults=role_data)
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"✔ Created Role: {obj.name}"))
        
        if created_count == 0:
            self.stdout.write(self.style.WARNING("Roles already exist."))
        else:
            self.stdout.write(self.style.SUCCESS(f"✅ Seeded {created_count} default roles."))