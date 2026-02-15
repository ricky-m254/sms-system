from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from school.models import Guardian, Student
from .models import ParentStudentLink
from .views import _children_for_parent

User = get_user_model()


class ParentPortalTests(TestCase):
    def setUp(self):
        self.parent = User.objects.create_user(username="parent1", email="parent1@example.com", password="pass1234")
        self.student = Student.objects.create(
            first_name="Child",
            last_name="One",
            date_of_birth=date(2015, 1, 1),
            admission_number="ADM-001",
            gender="M",
            is_active=True,
        )
        Guardian.objects.create(
            student=self.student,
            name="Parent One",
            relationship="Parent",
            phone="0700000000",
            email="parent1@example.com",
            is_active=True,
        )

    def test_children_fallback_match(self):
        children = _children_for_parent(self.parent)
        self.assertEqual(children.count(), 1)
        self.assertEqual(children.first().id, self.student.id)

    def test_children_explicit_link_priority(self):
        other = Student.objects.create(
            first_name="Child",
            last_name="Two",
            date_of_birth=date(2016, 2, 2),
            admission_number="ADM-002",
            gender="M",
            is_active=True,
        )
        ParentStudentLink.objects.create(parent_user=self.parent, student=other, relationship="Parent", is_active=True)
        children = _children_for_parent(self.parent)
        self.assertEqual(children.count(), 1)
        self.assertEqual(children.first().id, other.id)
