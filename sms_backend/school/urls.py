from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import (
    EnrollmentViewSet, ExpenseViewSet, FeeStructureViewSet, MessageViewSet, 
    StaffViewSet, StudentViewSet, InvoiceViewSet, PaymentViewSet, 
    FinancialSummaryView, TermViewSet, ModuleViewSet, UserModuleAssignmentViewSet,
    DashboardRoutingView, DashboardSummaryView, StudentsSummaryView,
    AcademicsSummaryView, HrSummaryView, CommunicationSummaryView,
    CoreSummaryView, ReportingSummaryView,
    FinanceStudentRefView, FinanceEnrollmentRefView,
    FeeAssignmentViewSet, InvoiceAdjustmentViewSet
)

# ==========================================
# URL ROUTER (TENANT DATA)
# ==========================================
router = DefaultRouter()

# Modules
router.register(r'students', StudentViewSet, basename='student')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'modules', ModuleViewSet, basename='module')
router.register(r'module-assignments', UserModuleAssignmentViewSet, basename='module-assignment')

# Finance (Primary)
router.register(r'finance/terms', TermViewSet, basename='term') 
router.register(r'finance/fees', FeeStructureViewSet, basename='feestructure')
router.register(r'finance/fee-assignments', FeeAssignmentViewSet, basename='feeassignment')
router.register(r'finance/invoice-adjustments', InvoiceAdjustmentViewSet, basename='invoiceadjustment')
router.register(r'finance/invoices', InvoiceViewSet, basename='invoice')
router.register(r'finance/payments', PaymentViewSet, basename='payment')
router.register(r'finance/expenses', ExpenseViewSet, basename='expense')

# ==========================================
# URL PATTERNS
# ==========================================
urlpatterns = [
    # 1. Authentication (JWT)
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),

    # 2. Summary Endpoints (must come before router to avoid /students/{pk} collisions)
    path('finance/summary/', FinancialSummaryView.as_view(), name='financial_summary'),
    path('dashboard/routing/', DashboardRoutingView.as_view(), name='dashboard_routing'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('students/summary/', StudentsSummaryView.as_view(), name='students_summary'),
    path('academics/summary/', AcademicsSummaryView.as_view(), name='academics_summary'),
    path('hr/summary/', HrSummaryView.as_view(), name='hr_summary'),
    path('communication/summary/', CommunicationSummaryView.as_view(), name='communication_summary'),
    path('core/summary/', CoreSummaryView.as_view(), name='core_summary'),
    path('reporting/summary/', ReportingSummaryView.as_view(), name='reporting_summary'),

    # 3. Finance Reference Endpoints (Read-Only)
    path('finance/ref/students/', FinanceStudentRefView.as_view(), name='finance_ref_students'),
    path('finance/ref/enrollments/', FinanceEnrollmentRefView.as_view(), name='finance_ref_enrollments'),

    # 4. Module Apps (Read-Only Reference Contracts)
    path('academics/', include('academics.urls')),
    path('hr/', include('hr.urls')),
    path('assets/', include('assets.urls')),
    path('communication/', include('communication.urls')),
    path('reporting/', include('reporting.urls')),

    # 5. Tenant API Routes (Router)
    path('', include(router.urls)),
]
