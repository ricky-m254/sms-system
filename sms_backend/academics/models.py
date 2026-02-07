from django.db import models


class AcademicYear(models.Model):
    """
    Unmanaged wrapper for school.AcademicYear (pilot migration).
    """
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "school_academicyear"

    def __str__(self):
        return self.name


class Term(models.Model):
    """
    Unmanaged wrapper for school.Term (pilot migration).
    """
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.DO_NOTHING)
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "school_term"

    def __str__(self):
        return f"{self.academic_year.name} - {self.name}"


class SchoolClass(models.Model):
    """
    Unmanaged wrapper for school.SchoolClass (pilot migration).
    """
    name = models.CharField(max_length=50)
    stream = models.CharField(max_length=50, blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.DO_NOTHING)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "school_schoolclass"

    def __str__(self):
        return f"{self.name} - {self.stream}"
