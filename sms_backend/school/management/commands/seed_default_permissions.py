"""
Management Command: seed_default_permissions
Phase 16 Advanced RBAC — Prompts 88-89.

Usage:
  python manage.py seed_default_permissions
  python manage.py seed_default_permissions --assign-roles  (also assigns sensible defaults to built-in roles)

Creates all default <domain>.<resource>.<action> permissions
and optionally creates RolePermissionGrant records.
"""
from django.core.management.base import BaseCommand

DEFAULT_PERMISSIONS = [
    ("students.student.read",         "students",      "read",    "View student list and profiles"),
    ("students.student.create",       "students",      "create",  "Enroll new students"),
    ("students.student.update",       "students",      "update",  "Edit student information"),
    ("students.student.delete",       "students",      "delete",  "Deactivate or delete students"),
    ("finance.invoice.read",          "finance",       "read",    "View invoices and statements"),
    ("finance.invoice.create",        "finance",       "create",  "Generate invoices"),
    ("finance.invoice.update",        "finance",       "update",  "Edit invoice details"),
    ("finance.payment.record",        "finance",       "record",  "Record payments"),
    ("finance.payment.view",          "finance",       "view",    "View payment history"),
    ("finance.report.view",           "finance",       "view",    "View financial reports"),
    ("academics.enrollment.read",     "academics",     "read",    "View class enrollments"),
    ("academics.enrollment.manage",   "academics",     "manage",  "Manage enrollments"),
    ("academics.attendance.mark",     "academics",     "mark",    "Mark attendance"),
    ("academics.attendance.view",     "academics",     "view",    "View attendance records"),
    ("academics.timetable.read",      "academics",     "read",    "View timetables"),
    ("academics.timetable.manage",    "academics",     "manage",  "Create/edit timetables"),
    ("academics.exam.read",           "academics",     "read",    "View examination results"),
    ("academics.exam.manage",         "academics",     "manage",  "Manage exams and results"),
    ("hr.staff.read",                 "hr",            "read",    "View staff directory"),
    ("hr.staff.create",               "hr",            "create",  "Add new staff members"),
    ("hr.staff.update",               "hr",            "update",  "Edit staff information"),
    ("hr.staff.delete",               "hr",            "delete",  "Deactivate staff"),
    ("hr.leave.view",                 "hr",            "view",    "View leave requests"),
    ("hr.leave.apply",                "hr",            "apply",   "Apply for leave"),
    ("hr.leave.approve",              "hr",            "approve", "Approve leave requests"),
    ("hr.payroll.view",               "hr",            "view",    "View payroll records"),
    ("hr.payroll.manage",             "hr",            "manage",  "Process payroll"),
    ("transport.vehicle.read",        "transport",     "read",    "View vehicles and routes"),
    ("transport.vehicle.manage",      "transport",     "manage",  "Add/edit vehicles and routes"),
    ("transport.student.assign",      "transport",     "assign",  "Assign students to routes"),
    ("library.book.read",             "library",       "read",    "Browse book catalog"),
    ("library.book.manage",           "library",       "manage",  "Manage book catalog"),
    ("library.circulation.manage",    "library",       "manage",  "Issue and return books"),
    ("hostel.allocation.read",        "hostel",        "read",    "View bed allocations"),
    ("hostel.allocation.manage",      "hostel",        "manage",  "Assign/remove bed allocations"),
    ("admissions.application.read",   "admissions",    "read",    "View admission applications"),
    ("admissions.application.manage", "admissions",    "manage",  "Process admissions"),
    ("communication.message.send",    "communication", "send",    "Send messages/announcements"),
    ("communication.message.read",    "communication", "read",    "Read messages"),
    ("communication.announcement.post","communication","post",    "Post announcements"),
    ("visitor.checkin.manage",        "visitor",       "manage",  "Manage visitor check-in"),
    ("clockin.attendance.view",       "clockin",       "view",    "View clock-in records"),
    ("clockin.attendance.manage",     "clockin",       "manage",  "Manage clock-in records"),
    ("sports.team.view",              "sports",        "view",    "View sports teams"),
    ("sports.team.manage",            "sports",        "manage",  "Manage sports teams"),
    ("cafeteria.meal.view",           "cafeteria",     "view",    "View cafeteria/meal plans"),
    ("cafeteria.meal.manage",         "cafeteria",     "manage",  "Manage meal plans"),
    ("analytics.report.view",         "analytics",     "view",    "View analytics reports"),
    ("analytics.report.export",       "analytics",     "export",  "Export analytics reports"),
    ("alumni.record.view",            "alumni",        "view",    "View alumni records"),
    ("alumni.record.manage",          "alumni",        "manage",  "Manage alumni records"),
    ("maintenance.request.submit",    "maintenance",   "submit",  "Submit maintenance requests"),
    ("maintenance.request.manage",    "maintenance",   "manage",  "Manage maintenance requests"),
    ("curriculum.content.view",       "curriculum",    "view",    "View curriculum content"),
    ("curriculum.content.manage",     "curriculum",    "manage",  "Manage curriculum content"),
    ("elearning.course.view",         "elearning",     "view",    "View e-learning courses"),
    ("elearning.course.manage",       "elearning",     "manage",  "Manage e-learning courses"),
    ("settings.system.manage",        "settings",      "manage",  "Manage system settings"),
    ("settings.rbac.manage",          "settings",      "manage",  "Manage roles and permissions"),
    ("settings.modules.manage",       "settings",      "manage",  "Enable/disable modules"),
]

ROLE_DEFAULTS = {
    'TENANT_SUPER_ADMIN': [p[0] for p in DEFAULT_PERMISSIONS],
    'ADMIN': [p[0] for p in DEFAULT_PERMISSIONS],
    'ACCOUNTANT': [
        'finance.invoice.read', 'finance.invoice.create', 'finance.invoice.update',
        'finance.payment.record', 'finance.payment.view', 'finance.report.view',
        'students.student.read',
    ],
    'TEACHER': [
        'students.student.read', 'academics.enrollment.read',
        'academics.attendance.mark', 'academics.attendance.view',
        'academics.timetable.read', 'academics.exam.read', 'academics.exam.manage',
        'communication.message.send', 'communication.message.read',
        'library.book.read',
    ],
    'PARENT': [
        'students.student.read', 'finance.invoice.read', 'finance.payment.view',
        'academics.attendance.view', 'academics.timetable.read',
        'communication.message.read',
    ],
    'STUDENT': [
        'academics.timetable.read', 'academics.attendance.view',
        'library.book.read', 'communication.message.read',
        'elearning.course.view',
    ],
}


class Command(BaseCommand):
    help = 'Seed default RBAC permissions (Phase 16 Advanced RBAC)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--assign-roles', action='store_true',
            help='Also assign default permissions to built-in roles'
        )
        parser.add_argument(
            '--schema', type=str, default='demo_school',
            help='Tenant schema to seed permissions into (default: demo_school)'
        )

    def handle(self, *args, **options):
        from django_tenants.utils import schema_context
        schema = options.get('schema', 'demo_school')

        self.stdout.write(f'Seeding default permissions into schema [{schema}] …')
        with schema_context(schema):
            self._seed(options)

    def _seed(self, options):
        from school.models import Permission as PermModel

        created_count = 0
        perm_map = {}

        for name, module, action, description in DEFAULT_PERMISSIONS:
            obj, created = PermModel.objects.get_or_create(
                name=name,
                defaults={'module': module, 'action': action, 'description': description}
            )
            perm_map[name] = obj
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'  Permissions: {created_count} created, {len(DEFAULT_PERMISSIONS) - created_count} already existed.'
        ))

        if options.get('assign_roles'):
            self._assign_role_defaults(perm_map)

        self.stdout.write(self.style.SUCCESS('Done — RBAC permissions seeded.'))

    def _assign_role_defaults(self, perm_map):
        from school.models import Role as RoleModel, RolePermissionGrant
        self.stdout.write('Assigning default permissions to built-in roles …')
        grants_created = 0

        for role_name, perm_names in ROLE_DEFAULTS.items():
            try:
                role = RoleModel.objects.get(name=role_name)
            except RoleModel.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Role {role_name!r} not found — skipping.'))
                continue
            for pname in perm_names:
                perm = perm_map.get(pname)
                if perm is None:
                    continue
                _, created = RolePermissionGrant.objects.get_or_create(role=role, permission=perm)
                if created:
                    grants_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'  RolePermissionGrants: {grants_created} new grants added.'
        ))
