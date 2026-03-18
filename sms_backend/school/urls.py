from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenRefreshView
from .views import SmartCampusTokenObtainPairView
from .views import (
    StudentSearchForUserCreateView, StudentsByClassForUserCreateView,
    BulkCreateStudentUsersView, VoteHeadBudgetReportView,
)
from .views import (
    EnrollmentViewSet, ExpenseViewSet, FeeStructureViewSet, MessageViewSet, 
    StaffViewSet, StudentViewSet, InvoiceViewSet, PaymentViewSet, 
    DepartmentViewSet,
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
    AcademicsCurrentContextView, BulkOptionalChargeByClassView,
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
    FinanceStudentRefView, FinanceEnrollmentRefView, FinanceClassRefView, BulkFeeAssignByClassView,
    FeeAssignmentViewSet, InvoiceAdjustmentViewSet,
    ScholarshipAwardViewSet, OptionalChargeViewSet, StudentOptionalChargeViewSet,
    TenantSequenceResetView,
    AttendanceRecordViewSet,
    AttendanceSummaryView,
    BehaviorIncidentViewSet,
    MedicalRecordViewSet,
    ImmunizationRecordViewSet,
    ClinicVisitViewSet,
    TenantModuleListView,
    TenantModuleSettingsView,
    VoteHeadViewSet, VoteHeadPaymentAllocationViewSet,
    CashbookEntryViewSet, CashbookSummaryView,
    BalanceCarryForwardViewSet,
    StoreCategoryViewSet, StoreItemViewSet, StoreTransactionViewSet,
    StoreOrderRequestViewSet, StoreOrderReviewView, StoreDashboardView,
    DispensaryVisitViewSet, DispensaryPrescriptionViewSet, DispensaryStockViewSet, DispensaryDashboardView,
    DispensaryDeliveryNoteViewSet, DispensaryOutsideTreatmentViewSet,
    StudentTransferViewSet,
    FinanceArrearsView,
    FinanceVoteHeadAllocationReportView,
    FinanceClassBalancesReportView,
    FinanceArrearsByTermReportView,
    FinanceBudgetVarianceReportView,
    FinanceReceiptPdfView,
    FinanceStudentLedgerView,
    RoleListView,
    RoleModuleAccessView,
    SubmodulePermissionView,
    UserManagementListCreateView,
    UserManagementDetailView,
    DemoResetView,
    CurrentUserView,
    SchoolClassListView,
    ModuleSeedView,
)

# ==========================================
# URL ROUTER (TENANT DATA)
# ==========================================
router = DefaultRouter()

# Shared / cross-module
router.register(r'school/departments', DepartmentViewSet, basename='department')

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
router.register(r'finance/optional-charges', OptionalChargeViewSet, basename='optional-charge')
router.register(r'finance/student-optional-charges', StudentOptionalChargeViewSet, basename='student-optional-charge')
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
router.register(r'finance/vote-heads', VoteHeadViewSet, basename='vote-head')
router.register(r'finance/vote-head-allocations', VoteHeadPaymentAllocationViewSet, basename='vote-head-allocation')
router.register(r'finance/cashbook', CashbookEntryViewSet, basename='cashbook-entry')
router.register(r'finance/carry-forwards', BalanceCarryForwardViewSet, basename='carry-forward')
router.register(r'store/categories', StoreCategoryViewSet, basename='store-category')
router.register(r'store/items', StoreItemViewSet, basename='store-item')
router.register(r'store/transactions', StoreTransactionViewSet, basename='store-transaction')
router.register(r'store/orders', StoreOrderRequestViewSet, basename='store-order')
router.register(r'dispensary/visits', DispensaryVisitViewSet, basename='dispensary-visit')
router.register(r'dispensary/prescriptions', DispensaryPrescriptionViewSet, basename='dispensary-prescription')
router.register(r'dispensary/stock', DispensaryStockViewSet, basename='dispensary-stock')
router.register(r'dispensary/delivery-notes', DispensaryDeliveryNoteViewSet, basename='dispensary-delivery-note')
router.register(r'dispensary/outside-treatments', DispensaryOutsideTreatmentViewSet, basename='dispensary-outside-treatment')
router.register(r'student-transfers', StudentTransferViewSet, basename='student-transfer')

# ==========================================
# URL PATTERNS
# ==========================================
urlpatterns = [
    # 1. Authentication (JWT)
    path('auth/login/', SmartCampusTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),

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
    path('school/demo/reset/', DemoResetView.as_view(), name='demo_reset'),
    path('school/seed/', ModuleSeedView.as_view(), name='module_seed'),
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
    path('school/classes/', SchoolClassListView.as_view(), name='school_classes'),
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
    path('academics/current/', AcademicsCurrentContextView.as_view(), name='academics_current'),
    path('finance/optional-charges/by-class/', BulkOptionalChargeByClassView.as_view(), name='optional_charge_by_class'),
    path('academics/summary/', AcademicsSummaryView.as_view(), name='academics_summary'),
    path('hr/summary/', HrSummaryView.as_view(), name='hr_summary'),
    path('communication/summary/', CommunicationSummaryView.as_view(), name='communication_summary'),
    path('core/summary/', CoreSummaryView.as_view(), name='core_summary'),
    path('reporting/summary/', ReportingSummaryView.as_view(), name='reporting_summary'),
    path('admin/maintenance/reset-sequences/', TenantSequenceResetView.as_view(), name='tenant_reset_sequences'),

    # 3. Finance Reference Endpoints (Read-Only)
    path('finance/ref/students/', FinanceStudentRefView.as_view(), name='finance_ref_students'),
    path('finance/ref/enrollments/', FinanceEnrollmentRefView.as_view(), name='finance_ref_enrollments'),
    path('finance/ref/classes/', FinanceClassRefView.as_view(), name='finance_ref_classes'),
    path('finance/fee-assignments/by-class/', BulkFeeAssignByClassView.as_view(), name='fee_assign_by_class'),
    path('finance/cashbook/summary/', CashbookSummaryView.as_view(), name='finance_cashbook_summary'),
    path('finance/reports/arrears/', FinanceArrearsView.as_view(), name='finance_arrears_report'),
    path('finance/reports/vote-head-allocation/', FinanceVoteHeadAllocationReportView.as_view(), name='finance_vote_head_allocation_report'),
    path('finance/reports/class-balances/', FinanceClassBalancesReportView.as_view(), name='finance_class_balances_report'),
    path('finance/reports/arrears-by-term/', FinanceArrearsByTermReportView.as_view(), name='finance_arrears_by_term_report'),
    path('finance/reports/budget-variance/', FinanceBudgetVarianceReportView.as_view(), name='finance_budget_variance_report'),
    path('finance/reports/vote-head-budget/', VoteHeadBudgetReportView.as_view(), name='finance_vote_head_budget_report'),
    path('finance/payments/<int:pk>/receipt/pdf/', FinanceReceiptPdfView.as_view(), name='finance_receipt_pdf'),
    path('finance/students/<int:student_id>/ledger/', FinanceStudentLedgerView.as_view(), name='finance_student_ledger'),

    # Store module
    path('store/orders/<int:pk>/review/', StoreOrderReviewView.as_view(), name='store_order_review'),
    path('store/dashboard/', StoreDashboardView.as_view(), name='store_dashboard'),

    # Dispensary module
    path('dispensary/dashboard/', DispensaryDashboardView.as_view(), name='dispensary_dashboard'),

    # User management
    path('users/roles/', RoleListView.as_view(), name='user_roles'),
    path('users/role-modules/', RoleModuleAccessView.as_view(), name='role_module_access'),
    path('users/submodule-permissions/', SubmodulePermissionView.as_view(), name='submodule_permissions'),
    path('users/student-search/', StudentSearchForUserCreateView.as_view(), name='user_student_search'),
    path('users/students-by-class/', StudentsByClassForUserCreateView.as_view(), name='user_students_by_class'),
    path('users/bulk-create-students/', BulkCreateStudentUsersView.as_view(), name='user_bulk_create_students'),
    path('users/', UserManagementListCreateView.as_view(), name='user_list_create'),
    path('users/<int:user_id>/', UserManagementDetailView.as_view(), name='user_detail'),

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
    path('clockin/', include('clockin.urls')),
    path('timetable/', include('timetable.urls')),
    path('transport/', include('transport.urls')),
    path('visitors/', include('visitor_mgmt.urls')),
    path('examinations/', include('examinations.urls')),
    path('alumni/', include('alumni.urls')),
    path('hostel/', include('hostel.urls')),
    path('ptm/', include('ptm.urls')),
    path('sports/', include('sports.urls')),
    path('cafeteria/', include('cafeteria.urls')),
    path('curriculum/', include('curriculum.urls')),
    path('maintenance/', include('maintenance.urls')),
    path('elearning/', include('elearning.urls')),
    path('analytics/', include('analytics.urls')),

    # 5. Tenant API Routes (Router)
    path('', include(router.urls)),
]
