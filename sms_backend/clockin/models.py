from django.db import models
from django.utils import timezone
from datetime import date


class BiometricDevice(models.Model):
    DEVICE_TYPE_CHOICES = [
        ('ENTRY', 'Entry Only'),
        ('EXIT', 'Exit Only'),
        ('BOTH', 'Entry & Exit'),
    ]

    # Core identity
    device_id   = models.CharField(max_length=100, unique=True)
    name        = models.CharField(max_length=150)
    location    = models.CharField(max_length=200)
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES)

    # Network / connection (Dahua ASI6214S defaults pre-filled)
    ip_address  = models.GenericIPAddressField(null=True, blank=True,
                    help_text='Device IP address (Dahua factory default: 192.168.1.108)')
    port        = models.PositiveIntegerField(default=37777,
                    help_text='SDK/main port (Dahua default: 37777)')
    http_port   = models.PositiveIntegerField(default=80,
                    help_text='HTTP web port (Dahua default: 80)')
    rtsp_port   = models.PositiveIntegerField(default=37778,
                    help_text='RTSP stream port (Dahua default: 37778)')
    channel     = models.PositiveIntegerField(default=1,
                    help_text='Device channel number (Dahua default: 1)')

    # Credentials (Dahua factory defaults)
    username    = models.CharField(max_length=100, default='admin',
                    help_text='Device login username (Dahua default: admin)')
    password    = models.CharField(max_length=200, default='admin123',
                    help_text='Device login password (Dahua default: admin123 or blank)')

    # Device identity (populated during auto-discovery)
    brand             = models.CharField(max_length=100, default='Dahua',
                          help_text='Device brand (Dahua / ZKTeco / Anviz / FingerTec / Suprema)')
    model             = models.CharField(max_length=150, blank=True,
                          help_text='Device model (e.g. ASI6214S)')
    serial_number     = models.CharField(max_length=100, blank=True)
    mac_address       = models.CharField(max_length=50, blank=True)
    firmware_version  = models.CharField(max_length=100, blank=True)
    discovery_method  = models.CharField(max_length=100, blank=True,
                          help_text='How the device was found (SADP / TCP / Manual)')

    # Operational
    api_key   = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    notes     = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.ip_address:
            return f"{self.name} ({self.ip_address}:{self.port})"
        return str(self.name)

    class Meta:
        ordering = ['location', 'name']


class SchoolShift(models.Model):
    PERSON_TYPE_CHOICES = [
        ('ALL', 'All'),
        ('STUDENT', 'Students Only'),
        ('STAFF', 'Staff Only'),
    ]
    name                 = models.CharField(max_length=100)
    person_type          = models.CharField(max_length=10, choices=PERSON_TYPE_CHOICES)
    expected_arrival     = models.TimeField()
    grace_period_minutes = models.PositiveIntegerField(default=15)
    expected_departure   = models.TimeField(null=True, blank=True)
    is_active            = models.BooleanField(default=True)
    notes                = models.TextField(blank=True)
    created_at           = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.name)


class PersonRegistry(models.Model):
    PERSON_TYPE_CHOICES = [
        ('STUDENT', 'Student'),
        ('TEACHER', 'Teaching Staff'),
        ('STAFF', 'Non-Teaching Staff'),
    ]
    fingerprint_id     = models.CharField(max_length=100, unique=True,
                           help_text='Primary biometric ID — also used as Dahua Employee No / UserID')
    # Dahua-specific identity fields
    card_no            = models.CharField(max_length=100, blank=True, db_index=True,
                           help_text='RFID card number (Dahua CardNo field)')
    dahua_user_id      = models.CharField(max_length=100, blank=True, db_index=True,
                           help_text='Dahua device UserID (EmployeeNoString). Leave blank to use fingerprint_id.')

    person_type  = models.CharField(max_length=10, choices=PERSON_TYPE_CHOICES)
    student      = models.ForeignKey('school.Student', null=True, blank=True, on_delete=models.SET_NULL)
    employee     = models.ForeignKey('hr.Employee',    null=True, blank=True, on_delete=models.SET_NULL)
    display_name = models.CharField(max_length=200)
    enrolled_at  = models.DateTimeField(auto_now_add=True)
    is_active    = models.BooleanField(default=True)
    notes        = models.TextField(blank=True)

    def __str__(self):
        return str(self.display_name)


class ClockEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('IN',  'Clock In'),
        ('OUT', 'Clock Out'),
    ]
    person             = models.ForeignKey(PersonRegistry, on_delete=models.CASCADE, related_name='events')
    device             = models.ForeignKey(BiometricDevice, null=True, blank=True, on_delete=models.SET_NULL)
    event_type         = models.CharField(max_length=5, choices=EVENT_TYPE_CHOICES)
    timestamp          = models.DateTimeField(default=timezone.now)
    date               = models.DateField(default=date.today)
    is_late            = models.BooleanField(default=False)
    attendance_updated = models.BooleanField(default=False)
    notes              = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        name = self.person.display_name if self.person else 'Unknown'
        return f"{name} - {self.event_type} at {self.timestamp}"
