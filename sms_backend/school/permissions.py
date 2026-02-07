from rest_framework import permissions

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
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        module_key = getattr(view, "module_key", None)
        if not module_key:
            return True

        if hasattr(request.user, 'userprofile'):
            role_name = request.user.userprofile.role.name
            if role_name in ['ADMIN', 'TENANT_SUPER_ADMIN']:
                return True

        from .models import UserModuleAssignment
        return UserModuleAssignment.objects.filter(
            user=request.user,
            module__key=module_key,
            module__is_active=True,
            is_active=True
        ).exists()
