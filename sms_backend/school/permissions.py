from rest_framework import permissions
from .module_focus import is_module_allowed

class IsSchoolAdmin(permissions.BasePermission):
    """
    Allows access only to users with the 'ADMIN' role.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Check if the user has a linked UserProfile with role 'ADMIN'
        return hasattr(request.user, 'userprofile') and request.user.userprofile.role.name in ['ADMIN', 'TENANT_SUPER_ADMIN']

class IsAccountant(permissions.BasePermission):
    """
    Allows access only to users with the 'ACCOUNTANT' (Finance Manager) role or ADMIN.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'userprofile'):
            return False
        role_name = request.user.userprofile.role.name
        return role_name in ['ACCOUNTANT', 'ADMIN', 'TENANT_SUPER_ADMIN']

class IsTeacher(permissions.BasePermission):
    """
    Allows access only to users with the 'TEACHER' role or ADMIN.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'userprofile'):
            return False
        role_name = request.user.userprofile.role.name
        return role_name in ['TEACHER', 'ADMIN', 'TENANT_SUPER_ADMIN']

class HasModuleAccess(permissions.BasePermission):
    """
    Enforces per-module access using UserModuleAssignment.
    ViewSets should define `module_key` (e.g., "FINANCE", "STUDENTS").
    ADMIN and TENANT_SUPER_ADMIN bypass module checks.
    PARENT role automatically passes PARENTS module.
    STUDENT role automatically passes STUDENT_PORTAL module.
    """

    # Roles that have inherent access to their own dedicated portal module
    _PORTAL_ROLE_MAP = {
        'PARENT':  {'PARENTS', 'PARENT_PORTAL'},
        'STUDENT': {'STUDENT_PORTAL', 'STUDENTS_PORTAL'},
    }

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        module_key = getattr(view, "module_key", None)
        if module_key and not is_module_allowed(module_key):
            return False
        if not module_key:
            return True

        role_name = None
        if hasattr(request.user, 'userprofile'):
            role_name = request.user.userprofile.role.name
            if role_name in ['ADMIN', 'TENANT_SUPER_ADMIN']:
                return True
            # Portal roles have inherent access to their own modules
            allowed_keys = self._PORTAL_ROLE_MAP.get(role_name, set())
            if module_key.upper() in allowed_keys:
                return True

        from .models import UserModuleAssignment
        return UserModuleAssignment.objects.filter(
            user=request.user,
            module__key=module_key,
            module__is_active=True,
            is_active=True
        ).exists()


class IsAcademicStaff(permissions.BasePermission):
    """
    Allows access only to teaching/academic authority roles.
    Parents and finance-only users are denied even if module assignment exists.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'userprofile'):
            return False
        return request.user.userprofile.role.name in ['TEACHER', 'ADMIN', 'TENANT_SUPER_ADMIN']
