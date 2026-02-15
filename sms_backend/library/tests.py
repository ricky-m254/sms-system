from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import CirculationRule, LibraryMember, LibraryResource, ResourceCopy

User = get_user_model()


class LibraryCoreTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="libadmin", password="pass1234")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.member = LibraryMember.objects.create(member_id="LIB-001", member_type="Student")
        self.resource = LibraryResource.objects.create(resource_type="Book", title="Algebra Basics")
        self.copy = ResourceCopy.objects.create(resource=self.resource, accession_number="ACC-001", status="Available")
        CirculationRule.objects.create(member_type="Student", resource_type="Book", max_items=3, loan_period_days=14, max_renewals=2, fine_per_day="5.00")

    def test_issue_and_return_flow(self):
        issue = self.client.post("/api/library/circulation/issue/", {"member": self.member.id, "copy": self.copy.id}, format="json")
        self.assertEqual(issue.status_code, 201)
        tx_id = issue.data["id"]

        returned = self.client.post(
            "/api/library/circulation/return/",
            {"transaction": tx_id, "condition_at_return": "Good"},
            format="json",
        )
        self.assertEqual(returned.status_code, 200)

    def test_reservation_queue(self):
        first = self.client.post("/api/library/reservations/", {"resource": self.resource.id, "member": self.member.id}, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["queue_position"], 1)

