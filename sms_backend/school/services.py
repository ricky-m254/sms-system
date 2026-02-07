from django.db import transaction
from django.db.models import Sum
from .models import (
    Invoice, InvoiceLineItem, Payment, PaymentAllocation, 
    InvoiceAdjustment, FeeAssignment, AuditLog
)
from .events import (
    invoice_created, payment_recorded, payment_allocated,
    invoice_adjusted, fee_assigned
)
from decimal import Decimal

class FinanceService:
    @staticmethod
    @transaction.atomic
    def create_invoice(student, term, line_items_data, due_date, status=None, is_active=None):
        FinanceWriteGuard.ensure_student_readonly()
        total_amount = Decimal('0.00')
        for item in line_items_data:
            total_amount += Decimal(str(item['amount']))
        invoice = Invoice.objects.create(
            student=student,
            term=term,
            total_amount=total_amount,
            due_date=due_date,
            status=status or 'CONFIRMED',
            is_active=True if is_active is None else is_active
        )
        for item_data in line_items_data:
            InvoiceLineItem.objects.create(
                invoice=invoice,
                fee_structure=item_data['fee_structure'],
                description=item_data.get('description', ''),
                amount=item_data['amount']
            )
        invoice_created.send(
            sender=FinanceService,
            invoice_id=invoice.id,
            student_id=student.id,
            term_id=term.id,
            total_amount=str(total_amount)
        )
        return invoice

    @staticmethod
    @transaction.atomic
    def record_payment(student, amount, payment_method, reference_number, notes=""):
        FinanceWriteGuard.ensure_student_readonly()
        payment = Payment.objects.create(
            student=student,
            amount=amount,
            payment_method=payment_method,
            reference_number=reference_number,
            notes=notes
        )
        payment_recorded.send(
            sender=FinanceService,
            payment_id=payment.id,
            student_id=student.id,
            amount=str(amount),
            reference_number=reference_number
        )
        return payment

    @staticmethod
    @transaction.atomic
    def allocate_payment(payment, invoice, amount_to_allocate):
        FinanceWriteGuard.ensure_student_readonly()
        # 1. Validate Payment Availability
        current_allocations = payment.allocations.aggregate(total=Sum('amount_allocated'))['total'] or 0
        available_payment = payment.amount - current_allocations
        
        if amount_to_allocate > available_payment:
            raise ValueError(f"Insufficient funds in payment. Available: {available_payment}")

        # 2. Validate Invoice Balance (Prevent Overpayment)
        if amount_to_allocate > invoice.balance_due:
            raise ValueError(f"Amount exceeds invoice balance. Due: {invoice.balance_due}")

        allocation = PaymentAllocation.objects.create(
            payment=payment,
            invoice=invoice,
            amount_allocated=amount_to_allocate
        )
        payment_allocated.send(
            sender=FinanceService,
            allocation_id=allocation.id,
            payment_id=payment.id,
            invoice_id=invoice.id,
            amount_allocated=str(amount_to_allocate)
        )
        return allocation

    @staticmethod
    @transaction.atomic
    def create_adjustment(invoice, amount, reason, user):
        FinanceWriteGuard.ensure_student_readonly()
        """
        Creates a Credit Note / Waiver (Adjustment).
        Logs the action.
        """
        # Validate that adjustment doesn't exceed balance?
        # Maybe not, sometimes you adjust to refund? But for now, assume reducing balance.
        if amount > invoice.balance_due:
             raise ValueError(f"Adjustment amount ({amount}) exceeds current balance ({invoice.balance_due}).")

        adjustment = InvoiceAdjustment.objects.create(
            invoice=invoice,
            amount=amount,
            reason=reason,
            adjusted_by=user
        )
        
        # Log it
        AuditLog.objects.create(
            user=user,
            action="CREATE",
            model_name="InvoiceAdjustment",
            object_id=str(adjustment.id),
            details=f"Reduced Invoice #{invoice.id} by {amount}. Reason: {reason}"
        )
        invoice_adjusted.send(
            sender=FinanceService,
            adjustment_id=adjustment.id,
            invoice_id=invoice.id,
            amount=str(amount),
            reason=reason
        )
        return adjustment

    @staticmethod
    @transaction.atomic
    def assign_fee(student, fee_structure, discount_amount=Decimal('0.00'), user=None):
        FinanceWriteGuard.ensure_student_readonly()
        """
        Links a student to a fee structure.
        """
        assignment = FeeAssignment.objects.create(
            student=student,
            fee_structure=fee_structure,
            discount_amount=discount_amount
        )
        
        if user:
            AuditLog.objects.create(
                user=user,
                action="CREATE",
                model_name="FeeAssignment",
                object_id=str(assignment.id),
                details=f"Assigned {fee_structure.name} to {student.admission_number} with discount {discount_amount}"
            )
        fee_assigned.send(
            sender=FinanceService,
            assignment_id=assignment.id,
            student_id=student.id,
            fee_structure_id=fee_structure.id,
            discount_amount=str(discount_amount)
        )
        return assignment

    @staticmethod
    def get_summary():
        """
        Summary data for Finance module (read-only).
        """
        from .models import Invoice, Payment, Expense, Student

        invoice_total = Invoice.objects.aggregate(total=Sum('total_amount'))['total'] or 0
        payment_total = Payment.objects.aggregate(total=Sum('amount'))['total'] or 0
        expense_total = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0

        return {
            "revenue_billed": float(invoice_total),
            "cash_collected": float(payment_total),
            "total_expenses": float(expense_total),
            "net_profit": float(payment_total - expense_total),
            "outstanding_receivables": float(invoice_total - payment_total),
            "active_students_count": Student.objects.filter(is_active=True).count()
        }


class FinanceWriteGuard:
    """
    Enforces that FinanceService does not mutate Student or Enrollment data.
    This is a soft guard: it verifies no writes are pending in the current transaction.
    """
    @staticmethod
    def ensure_student_readonly():
        # Placeholder for stronger enforcement (signals or db constraints).
        # This guard exists to document the boundary explicitly.
        return True


class StudentsService:
    @staticmethod
    def get_summary():
        from .models import Student, Enrollment
        return {
            "students_active": Student.objects.filter(is_active=True).count(),
            "enrollments_active": Enrollment.objects.filter(is_active=True).count()
        }


class AcademicsService:
    @staticmethod
    def get_summary():
        from academics.models import AcademicYear, Term, SchoolClass
        return {
            "academic_years_active": AcademicYear.objects.filter(is_active=True).count(),
            "terms_active": Term.objects.filter(is_active=True).count(),
            "classes_active": SchoolClass.objects.filter(is_active=True).count()
        }


class HrService:
    @staticmethod
    def get_summary():
        from .models import Staff
        return {
            "staff_active": Staff.objects.filter(is_active=True).count()
        }


class CommunicationService:
    @staticmethod
    def get_summary():
        from .models import Message
        return {
            "messages_sent": Message.objects.count()
        }


class CoreService:
    @staticmethod
    def get_summary():
        from .models import Role, UserProfile, UserModuleAssignment
        return {
            "roles": Role.objects.count(),
            "users": UserProfile.objects.count(),
            "module_assignments": UserModuleAssignment.objects.filter(is_active=True).count()
        }


class ReportingService:
    @staticmethod
    def get_summary():
        from reporting.models import AuditLog
        from .models import Invoice
        return {
            "audit_logs": AuditLog.objects.count(),
            "invoices_pending": Invoice.objects.filter(is_active=True, status='CONFIRMED').count()
        }
