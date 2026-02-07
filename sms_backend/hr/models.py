from django.db import models


class Staff(models.Model):
    """
    Unmanaged wrapper for school.Staff (pilot migration).
    """
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50)
    role = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "school_staff"
