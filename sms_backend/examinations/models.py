from django.db import models

class ExamSession(models.Model):
    STATUS_CHOICES = [
        ('Upcoming', 'Upcoming'),
        ('Ongoing', 'Ongoing'),
        ('Completed', 'Completed'),
    ]
    name = models.CharField(max_length=150)
    term = models.ForeignKey('school.Term', null=True, blank=True, on_delete=models.SET_NULL)
    academic_year = models.ForeignKey('school.AcademicYear', null=True, blank=True, on_delete=models.SET_NULL)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Upcoming')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ExamPaper(models.Model):
    session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name='papers')
    subject = models.ForeignKey('school.Subject', on_delete=models.CASCADE)
    school_class = models.ForeignKey('school.SchoolClass', on_delete=models.CASCADE)
    exam_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    exam_room = models.CharField(max_length=100, blank=True)
    total_marks = models.PositiveIntegerField(default=100)
    pass_mark = models.PositiveIntegerField(default=40)
    invigilator = models.ForeignKey('auth.User', null=True, blank=True, on_delete=models.SET_NULL)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'subject', 'school_class')

    def __str__(self):
        return f"{self.subject} - {self.session.name}"

class ExamSeatAllocation(models.Model):
    paper = models.ForeignKey(ExamPaper, on_delete=models.CASCADE, related_name='seat_allocations')
    student = models.ForeignKey('school.Student', on_delete=models.CASCADE)
    seat_number = models.CharField(max_length=20)
    admission_slip_issued = models.BooleanField(default=False)

    class Meta:
        unique_together = ('paper', 'student')

    def __str__(self):
        return f"{self.student} - {self.paper}"

class ExamResult(models.Model):
    paper = models.ForeignKey(ExamPaper, on_delete=models.CASCADE, related_name='results')
    student = models.ForeignKey('school.Student', on_delete=models.CASCADE)
    marks_obtained = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=5, blank=True)
    remarks = models.CharField(max_length=200, blank=True)
    position = models.PositiveIntegerField(null=True, blank=True)
    entered_by = models.ForeignKey('auth.User', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('paper', 'student')

    def __str__(self):
        return f"{self.student} - {self.paper} Result"

class ExamGradeBoundary(models.Model):
    session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name='grade_boundaries')
    grade = models.CharField(max_length=5)
    min_marks = models.DecimalField(max_digits=5, decimal_places=2)
    max_marks = models.DecimalField(max_digits=5, decimal_places=2)
    remarks = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.grade} ({self.min_marks}-{self.max_marks})"
