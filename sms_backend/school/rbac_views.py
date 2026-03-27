"""
Phase 11 + Phase 16 Advanced RBAC — API Views
=============================================
Endpoints:
  GET  /api/rbac/permissions/                   — list all permissions
  GET  /api/rbac/permissions/?module=finance    — filter by module
  POST /api/rbac/permissions/seed/              — seed default permissions (admin only)
  GET  /api/rbac/roles/                         — list roles with their permissions
  POST /api/rbac/roles/<role_id>/grant/         — grant permission to role
  DEL  /api/rbac/roles/<role_id>/revoke/        — revoke permission from role
  GET  /api/rbac/users/<user_id>/permissions/   — effective permissions for user
  GET  /api/rbac/users/<user_id>/overrides/     — list overrides
  POST /api/rbac/users/<user_id>/overrides/     — create/update override
  DEL  /api/rbac/users/<user_id>/overrides/<permission_id>/ — delete override
"""
from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth.models import User as DjangoUser


# ──────────────────────────────────────────────────────
# Permission List  GET /api/rbac/permissions/
# ──────────────────────────────────────────────────────
class RbacPermissionListView(APIView):
    """List all permissions, optionally filtered by module."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from school.models import Permission as PermModel
        module = request.query_params.get('module')
        qs = PermModel.objects.all().order_by('module', 'name')
        if module:
            qs = qs.filter(module=module)
        data = [
            {'id': p.id, 'name': p.name, 'module': p.module, 'action': p.action, 'description': p.description}
            for p in qs
        ]
        return Response(data)


# ──────────────────────────────────────────────────────
# Permission Seed  POST /api/rbac/permissions/seed/
# ──────────────────────────────────────────────────────

DEFAULT_PERMISSIONS = [
    ("students.student.read",    "students", "read",    "View student list and profiles"),
    ("students.student.create",  "students", "create",  "Enroll new students"),
    ("students.student.update",  "students", "update",  "Edit student information"),
    ("students.student.delete",  "students", "delete",  "Deactivate or delete students"),
    ("finance.invoice.read",     "finance",  "read",    "View invoices and statements"),
    ("finance.invoice.create",   "finance",  "create",  "Generate invoices"),
    ("finance.invoice.update",   "finance",  "update",  "Edit invoice details"),
    ("finance.payment.record",   "finance",  "record",  "Record payments"),
    ("finance.report.view",      "finance",  "view",    "View financial reports"),
    ("academics.enrollment.read",   "academics", "read",    "View class enrollments"),
    ("academics.enrollment.manage", "academics", "manage",  "Manage enrollments"),
    ("academics.attendance.mark",   "academics", "mark",    "Mark attendance"),
    ("academics.attendance.view",   "academics", "view",    "View attendance records"),
    ("academics.timetable.read",    "academics", "read",    "View timetables"),
    ("academics.timetable.manage",  "academics", "manage",  "Create/edit timetables"),
    ("hr.staff.read",    "hr", "read",   "View staff directory"),
    ("hr.staff.create",  "hr", "create", "Add new staff members"),
    ("hr.staff.update",  "hr", "update", "Edit staff information"),
    ("hr.staff.delete",  "hr", "delete", "Deactivate staff"),
    ("hr.leave.approve", "hr", "approve","Approve leave requests"),
    ("transport.vehicle.read",   "transport", "read",   "View vehicles and routes"),
    ("transport.vehicle.manage", "transport", "manage", "Add/edit vehicles and routes"),
    ("library.book.read",    "library", "read",    "Browse book catalog"),
    ("library.book.manage",  "library", "manage",  "Manage book catalog"),
    ("library.circulation.manage", "library", "manage", "Issue and return books"),
    ("hostel.allocation.read",   "hostel", "read",   "View bed allocations"),
    ("hostel.allocation.manage", "hostel", "manage", "Assign/remove bed allocations"),
    ("admissions.application.read",   "admissions", "read",   "View admission applications"),
    ("admissions.application.manage", "admissions", "manage", "Process admissions"),
    ("communication.message.send",  "communication", "send",  "Send messages/announcements"),
    ("communication.message.read",  "communication", "read",  "Read messages"),
    ("analytics.report.view",  "analytics", "view",  "View analytics reports"),
    ("settings.system.manage", "settings", "manage", "Manage system settings"),
    ("settings.rbac.manage",   "settings", "manage", "Manage roles and permissions"),
]


class RbacPermissionSeedView(APIView):
    """Seed default permissions into the database. Admin only."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        from school.models import Permission as PermModel
        created, skipped = 0, 0
        for name, module, action, description in DEFAULT_PERMISSIONS:
            _, is_new = PermModel.objects.get_or_create(
                name=name,
                defaults={'module': module, 'action': action, 'description': description}
            )
            if is_new:
                created += 1
            else:
                skipped += 1
        return Response({
            'status': 'ok',
            'created': created,
            'skipped': skipped,
            'total': created + skipped,
        }, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────
# Role Permission Management
# GET  /api/rbac/roles/
# POST /api/rbac/roles/<role_id>/grant/
# POST /api/rbac/roles/<role_id>/revoke/
# ──────────────────────────────────────────────────────
class RbacRoleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from school.models import Role as RoleModel, RolePermissionGrant
        roles = RoleModel.objects.prefetch_related('permission_grants__permission').all()
        data = []
        for role in roles:
            perms = [
                {'id': g.permission.id, 'name': g.permission.name, 'module': g.permission.module}
                for g in role.permission_grants.all()
            ]
            data.append({'id': role.id, 'name': role.name, 'description': role.description, 'permissions': perms})
        return Response(data)


class RbacRoleGrantPermissionView(APIView):
    """POST /api/rbac/roles/<role_id>/grant/ — body: {permission_id}"""
    permission_classes = [IsAdminUser]

    def post(self, request, role_id):
        from school.models import Role as RoleModel, Permission as PermModel, RolePermissionGrant
        perm_id = request.data.get('permission_id')
        if not perm_id:
            return Response({'error': 'permission_id is required'}, status=400)
        try:
            role = RoleModel.objects.get(pk=role_id)
            perm = PermModel.objects.get(pk=perm_id)
        except (RoleModel.DoesNotExist, PermModel.DoesNotExist) as e:
            return Response({'error': str(e)}, status=404)
        _, created = RolePermissionGrant.objects.get_or_create(role=role, permission=perm)
        return Response({'status': 'granted' if created else 'already_granted', 'role': role.name, 'permission': perm.name})


class RbacRoleRevokePermissionView(APIView):
    """POST /api/rbac/roles/<role_id>/revoke/ — body: {permission_id}"""
    permission_classes = [IsAdminUser]

    def post(self, request, role_id):
        from school.models import Role as RoleModel, Permission as PermModel, RolePermissionGrant
        perm_id = request.data.get('permission_id')
        if not perm_id:
            return Response({'error': 'permission_id is required'}, status=400)
        deleted, _ = RolePermissionGrant.objects.filter(role_id=role_id, permission_id=perm_id).delete()
        if deleted:
            return Response({'status': 'revoked'})
        return Response({'status': 'not_found'}, status=404)


# ──────────────────────────────────────────────────────
# User Effective Permissions
# GET /api/rbac/users/<user_id>/permissions/
# ──────────────────────────────────────────────────────
class RbacUserEffectivePermissionsView(APIView):
    """Return the final resolved permission set for a user (Phase 16)."""
    permission_classes = [IsAuthenticated]

    _ADMIN_ROLES = {'ADMIN', 'TENANT_SUPER_ADMIN'}

    def get(self, request, user_id):
        if not (request.user.is_staff or request.user.pk == user_id):
            return Response({'error': 'Forbidden'}, status=403)

        # Admin / super-admin roles get all permissions (wildcard)
        try:
            from school.models import UserProfile, Permission as RbacPermission
            profile = UserProfile.objects.select_related('role').filter(user_id=user_id).first()
            if profile and profile.role and profile.role.name in self._ADMIN_ROLES:
                all_perms = list(
                    RbacPermission.objects.filter(is_active=True).values_list('name', flat=True)
                )
                if not all_perms:
                    all_perms = ['*']
                return Response({'user_id': user_id, 'permissions': all_perms, 'count': len(all_perms), 'is_admin': True})
        except Exception:
            pass

        try:
            from domains.auth.infrastructure.django_user_repository import DjangoUserRepository
            from domains.auth.infrastructure.django_permission_repository import DjangoPermissionRepository
            from domains.auth.infrastructure.django_override_repository import DjangoUserPermissionOverrideRepository
            from domains.auth.application.permission_resolver_service import PermissionResolverService

            resolver = PermissionResolverService(
                user_repo=DjangoUserRepository(),
                permission_repo=DjangoPermissionRepository(),
                override_repo=DjangoUserPermissionOverrideRepository(),
            )
            perms = resolver.resolve(user_id)
            return Response({'user_id': user_id, 'permissions': perms, 'count': len(perms)})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ──────────────────────────────────────────────────────
# User Permission Overrides
# GET  /api/rbac/users/<user_id>/overrides/
# POST /api/rbac/users/<user_id>/overrides/     — body: {permission_id, is_allowed, reason}
# DEL  /api/rbac/users/<user_id>/overrides/<permission_id>/
# ──────────────────────────────────────────────────────
class RbacUserOverrideListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        from school.models import UserPermissionOverride as OverrideModel
        overrides = OverrideModel.objects.filter(user_id=user_id).select_related('permission')
        data = [
            {
                'id': o.id,
                'permission_id': o.permission_id,
                'permission': o.permission.name,
                'is_allowed': o.is_allowed,
                'reason': o.reason,
                'created_at': o.created_at,
            }
            for o in overrides
        ]
        return Response(data)

    def post(self, request, user_id):
        from school.models import UserPermissionOverride as OverrideModel, Permission as PermModel
        perm_id = request.data.get('permission_id')
        is_allowed = request.data.get('is_allowed', True)
        reason = request.data.get('reason', '')

        if not perm_id:
            return Response({'error': 'permission_id is required'}, status=400)
        try:
            perm = PermModel.objects.get(pk=perm_id)
        except PermModel.DoesNotExist:
            return Response({'error': f'Permission {perm_id} not found'}, status=404)
        try:
            target_user = DjangoUser.objects.get(pk=user_id)
        except DjangoUser.DoesNotExist:
            return Response({'error': f'User {user_id} not found'}, status=404)

        override, created = OverrideModel.objects.update_or_create(
            user=target_user,
            permission=perm,
            defaults={'is_allowed': bool(is_allowed), 'reason': reason, 'created_by': request.user}
        )
        return Response({
            'id': override.id,
            'permission': perm.name,
            'is_allowed': override.is_allowed,
            'reason': override.reason,
            'action': 'created' if created else 'updated',
        }, status=201 if created else 200)


class RbacUserOverrideDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id, permission_id):
        from school.models import UserPermissionOverride as OverrideModel
        deleted, _ = OverrideModel.objects.filter(user_id=user_id, permission_id=permission_id).delete()
        if deleted:
            return Response({'status': 'deleted'})
        return Response({'status': 'not_found'}, status=404)
