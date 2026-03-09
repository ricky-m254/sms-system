from django.db import models
from django.utils import timezone
from datetime import date

class BiometricDevice(models.Model):
    DEVICE_TYPE_CHOICES = [
        ('ENTRY', 'Entry Only'),
        ('EXIT', 'Exit Only'),
        ('BOTH', 'Entry & Exit'),
    ]
    device_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=200)
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES)
    api_key = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.device_id})"

class SchoolShift(models.Model):
    PERSON_TYPE_CHOICES = [
        ('ALL', 'All'),
        ('STUDENT', 'Students Only'),
        ('STAFF', 'Staff Only'),
    ]
    name = models.CharField(max_length=100)
    person_type = models.CharField(max_length=10, choices=PERSON_TYPE_CHOICES)
    expected_arrival = models.TimeField()
    grace_period_minutes = models.PositiveIntegerField(default=15)
    expected_departure = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class PersonRegistry(models.Model):
    PERSON_TYPE_CHOICES = [
        ('STUDENT', 'Student'),
        ('TEACHER', 'Teaching Staff'),
        ('STAFF', 'Non-Teaching Staff'),
    ]
    fingerprint_id = models.CharField(max_length=100, unique=True)
    person_type = models.CharField(max_length=10, choices=PERSON_TYPE_CHOICES)
    student = models.ForeignKey('school.Student', null=True, blank=True, on_delete=models.SET_NULL)
    employee = models.ForeignKey('hr.Employee', null=True, blank=True, on_delete=models.SET_NULL)
    display_name = models.CharField(max_length=200)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.display_name

class ClockEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('IN', 'Clock In'),
        ('OUT', 'Clock Out'),
    ]
    person = models.ForeignKey(PersonRegistry, on_delete=models.CASCADE, related_name='events')
    device = models.ForeignKey(BiometricDevice, null=True, blank=True, on_delete=models.SET_NULL)
    event_type = models.CharField(max_length=5, choices=EVENT_TYPE_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now)
    date = models.DateField(default=date.today)
    is_late = models.BooleanField(default=False)
    attendance_updated = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.person.display_name} - {self.event_type} at {self.timestamp}"
