from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CirculationMemberBorrowingsView,
    CirculationOverdueView,
    CirculationRuleView,
    CirculationTransactionsView,
    FineViewSet,
    IssueResourceView,
    LibraryCategoryViewSet,
    LibraryMemberViewSet,
    LibraryResourceViewSet,
    RenewResourceView,
    ReservationViewSet,
    ResourceCopyViewSet,
    ReturnResourceView,
)

router = DefaultRouter()
router.register(r"resources", LibraryResourceViewSet, basename="library_resources")
router.register(r"copies", ResourceCopyViewSet, basename="library_copies")
router.register(r"categories", LibraryCategoryViewSet, basename="library_categories")
router.register(r"members", LibraryMemberViewSet, basename="library_members")
router.register(r"reservations", ReservationViewSet, basename="library_reservations")
router.register(r"fines", FineViewSet, basename="library_fines")

urlpatterns = [
    path("circulation/issue/", IssueResourceView.as_view(), name="library_issue"),
    path("circulation/return/", ReturnResourceView.as_view(), name="library_return"),
    path("circulation/renew/", RenewResourceView.as_view(), name="library_renew"),
    path("circulation/transactions/", CirculationTransactionsView.as_view(), name="library_transactions"),
    path("circulation/overdue/", CirculationOverdueView.as_view(), name="library_overdue"),
    path("circulation/member/<int:member_id>/", CirculationMemberBorrowingsView.as_view(), name="library_member_borrowings"),
    path("circulation/rules/", CirculationRuleView.as_view(), name="library_rules"),
    path("", include(router.urls)),
]

