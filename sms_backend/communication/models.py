from django.db import models


class Message(models.Model):
    """
    Unmanaged wrapper for school.Message (pilot migration).
    """
    recipient_type = models.CharField(max_length=20)
    recipient_id = models.IntegerField()
    subject = models.CharField(max_length=200)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = "school_message"
