from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from clients.models import Domain, Tenant
from school.models import Guardian, Student
from .models import ParentStudentLink
from .views import _children_for_parent

User = get_user_model()


class TenantTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django_tenants.utils import schema_context

        with schema_context("public"):
            cls.tenant = Tenant.objects.create(
                schema_name="parent_portal_test",
                name="Parent Portal Test School",
                paid_until="2030-01-01",
            )
            Domain.objects.create(domain="parent-portal.localhost", tenant=cls.tenant, is_primary=True)

    def setUp(self):
        from django_tenants.utils import schema_context

        self.schema_context = schema_context(self.tenant.schema_name)
        self.schema_context.__enter__()

    def tearDown(self):
        self.schema_context.__exit__(None, None, None)


class ParentPortalTests(TenantTestBase):
    def setUp(self):
        super().setUp()
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
