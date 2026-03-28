from decimal import Decimal

from django.db.models import Avg, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from communication.models import Announcement
from school.models import (
    AssessmentGrade,
    Assignment,
    AssignmentSubmission,
    AttendanceRecord,
    CalendarEvent,
    Enrollment,
    Invoice,
    Payment,
    Student,
    TermResult,
)
from school.permissions import HasModuleAccess

from .models import ParentStudentLink


class StudentPortalAccessMixin:
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "STUDENT_PORTAL"


def _student_from_request(user):
    by_admission = Student.objects.filter(
        is_active=True, admission_number__iexact=user.username
    ).first()
    if by_admission:
        return by_admission

    linked = (
        ParentStudentLink.objects.filter(parent_user=user, is_active=True)
        .select_related("student")
        .first()
    )
    if linked:
        return linked.student

    return None


def _active_enrollment_for_student(student):
    if not student:
        return None
    return (
        Enrollment.objects.filter(student=student, is_active=True, status="Active")
        .order_by("-id")
        .first()
    )


def _pending_assignments_count(student):
    enrollment = _active_enrollment_for_student(student)
    if not enrollment:
        return 0
    submitted_ids = set(
        AssignmentSubmission.objects.filter(student=student, is_active=True)
        .values_list("assignment_id", flat=True)
    )
    return Assignment.objects.filter(
        class_section=enrollment.school_class, is_active=True
    ).exclude(id__in=submitted_ids).count()


class StudentDashboardView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response({
                "student": None,
                "kpis": {"attendance_rate": 0, "current_average_grade": "—",
                         "pending_assignments": 0, "upcoming_events": 0},
                "recent_grades": [],
                "upcoming_assignments": [],
                "announcements": [],
            })

        enrollment = _active_enrollment_for_student(student)

        att = AttendanceRecord.objects.filter(student=student)
        total = att.count()
        present = att.filter(status="Present").count()
        att_rate = round((present / total) * 100, 2) if total else 0

        avg = (
            TermResult.objects.filter(student=student, is_active=True)
            .aggregate(v=Avg("total_score"))
            .get("v")
        ) or 0

        upcoming_events = CalendarEvent.objects.filter(
            is_active=True, start_date__gte=timezone.now().date()
        ).count()

        pending_count = _pending_assignments_count(student)

        recent_grades = []
        for g in (
            AssessmentGrade.objects.filter(student=student, is_active=True)
            .select_related("assessment", "assessment__subject", "grade_band")
            .order_by("-entered_at")[:5]
        ):
            recent_grades.append({
                "subject": g.assessment.subject.name,
                "assessment": g.assessment.name,
                "grade": getattr(g.grade_band, "label", str(g.raw_score or "")),
            })

        upcoming_assignments = []
        if enrollment:
            submitted_ids = set(
                AssignmentSubmission.objects.filter(student=student, is_active=True)
                .values_list("assignment_id", flat=True)
            )
            for a in (
                Assignment.objects.filter(
                    class_section=enrollment.school_class,
                    is_active=True,
                )
                .exclude(id__in=submitted_ids)
                .select_related("subject")
                .order_by("due_date")[:5]
            ):
                upcoming_assignments.append({
                    "title": a.title,
                    "subject": a.subject.name,
                    "due_date": str(a.due_date) if a.due_date else None,
                })

        announcements = []
        for ann in Announcement.objects.filter(is_active=True).order_by("-created_at")[:5]:
            announcements.append({
                "title": ann.title,
                "content": getattr(ann, "body", getattr(ann, "content", "")),
                "created_at": ann.created_at,
            })

        class_section_name = None
        if enrollment:
            try:
                class_section_name = enrollment.school_class.name
            except Exception:
                pass

        return Response({
            "student": {
                "first_name": student.first_name,
                "last_name": student.last_name,
                "admission_number": student.admission_number,
                "class_section": class_section_name,
            },
            "kpis": {
                "attendance_rate": att_rate,
                "current_average_grade": str(round(float(avg), 1)) if avg else "—",
                "pending_assignments": pending_count,
                "upcoming_events": upcoming_events,
            },
            "recent_grades": recent_grades,
            "upcoming_assignments": upcoming_assignments,
            "announcements": announcements,
        })


class StudentAcademicsGradesView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response({"grades": [], "report_cards": []})

        grades = []
        for g in (
            AssessmentGrade.objects.filter(student=student, is_active=True)
            .select_related("assessment", "assessment__subject", "grade_band")
            .order_by("-assessment__date")[:300]
        ):
            grades.append({
                "subject": g.assessment.subject.name,
                "assessment": g.assessment.name,
                "score": g.raw_score,
                "max_score": g.assessment.max_marks if hasattr(g.assessment, "max_marks") else None,
                "grade": getattr(g.grade_band, "label", ""),
                "date": str(g.assessment.date) if g.assessment.date else None,
                "remarks": g.remarks if hasattr(g, "remarks") else None,
            })

        return Response({"grades": grades})


class StudentReportCardsView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response({"report_cards": []})

        from school.models import ReportCard

        cards = []
        for r in ReportCard.objects.filter(student=student, is_active=True).select_related("term", "academic_year").order_by("-created_at"):
            cards.append({
                "id": r.id,
                "academic_year": r.academic_year.name,
                "term": r.term.name,
                "status": r.status,
                "overall_grade": r.overall_grade,
            })

        return Response({"report_cards": cards})


class StudentAttendanceSummaryView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response({"total_days": 0, "present": 0, "absent": 0, "late": 0, "attendance_rate": 0})

        rows = AttendanceRecord.objects.filter(student=student)
        total = rows.count()
        present = rows.filter(status="Present").count()
        absent = rows.filter(status="Absent").count()
        late = rows.filter(status="Late").count()
        return Response({
            "total_days": total,
            "present": present,
            "absent": absent,
            "late": late,
            "attendance_rate": round((present / total) * 100, 2) if total else 0,
        })


class StudentAttendanceCalendarView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response([])

        rows = AttendanceRecord.objects.filter(student=student).order_by("-date")[:180]
        return Response([
            {"id": r.id, "date": r.date, "status": r.status, "notes": r.notes}
            for r in rows
        ])


class StudentAssignmentsView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response([])

        enrollment = _active_enrollment_for_student(student)
        if not enrollment:
            return Response([])

        submission_map = {
            s.assignment_id: s
            for s in AssignmentSubmission.objects.filter(student=student, is_active=True)
        }

        rows = Assignment.objects.filter(
            class_section=enrollment.school_class, is_active=True
        ).select_related("subject").order_by("-due_date")[:200]

        return Response([
            {
                "id": a.id,
                "title": a.title,
                "subject": a.subject.name,
                "due_date": a.due_date,
                "description": a.description,
                "status": "SUBMITTED" if a.id in submission_map else "PENDING",
                "submission_date": getattr(submission_map.get(a.id), "submitted_at", None),
                "submission_grade": getattr(submission_map.get(a.id), "score", None),
            }
            for a in rows
        ])


class StudentTimetableView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response([])

        rows = (
            AssessmentGrade.objects.filter(student=student, is_active=True)
            .select_related("assessment", "assessment__subject")
            .order_by("-assessment__date")[:100]
        )
        return Response([
            {
                "assessment": r.assessment.name,
                "subject": r.assessment.subject.name,
                "date": r.assessment.date,
                "category": r.assessment.category,
            }
            for r in rows
        ])


class MyInvoicesView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response([])

        rows = Invoice.objects.filter(student=student, is_active=True).order_by("-invoice_date", "-id")
        return Response([
            {
                "id": r.id,
                "invoice_number": getattr(r, "invoice_number", f"INV-{r.id}"),
                "description": getattr(r, "description", ""),
                "amount": r.total_amount,
                "amount_paid": r.amount_paid if hasattr(r, "amount_paid") else 0,
                "balance": r.balance if hasattr(r, "balance") else r.total_amount,
                "status": r.status,
                "invoice_date": r.invoice_date,
                "due_date": getattr(r, "due_date", None),
                "term": r.term.name if hasattr(r, "term") and r.term else None,
                "academic_year": r.academic_year.name if hasattr(r, "academic_year") and r.academic_year else None,
            }
            for r in rows[:100]
        ])


class MyPaymentsView(StudentPortalAccessMixin, APIView):
    def get(self, request):
        student = _student_from_request(request.user)
        if not student:
            return Response([])

        rows = Payment.objects.filter(student=student, is_active=True).order_by("-payment_date", "-id")
        return Response([
            {
                "id": r.id,
                "amount_paid": r.amount,
                "payment_date": r.payment_date,
                "payment_method": r.payment_method,
                "transaction_reference": getattr(r, "reference_number", getattr(r, "transaction_reference", "")),
                "notes": getattr(r, "notes", ""),
            }
            for r in rows[:200]
        ])
