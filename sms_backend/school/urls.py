from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import (
    EnrollmentViewSet, ExpenseViewSet, FeeStructureViewSet, MessageViewSet, 
    StaffViewSet, StudentViewSet, InvoiceViewSet, PaymentViewSet, 
    BudgetViewSet,
    PaymentReversalRequestViewSet,
    InvoiceWriteOffRequestViewSet,
    PaymentGatewayTransactionViewSet,
    PaymentGatewayWebhookEventViewSet,
    BankStatementLineViewSet,
    FinanceGatewayWebhookView,
    LateFeeRuleViewSet,
    FeeReminderLogViewSet,
    AccountingPeriodViewSet, ChartOfAccountViewSet, JournalEntryViewSet,
    AccountingTrialBalanceView, AccountingLedgerView,
    FinancialSummaryView, TermViewSet, ModuleViewSet, UserModuleAssignmentViewSet,
    DashboardRoutingView, DashboardSummaryView, StudentsSummaryView, StudentsDashboardView,
    SchoolProfileView,
    AcademicsSummaryView, HrSummaryView, CommunicationSummaryView,
    CoreSummaryView, ReportingSummaryView,
    StudentsModuleReportView, StudentReportView, StudentOperationalSummaryView,
    StudentsModuleReportCsvExportView, StudentReportCsvExportView,
    StudentsModuleReportPdfExportView, StudentReportPdfExportView,
    StudentsDirectoryCsvExportView, StudentsDirectoryPdfExportView,
    FinanceSummaryCsvExportView, FinanceSummaryPdfExportView,
    FinanceReceivablesAgingView, FinanceOverdueAccountsView,
    FinanceInstallmentAgingView,
    FinanceReceivablesAgingCsvExportView, FinanceOverdueAccountsCsvExportView,
    AttendanceSummaryCsvExportView, AttendanceSummaryPdfExportView,
    AttendanceRecordsCsvExportView, AttendanceRecordsPdfExportView,
    BehaviorIncidentsCsvExportView, BehaviorIncidentsPdfExportView,
    MedicalProfilesCsvExportView, MedicalProfilesPdfExportView,
    MedicalImmunizationsCsvExportView, MedicalImmunizationsPdfExportView,
    MedicalClinicVisitsCsvExportView, MedicalClinicVisitsPdfExportView,
    StudentsDocumentsCsvExportView, StudentsDocumentsPdfExportView,
    FinanceStudentRefView, FinanceEnrollmentRefView,
    FeeAssignmentViewSet, InvoiceAdjustmentViewSet,
    ScholarshipAwardViewSet,
    TenantSequenceResetView,
    AttendanceRecordViewSet,
    AttendanceSummaryView,
    BehaviorIncidentViewSet,
    MedicalRecordViewSet,
    ImmunizationRecordViewSet,
    ClinicVisitViewSet,
    TenantModuleListView,
    TenantModuleSettingsView,
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
router.register(r'attendance', AttendanceRecordViewSet, basename='attendance')
router.register(r'behavior/incidents', BehaviorIncidentViewSet, basename='behavior-incident')
router.register(r'medical/records', MedicalRecordViewSet, basename='medical-record')
router.register(r'medical/immunizations', ImmunizationRecordViewSet, basename='medical-immunization')
router.register(r'medical/visits', ClinicVisitViewSet, basename='medical-visit')

# Finance (Primary)
router.register(r'finance/terms', TermViewSet, basename='term') 
router.register(r'finance/fees', FeeStructureViewSet, basename='feestructure')
router.register(r'finance/fee-assignments', FeeAssignmentViewSet, basename='feeassignment')
router.register(r'finance/scholarships', ScholarshipAwardViewSet, basename='scholarshipaward')
router.register(r'finance/invoice-adjustments', InvoiceAdjustmentViewSet, basename='invoiceadjustment')
router.register(r'finance/invoices', InvoiceViewSet, basename='invoice')
router.register(r'finance/payments', PaymentViewSet, basename='payment')
router.register(r'finance/expenses', ExpenseViewSet, basename='expense')
router.register(r'finance/budgets', BudgetViewSet, basename='budget')
router.register(r'finance/payment-reversals', PaymentReversalRequestViewSet, basename='payment-reversal')
router.register(r'finance/write-offs', InvoiceWriteOffRequestViewSet, basename='invoice-writeoff-request')
router.register(r'finance/gateway/transactions', PaymentGatewayTransactionViewSet, basename='payment-gateway-transaction')
router.register(r'finance/gateway/events', PaymentGatewayWebhookEventViewSet, basename='payment-gateway-event')
router.register(r'finance/reconciliation/bank-lines', BankStatementLineViewSet, basename='bank-statement-line')
router.register(r'finance/late-fee-rules', LateFeeRuleViewSet, basename='late-fee-rule')
router.register(r'finance/reminders', FeeReminderLogViewSet, basename='fee-reminder')
router.register(r'finance/accounting/periods', AccountingPeriodViewSet, basename='accounting-period')
router.register(r'finance/accounting/accounts', ChartOfAccountViewSet, basename='accounting-account')
router.register(r'finance/accounting/journals', JournalEntryViewSet, basename='accounting-journal')

# ==========================================
# URL PATTERNS
# ==========================================
urlpatterns = [
    # 1. Authentication (JWT)
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),

    # 2. Summary Endpoints (must come before router to avoid /students/{pk} collisions)
    path('finance/summary/', FinancialSummaryView.as_view(), name='financial_summary'),
    path('finance/reports/receivables-aging/', FinanceReceivablesAgingView.as_view(), name='finance_receivables_aging'),
    path('finance/reports/installments-aging/', FinanceInstallmentAgingView.as_view(), name='finance_installments_aging'),
    path('finance/reports/overdue-accounts/', FinanceOverdueAccountsView.as_view(), name='finance_overdue_accounts'),
    path('finance/reports/receivables-aging/export/csv/', FinanceReceivablesAgingCsvExportView.as_view(), name='finance_receivables_aging_csv'),
    path('finance/reports/overdue-accounts/export/csv/', FinanceOverdueAccountsCsvExportView.as_view(), name='finance_overdue_accounts_csv'),
    path('finance/reports/summary/export/csv/', FinanceSummaryCsvExportView.as_view(), name='finance_reports_summary_csv'),
    path('finance/reports/summary/export/pdf/', FinanceSummaryPdfExportView.as_view(), name='finance_reports_summary_pdf'),
    path('finance/accounting/trial-balance/', AccountingTrialBalanceView.as_view(), name='finance_accounting_trial_balance'),
    path('finance/accounting/ledger/', AccountingLedgerView.as_view(), name='finance_accounting_ledger'),
    path('finance/gateway/webhooks/<str:provider>/', FinanceGatewayWebhookView.as_view(), name='finance_gateway_webhook'),
    path('dashboard/routing/', DashboardRoutingView.as_view(), name='dashboard_routing'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('students/summary/', StudentsSummaryView.as_view(), name='students_summary'),
    path('students/dashboard/', StudentsDashboardView.as_view(), name='students_dashboard'),
    path('school/profile/', SchoolProfileView.as_view(), name='school_profile'),
    path('students/reports/summary/', StudentsModuleReportView.as_view(), name='students_reports_summary'),
    path('students/export/csv/', StudentsDirectoryCsvExportView.as_view(), name='students_directory_csv'),
    path('students/export/pdf/', StudentsDirectoryPdfExportView.as_view(), name='students_directory_pdf'),
    path('students/documents/export/csv/', StudentsDocumentsCsvExportView.as_view(), name='students_documents_csv'),
    path('students/documents/export/pdf/', StudentsDocumentsPdfExportView.as_view(), name='students_documents_pdf'),
    path('students/reports/summary/export/csv/', StudentsModuleReportCsvExportView.as_view(), name='students_reports_summary_csv'),
    path('students/reports/summary/export/pdf/', StudentsModuleReportPdfExportView.as_view(), name='students_reports_summary_pdf'),
    path('students/<int:student_id>/operational-summary/', StudentOperationalSummaryView.as_view(), name='student_operational_summary'),
    path('students/<int:student_id>/report/', StudentReportView.as_view(), name='student_report'),
    path('students/<int:student_id>/report/export/csv/', StudentReportCsvExportView.as_view(), name='student_report_csv'),
    path('students/<int:student_id>/report/export/pdf/', StudentReportPdfExportView.as_view(), name='student_report_pdf'),
    path('attendance/summary/', AttendanceSummaryView.as_view(), name='attendance_summary'),
    path('attendance/summary/export/csv/', AttendanceSummaryCsvExportView.as_view(), name='attendance_summary_csv'),
    path('attendance/summary/export/pdf/', AttendanceSummaryPdfExportView.as_view(), name='attendance_summary_pdf'),
    path('attendance/records/export/csv/', AttendanceRecordsCsvExportView.as_view(), name='attendance_records_csv'),
    path('attendance/records/export/pdf/', AttendanceRecordsPdfExportView.as_view(), name='attendance_records_pdf'),
    path('behavior/incidents/export/csv/', BehaviorIncidentsCsvExportView.as_view(), name='behavior_incidents_csv'),
    path('behavior/incidents/export/pdf/', BehaviorIncidentsPdfExportView.as_view(), name='behavior_incidents_pdf'),
    path('medical/records/export/csv/', MedicalProfilesCsvExportView.as_view(), name='medical_profiles_csv'),
    path('medical/records/export/pdf/', MedicalProfilesPdfExportView.as_view(), name='medical_profiles_pdf'),
    path('medical/immunizations/export/csv/', MedicalImmunizationsCsvExportView.as_view(), name='medical_immunizations_csv'),
    path('medical/immunizations/export/pdf/', MedicalImmunizationsPdfExportView.as_view(), name='medical_immunizations_pdf'),
    path('medical/visits/export/csv/', MedicalClinicVisitsCsvExportView.as_view(), name='medical_clinic_visits_csv'),
    path('medical/visits/export/pdf/', MedicalClinicVisitsPdfExportView.as_view(), name='medical_clinic_visits_pdf'),
    path('academics/summary/', AcademicsSummaryView.as_view(), name='academics_summary'),
    path('hr/summary/', HrSummaryView.as_view(), name='hr_summary'),
    path('communication/summary/', CommunicationSummaryView.as_view(), name='communication_summary'),
    path('core/summary/', CoreSummaryView.as_view(), name='core_summary'),
    path('reporting/summary/', ReportingSummaryView.as_view(), name='reporting_summary'),
    path('admin/maintenance/reset-sequences/', TenantSequenceResetView.as_view(), name='tenant_reset_sequences'),

    # 3. Finance Reference Endpoints (Read-Only)
    path('finance/ref/students/', FinanceStudentRefView.as_view(), name='finance_ref_students'),
    path('finance/ref/enrollments/', FinanceEnrollmentRefView.as_view(), name='finance_ref_enrollments'),

    # 4. Module Apps (Read-Only Reference Contracts)
    path('tenant/modules', TenantModuleListView.as_view(), name='tenant_modules'),
    path('tenant/modules/<int:module_id>/settings', TenantModuleSettingsView.as_view(), name='tenant_module_settings'),
    path('staff/', include('staff_mgmt.urls')),
    path('admissions/', include('admissions.urls')),
    path('academics/', include('academics.urls')),
    path('hr/', include('hr.urls')),
    path('assets/', include('assets.urls')),
    path('communication/', include('communication.urls')),
    path('library/', include('library.urls')),
    path('parent-portal/', include('parent_portal.urls')),
    path('reporting/', include('reporting.urls')),

    # 5. Tenant API Routes (Router)
    path('', include(router.urls)),
]
