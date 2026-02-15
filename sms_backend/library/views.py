from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Max, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from school.permissions import HasModuleAccess
from .models import (
    CirculationRule,
    CirculationTransaction,
    FineRecord,
    LibraryCategory,
    LibraryMember,
    LibraryResource,
    Reservation,
    ResourceCopy,
)
from .serializers import (
    CirculationRuleSerializer,
    CirculationTransactionSerializer,
    FineRecordSerializer,
    LibraryCategorySerializer,
    LibraryMemberSerializer,
    LibraryResourceSerializer,
    ReservationSerializer,
    ResourceCopySerializer,
)


class LibraryAccessMixin:
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "LIBRARY"


def recalc_resource_counts(resource_id: int) -> None:
    totals = ResourceCopy.objects.filter(resource_id=resource_id, is_active=True).aggregate(
        total=Count("id"),
        available=Count("id", filter=Q(status="Available")),
    )
    LibraryResource.objects.filter(id=resource_id).update(
        total_copies=totals.get("total") or 0,
        available_copies=totals.get("available") or 0,
    )


class LibraryCategoryViewSet(LibraryAccessMixin, viewsets.ModelViewSet):
    serializer_class = LibraryCategorySerializer
    queryset = LibraryCategory.objects.filter(is_active=True).order_by("name")

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class LibraryResourceViewSet(LibraryAccessMixin, viewsets.ModelViewSet):
    serializer_class = LibraryResourceSerializer
    queryset = LibraryResource.objects.filter(is_active=True).order_by("title")

    def get_queryset(self):
        qs = super().get_queryset()
        resource_type = self.request.query_params.get("resource_type")
        category = self.request.query_params.get("category")
        available_only = self.request.query_params.get("available")
        q = (self.request.query_params.get("q") or "").strip()
        if resource_type:
            qs = qs.filter(resource_type=resource_type)
        if category:
            qs = qs.filter(category_id=category)
        if available_only in ["1", "true", "True"]:
            qs = qs.filter(available_copies__gt=0)
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(authors__icontains=q)
                | Q(isbn__icontains=q)
                | Q(subjects__icontains=q)
            )
        return qs

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        return Response(self.get_serializer(self.get_queryset()[:100], many=True).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class ResourceCopyViewSet(LibraryAccessMixin, viewsets.ModelViewSet):
    serializer_class = ResourceCopySerializer
    queryset = ResourceCopy.objects.filter(is_active=True).order_by("resource__title", "accession_number")

    def get_queryset(self):
        qs = super().get_queryset()
        resource = self.request.query_params.get("resource")
        status_value = self.request.query_params.get("status")
        if resource:
            qs = qs.filter(resource_id=resource)
        if status_value:
            qs = qs.filter(status=status_value)
        return qs

    def perform_create(self, serializer):
        row = serializer.save()
        recalc_resource_counts(row.resource_id)

    def perform_update(self, serializer):
        row = serializer.save()
        recalc_resource_counts(row.resource_id)

    def perform_destroy(self, instance):
        resource_id = instance.resource_id
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        recalc_resource_counts(resource_id)


class LibraryMemberViewSet(LibraryAccessMixin, viewsets.ModelViewSet):
    serializer_class = LibraryMemberSerializer
    queryset = LibraryMember.objects.filter(is_active=True).order_by("member_id")

    def get_queryset(self):
        qs = super().get_queryset()
        member_type = self.request.query_params.get("member_type")
        status_value = self.request.query_params.get("status")
        if member_type:
            qs = qs.filter(member_type=member_type)
        if status_value:
            qs = qs.filter(status=status_value)
        return qs

    @action(detail=True, methods=["post"], url_path="suspend")
    def suspend(self, request, pk=None):
        row = self.get_object()
        row.status = "Suspended"
        row.save(update_fields=["status"])
        return Response(self.get_serializer(row).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="borrowings")
    def borrowings(self, request, pk=None):
        rows = (
            CirculationTransaction.objects.filter(
                member_id=pk,
                transaction_type="Issue",
                return_date__isnull=True,
                is_active=True,
            )
            .order_by("due_date", "-id")
        )
        return Response(CirculationTransactionSerializer(rows, many=True).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        rows = CirculationTransaction.objects.filter(member_id=pk, is_active=True).order_by("-issue_date", "-id")[:300]
        return Response(CirculationTransactionSerializer(rows, many=True).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class ReservationViewSet(LibraryAccessMixin, viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    queryset = Reservation.objects.filter(is_active=True).order_by("resource_id", "queue_position")

    def get_queryset(self):
        qs = super().get_queryset()
        member = self.request.query_params.get("member")
        status_value = self.request.query_params.get("status")
        if member:
            qs = qs.filter(member_id=member)
        if status_value:
            qs = qs.filter(status=status_value)
        return qs

    def perform_create(self, serializer):
        resource = serializer.validated_data["resource"]
        max_pos = (
            Reservation.objects.filter(resource=resource, is_active=True, status__in=["Waiting", "Ready"]).aggregate(v=Max("queue_position")).get("v")
            or 0
        )
        serializer.save(queue_position=max_pos + 1, status="Waiting")

    @action(detail=True, methods=["patch"], url_path="cancel")
    def cancel(self, request, pk=None):
        row = self.get_object()
        if row.status in ["Picked", "Cancelled", "Expired"]:
            return Response({"error": "Reservation is already closed."}, status=status.HTTP_400_BAD_REQUEST)
        row.status = "Cancelled"
        row.cancelled_at = timezone.now()
        row.save(update_fields=["status", "cancelled_at"])
        return Response(self.get_serializer(row).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], url_path="pickup")
    def pickup(self, request, pk=None):
        row = self.get_object()
        if row.status != "Ready":
            return Response({"error": "Only ready reservations can be picked up."}, status=status.HTTP_400_BAD_REQUEST)
        row.status = "Picked"
        row.picked_at = timezone.now()
        row.save(update_fields=["status", "picked_at"])
        return Response(self.get_serializer(row).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path=r"queue/(?P<resource_id>\d+)")
    def queue(self, request, resource_id=None):
        rows = self.get_queryset().filter(resource_id=resource_id, status__in=["Waiting", "Ready"]).order_by("queue_position")
        return Response(self.get_serializer(rows, many=True).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class FineViewSet(LibraryAccessMixin, viewsets.ModelViewSet):
    serializer_class = FineRecordSerializer
    queryset = FineRecord.objects.filter(is_active=True).order_by("-created_at")

    def get_queryset(self):
        qs = super().get_queryset()
        member = self.request.query_params.get("member")
        status_value = self.request.query_params.get("status")
        if member:
            qs = qs.filter(member_id=member)
        if status_value:
            qs = qs.filter(status=status_value)
        return qs

    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        row = self.get_object()
        amount = Decimal(str(request.data.get("amount") or row.amount - row.amount_paid))
        if amount <= 0:
            return Response({"error": "Payment amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
        row.amount_paid = min(row.amount, row.amount_paid + amount)
        if row.amount_paid >= row.amount:
            row.status = "Paid"
            row.paid_at = timezone.now()
        row.save(update_fields=["amount_paid", "status", "paid_at"])
        recompute_member_fines(row.member_id)
        return Response(self.get_serializer(row).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="waive")
    def waive(self, request, pk=None):
        row = self.get_object()
        row.status = "Waived"
        row.waiver_reason = (request.data.get("reason") or "").strip()
        row.waived_by = request.user
        row.save(update_fields=["status", "waiver_reason", "waived_by"])
        recompute_member_fines(row.member_id)
        return Response(self.get_serializer(row).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path=r"summary/(?P<member_id>\d+)")
    def summary(self, request, member_id=None):
        rows = FineRecord.objects.filter(member_id=member_id, is_active=True)
        payload = rows.aggregate(total=Sum("amount"), paid=Sum("amount_paid"))
        total = payload.get("total") or Decimal("0.00")
        paid = payload.get("paid") or Decimal("0.00")
        return Response(
            {
                "member_id": int(member_id),
                "total": total,
                "paid": paid,
                "outstanding": total - paid,
                "pending_count": rows.filter(status="Pending").count(),
            },
            status=status.HTTP_200_OK,
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        recompute_member_fines(instance.member_id)


def recompute_member_fines(member_id: int) -> None:
    outstanding = (
        FineRecord.objects.filter(member_id=member_id, is_active=True, status="Pending").aggregate(v=Sum(F("amount") - F("amount_paid"))).get("v")
        or Decimal("0.00")
    )
    LibraryMember.objects.filter(id=member_id).update(total_fines=outstanding)


class CirculationRuleView(LibraryAccessMixin, APIView):
    def get(self, request):
        rows = CirculationRule.objects.filter(is_active=True).order_by("member_type", "resource_type")
        return Response(CirculationRuleSerializer(rows, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        member_type = request.data.get("member_type")
        resource_type = request.data.get("resource_type")
        if not member_type or not resource_type:
            return Response({"error": "member_type and resource_type are required"}, status=status.HTTP_400_BAD_REQUEST)
        row, _ = CirculationRule.objects.update_or_create(
            member_type=member_type,
            resource_type=resource_type,
            defaults={
                "max_items": request.data.get("max_items", 3),
                "loan_period_days": request.data.get("loan_period_days", 14),
                "max_renewals": request.data.get("max_renewals", 2),
                "fine_per_day": request.data.get("fine_per_day", "5.00"),
                "is_active": True,
            },
        )
        return Response(CirculationRuleSerializer(row).data, status=status.HTTP_200_OK)


def _pick_rule(member: LibraryMember, resource: LibraryResource) -> CirculationRule:
    return CirculationRule.objects.filter(
        member_type=member.member_type,
        resource_type=resource.resource_type,
        is_active=True,
    ).first()


class IssueResourceView(LibraryAccessMixin, APIView):
    def post(self, request):
        member_id = request.data.get("member")
        copy_id = request.data.get("copy")
        if not member_id or not copy_id:
            return Response({"error": "member and copy are required"}, status=status.HTTP_400_BAD_REQUEST)
        member = LibraryMember.objects.filter(id=member_id, is_active=True).first()
        copy = ResourceCopy.objects.select_related("resource").filter(id=copy_id, is_active=True).first()
        if not member or not copy:
            return Response({"error": "member/copy not found"}, status=status.HTTP_404_NOT_FOUND)
        if member.status != "Active":
            return Response({"error": "member is not active"}, status=status.HTTP_400_BAD_REQUEST)
        if copy.status != "Available":
            return Response({"error": "copy is not available"}, status=status.HTTP_400_BAD_REQUEST)
        if member.total_fines > Decimal("500.00"):
            return Response({"error": "member has outstanding fines above threshold"}, status=status.HTTP_400_BAD_REQUEST)
        rule = _pick_rule(member, copy.resource)
        if not rule:
            return Response({"error": "no circulation rule for this member/resource type"}, status=status.HTTP_400_BAD_REQUEST)
        active_count = CirculationTransaction.objects.filter(
            member=member,
            transaction_type="Issue",
            return_date__isnull=True,
            is_active=True,
        ).count()
        if active_count >= rule.max_items:
            return Response({"error": "borrowing limit reached"}, status=status.HTTP_400_BAD_REQUEST)
        due_date = (timezone.now() + timedelta(days=rule.loan_period_days)).date()
        row = CirculationTransaction.objects.create(
            copy=copy,
            member=member,
            transaction_type="Issue",
            issue_date=timezone.now(),
            due_date=due_date,
            issued_by=request.user,
        )
        copy.status = "Issued"
        copy.save(update_fields=["status"])
        recalc_resource_counts(copy.resource_id)
        return Response(CirculationTransactionSerializer(row).data, status=status.HTTP_201_CREATED)


class ReturnResourceView(LibraryAccessMixin, APIView):
    def post(self, request):
        transaction_id = request.data.get("transaction")
        if not transaction_id:
            return Response({"error": "transaction is required"}, status=status.HTTP_400_BAD_REQUEST)
        row = (
            CirculationTransaction.objects.select_related("copy", "member", "copy__resource")
            .filter(id=transaction_id, transaction_type="Issue", return_date__isnull=True, is_active=True)
            .first()
        )
        if not row:
            return Response({"error": "active issue transaction not found"}, status=status.HTTP_404_NOT_FOUND)
        now = timezone.now()
        overdue_days = max(0, (now.date() - row.due_date).days) if row.due_date else 0
        fine_amount = Decimal("0.00")
        if overdue_days > 0:
            rule = _pick_rule(row.member, row.copy.resource)
            if rule:
                fine_amount = Decimal(overdue_days) * rule.fine_per_day
        row.return_date = now
        row.overdue_days = overdue_days
        row.is_overdue = overdue_days > 0
        row.fine_amount = fine_amount
        row.fine_paid = fine_amount <= 0
        row.condition_at_return = request.data.get("condition_at_return") or ""
        row.returned_to = request.user
        row.transaction_type = "Return"
        row.save(
            update_fields=[
                "return_date",
                "overdue_days",
                "is_overdue",
                "fine_amount",
                "fine_paid",
                "condition_at_return",
                "returned_to",
                "transaction_type",
            ]
        )
        if fine_amount > 0:
            FineRecord.objects.create(
                member=row.member,
                transaction=row,
                fine_type="Overdue",
                amount=fine_amount,
                status="Pending",
            )
            recompute_member_fines(row.member_id)
        next_reservation = (
            Reservation.objects.filter(resource=row.copy.resource, status="Waiting", is_active=True).order_by("queue_position", "id").first()
        )
        if next_reservation:
            row.copy.status = "Reserved"
            next_reservation.status = "Ready"
            next_reservation.ready_at = now
            next_reservation.pickup_deadline = (now + timedelta(days=3)).date()
            next_reservation.save(update_fields=["status", "ready_at", "pickup_deadline"])
        else:
            row.copy.status = "Available"
        row.copy.save(update_fields=["status"])
        recalc_resource_counts(row.copy.resource_id)
        return Response(CirculationTransactionSerializer(row).data, status=status.HTTP_200_OK)


class RenewResourceView(LibraryAccessMixin, APIView):
    def post(self, request):
        transaction_id = request.data.get("transaction")
        if not transaction_id:
            return Response({"error": "transaction is required"}, status=status.HTTP_400_BAD_REQUEST)
        row = (
            CirculationTransaction.objects.select_related("copy", "member", "copy__resource")
            .filter(id=transaction_id, transaction_type="Issue", return_date__isnull=True, is_active=True)
            .first()
        )
        if not row:
            return Response({"error": "active issue transaction not found"}, status=status.HTTP_404_NOT_FOUND)
        waiting_exists = Reservation.objects.filter(resource=row.copy.resource, status="Waiting", is_active=True).exists()
        if waiting_exists:
            return Response({"error": "renewal blocked; resource is reserved by another member"}, status=status.HTTP_400_BAD_REQUEST)
        rule = _pick_rule(row.member, row.copy.resource)
        if not rule:
            return Response({"error": "no circulation rule for this member/resource type"}, status=status.HTTP_400_BAD_REQUEST)
        if row.renewal_count >= rule.max_renewals:
            return Response({"error": "max renewals reached"}, status=status.HTTP_400_BAD_REQUEST)
        row.renewal_count += 1
        row.due_date = (row.due_date or timezone.now().date()) + timedelta(days=rule.loan_period_days)
        row.notes = (row.notes or "") + f"\nRenewed by {request.user.username} at {timezone.now().isoformat()}"
        row.save(update_fields=["renewal_count", "due_date", "notes"])
        return Response(CirculationTransactionSerializer(row).data, status=status.HTTP_200_OK)


class CirculationTransactionsView(LibraryAccessMixin, APIView):
    def get(self, request):
        qs = CirculationTransaction.objects.filter(is_active=True).select_related("copy", "member", "copy__resource")
        member = request.query_params.get("member")
        overdue = request.query_params.get("overdue")
        if member:
            qs = qs.filter(member_id=member)
        if overdue in ["1", "true", "True"]:
            qs = qs.filter(return_date__isnull=True, due_date__lt=timezone.now().date())
        return Response(CirculationTransactionSerializer(qs.order_by("-issue_date", "-id")[:500], many=True).data, status=status.HTTP_200_OK)


class CirculationOverdueView(LibraryAccessMixin, APIView):
    def get(self, request):
        rows = CirculationTransaction.objects.filter(
            transaction_type="Issue",
            return_date__isnull=True,
            due_date__lt=timezone.now().date(),
            is_active=True,
        ).order_by("due_date", "-id")
        return Response(CirculationTransactionSerializer(rows, many=True).data, status=status.HTTP_200_OK)


class CirculationMemberBorrowingsView(LibraryAccessMixin, APIView):
    def get(self, request, member_id):
        rows = CirculationTransaction.objects.filter(
            member_id=member_id,
            transaction_type="Issue",
            return_date__isnull=True,
            is_active=True,
        ).order_by("due_date", "-id")
        return Response(CirculationTransactionSerializer(rows, many=True).data, status=status.HTTP_200_OK)
