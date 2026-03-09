from django.db import models

class AlumniProfile(models.Model):
    student = models.ForeignKey('school.Student', null=True, blank=True, on_delete=models.SET_NULL)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    graduation_year = models.PositiveIntegerField()
    admission_number = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    current_institution = models.CharField(max_length=200, blank=True)
    current_occupation = models.CharField(max_length=200, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    linkedin_url = models.CharField(max_length=300, blank=True)
    bio = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.graduation_year})"

class AlumniEvent(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    event_date = models.DateField()
    location = models.CharField(max_length=300, blank=True)
    is_virtual = models.BooleanField(default=False)
    meeting_link = models.CharField(max_length=500, blank=True)
    organizer = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class AlumniEventAttendee(models.Model):
    event = models.ForeignKey(AlumniEvent, on_delete=models.CASCADE, related_name='attendees')
    alumni = models.ForeignKey(AlumniProfile, on_delete=models.CASCADE)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'alumni')

    def __str__(self):
        return f"{self.alumni} attending {self.event}"
