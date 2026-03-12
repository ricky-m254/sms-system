"""
Management command: reset demo_school tenant to original Kenya school seed data.
Wipes all user-created records and reseeds from scratch.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Reset demo_school tenant data to original Kenya school seed."

    def add_arguments(self, parser):
        parser.add_argument("--schema", type=str, default="demo_school")

    def handle(self, *args, **options):
        schema = options["schema"]
        self.stdout.write(self.style.WARNING(f"Resetting demo data for schema: {schema}"))

        with schema_context(schema):
            from school.models import (
                Student, Guardian, Enrollment, FeeStructure, Invoice,
                InvoiceLineItem, Payment, PaymentAllocation, Expense,
                SchoolProfile, Department, Subject,
                GradingScheme, GradeBand,
                Assessment, AssessmentGrade, TermResult, ReportCard,
            )
            from school.models import AcademicYear, Term, SchoolClass
            from hr.models import Staff
            from admissions.models import AdmissionApplication
            from maintenance.models import MaintenanceRequest
            from examinations.models import ExamSession, ExamPaper, ExamGradeBoundary

            # ── Gradebook / report cards ─────────────────────────────────────
            self.stdout.write("Clearing gradebook records...")
            AssessmentGrade.objects.all().delete()
            TermResult.objects.all().delete()
            ReportCard.objects.all().delete()
            Assessment.objects.all().delete()
            GradeBand.objects.all().delete()
            GradingScheme.objects.all().delete()

            # ── Examinations ─────────────────────────────────────────────────
            self.stdout.write("Clearing examination records...")
            ExamGradeBoundary.objects.all().delete()
            ExamPaper.objects.all().delete()
            ExamSession.objects.all().delete()

            # ── Finance ──────────────────────────────────────────────────────
            self.stdout.write("Clearing finance records...")
            PaymentAllocation.objects.all().delete()
            Payment.objects.all().delete()
            InvoiceLineItem.objects.all().delete()
            Invoice.objects.all().delete()
            Expense.objects.all().delete()
            FeeStructure.objects.all().delete()

            # ── Students / Staff ─────────────────────────────────────────────
            self.stdout.write("Clearing student records...")
            Enrollment.objects.all().delete()
            Guardian.objects.all().delete()
            Student.objects.all().delete()

            self.stdout.write("Clearing staff records...")
            Staff.objects.all().delete()

            # ── Curriculum ───────────────────────────────────────────────────
            self.stdout.write("Clearing curriculum records...")
            Subject.objects.all().delete()
            Department.objects.all().delete()

            # ── Academic structures ──────────────────────────────────────────
            self.stdout.write("Clearing academic structures...")
            SchoolClass.objects.all().delete()
            Term.objects.all().delete()
            AcademicYear.objects.all().delete()

            # ── Admissions / Maintenance ──────────────────────────────────────
            self.stdout.write("Clearing admissions & maintenance...")
            try:
                AdmissionApplication.objects.all().delete()
            except Exception:
                pass
            try:
                MaintenanceRequest.objects.all().delete()
            except Exception:
                pass

            # ── School profile ────────────────────────────────────────────────
            self.stdout.write("Clearing school profile...")
            SchoolProfile.objects.all().delete()

        # Reseed everything
        self.stdout.write(self.style.SUCCESS("Reseeding Kenya school data..."))
        call_command("seed_kenya_school", schema_name=schema)
        self.stdout.write(self.style.SUCCESS(f"Demo reset complete for schema: {schema}"))
