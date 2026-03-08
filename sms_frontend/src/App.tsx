import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { isModuleRouteEnabled } from './config/moduleFocus'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const StudentsDashboardPage = lazy(() => import('./pages/StudentsDashboardPage'))
const StudentsLayout = lazy(() => import('./pages/students/StudentsLayout'))
const StudentsDirectoryPage = lazy(() => import('./pages/students/StudentsDirectoryPage'))
const StudentsAdmissionsPage = lazy(() => import('./pages/students/StudentsAdmissionsPage'))
const StudentsAttendancePage = lazy(() => import('./pages/students/StudentsAttendancePage'))
const StudentsBehaviorPage = lazy(() => import('./pages/students/StudentsBehaviorPage'))
const StudentsMedicalPage = lazy(() => import('./pages/students/StudentsMedicalPage'))
const StudentsDocumentsPage = lazy(() => import('./pages/students/StudentsDocumentsPage'))
const StudentsReportsPage = lazy(() => import('./pages/students/StudentsReportsPage'))
const StudentProfilePage = lazy(() => import('./pages/students/StudentProfilePage'))
const FinanceLayout = lazy(() => import('./pages/finance/FinanceLayout'))
const FinanceSummaryPage = lazy(() => import('./pages/finance/FinanceSummaryPage'))
const FinanceInvoicesPage = lazy(() => import('./pages/finance/FinanceInvoicesPage'))
const FinanceInvoiceFormPage = lazy(() => import('./pages/finance/FinanceInvoiceFormPage'))
const FinancePaymentsPage = lazy(() => import('./pages/finance/FinancePaymentsPage'))
const FinancePaymentFormPage = lazy(() => import('./pages/finance/FinancePaymentFormPage'))
const FinanceExpensesPage = lazy(() => import('./pages/finance/FinanceExpensesPage'))
const FinanceExpenseFormPage = lazy(() => import('./pages/finance/FinanceExpenseFormPage'))
const FinanceFeeStructuresPage = lazy(() => import('./pages/finance/FinanceFeeStructuresPage'))
const FinanceFeeStructureFormPage = lazy(() => import('./pages/finance/FinanceFeeStructureFormPage'))
const FinanceFeeAssignmentsPage = lazy(() => import('./pages/finance/FinanceFeeAssignmentsPage'))
const FinanceFeeAssignmentFormPage = lazy(() => import('./pages/finance/FinanceFeeAssignmentFormPage'))
const FinanceAdjustmentsPage = lazy(() => import('./pages/finance/FinanceAdjustmentsPage'))
const FinanceAdjustmentFormPage = lazy(() => import('./pages/finance/FinanceAdjustmentFormPage'))
const FinanceReportsPage = lazy(() => import('./pages/finance/FinanceReportsPage'))
const FinanceAccountsPage = lazy(() => import('./pages/finance/FinanceAccountsPage'))
const FinanceReconciliationPage = lazy(() => import('./pages/finance/FinanceReconciliationPage'))
const FinanceScholarshipsPage = lazy(() => import('./pages/finance/FinanceScholarshipsPage'))
const FinanceRefundsPage = lazy(() => import('./pages/finance/FinanceRefundsPage'))
const FinanceVoteHeadsPage = lazy(() => import('./pages/finance/FinanceVoteHeadsPage'))
const FinanceCashbookPage = lazy(() => import('./pages/finance/FinanceCashbookPage'))
const FinanceArrearsPage = lazy(() => import('./pages/finance/FinanceArrearsPage'))
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'))
const ModuleSettingsPage = lazy(() => import('./pages/settings/ModuleSettingsPage'))
const ParentsLayout = lazy(() => import('./pages/parents/ParentsLayout'))
const ParentsSummaryPage = lazy(() => import('./pages/parents/ParentsSummaryPage'))
const ParentsDirectoryPage = lazy(() => import('./pages/parents/ParentsDirectoryPage'))
const AcademicsLayout = lazy(() => import('./pages/academics/AcademicsLayout'))
const AcademicsDashboardPage = lazy(() => import('./pages/academics/AcademicsDashboardPage'))
const AcademicsStructurePage = lazy(() => import('./pages/academics/AcademicsStructurePage'))
const AcademicsSubjectsPage = lazy(() => import('./pages/academics/AcademicsSubjectsPage'))
const AcademicsClassManagementPage = lazy(() => import('./pages/academics/AcademicsClassManagementPage'))
const AcademicsGradebookPage = lazy(() => import('./pages/academics/AcademicsGradebookPage'))
const AcademicsReportCardsPage = lazy(() => import('./pages/academics/AcademicsReportCardsPage'))
const AcademicsAssignmentsPage = lazy(() => import('./pages/academics/AcademicsAssignmentsPage'))
const AcademicsCalendarPage = lazy(() => import('./pages/academics/AcademicsCalendarPage'))
const AcademicsAnalyticsPage = lazy(() => import('./pages/academics/AcademicsAnalyticsPage'))
const HrLayout = lazy(() => import('./pages/hr/HrLayout'))
const HrDashboardPage = lazy(() => import('./pages/hr/HrDashboardPage'))
const HrEmployeesPage = lazy(() => import('./pages/hr/HrEmployeesPage'))
const HrEmployeeProfilePage = lazy(() => import('./pages/hr/HrEmployeeProfilePage'))
const HrOrganizationPage = lazy(() => import('./pages/hr/HrOrganizationPage'))
const HrAttendancePage = lazy(() => import('./pages/hr/HrAttendancePage'))
const HrLeavePage = lazy(() => import('./pages/hr/HrLeavePage'))
const HrPayrollPage = lazy(() => import('./pages/hr/HrPayrollPage'))
const HrRecruitmentPage = lazy(() => import('./pages/hr/HrRecruitmentPage'))
const HrOnboardingPage = lazy(() => import('./pages/hr/HrOnboardingPage'))
const HrPerformancePage = lazy(() => import('./pages/hr/HrPerformancePage'))
const HrTrainingPage = lazy(() => import('./pages/hr/HrTrainingPage'))
const HrAnalyticsPage = lazy(() => import('./pages/hr/HrAnalyticsPage'))
const StaffLayout = lazy(() => import('./pages/staff/StaffLayout'))
const StaffDashboardPage = lazy(() => import('./pages/staff/StaffDashboardPage'))
const StaffDirectoryPage = lazy(() => import('./pages/staff/StaffDirectoryPage'))
const StaffProfilesPage = lazy(() => import('./pages/staff/StaffProfilesPage'))
const StaffDepartmentsRolesPage = lazy(() => import('./pages/staff/StaffDepartmentsRolesPage'))
const StaffAttendancePage = lazy(() => import('./pages/staff/StaffAttendancePage'))
const StaffPerformancePage = lazy(() => import('./pages/staff/StaffPerformancePage'))
const StaffDocumentsPage = lazy(() => import('./pages/staff/StaffDocumentsPage'))
const StaffAnalyticsPage = lazy(() => import('./pages/staff/StaffAnalyticsPage'))
const CommunicationLayout = lazy(() => import('./pages/communication/CommunicationLayout'))
const CommunicationDashboardPage = lazy(() => import('./pages/communication/CommunicationDashboardPage'))
const CommunicationMessagingPage = lazy(() => import('./pages/communication/CommunicationMessagingPage'))
const CommunicationNotificationsPage = lazy(() => import('./pages/communication/CommunicationNotificationsPage'))
const CommunicationEmailPage = lazy(() => import('./pages/communication/CommunicationEmailPage'))
const CommunicationSmsPage = lazy(() => import('./pages/communication/CommunicationSmsPage'))
const CommunicationTemplatesPage = lazy(() => import('./pages/communication/CommunicationTemplatesPage'))
const CommunicationAnnouncementsPage = lazy(() => import('./pages/communication/CommunicationAnnouncementsPage'))
const CommunicationAnalyticsPage = lazy(() => import('./pages/communication/CommunicationAnalyticsPage'))
const CommunicationParentPage = lazy(() => import('./pages/communication/CommunicationParentPage'))
const ParentPortalLayout = lazy(() => import('./pages/parentPortal/ParentPortalLayout'))
const ParentPortalDashboardPage = lazy(() => import('./pages/parentPortal/ParentPortalDashboardPage'))
const ParentPortalAcademicsPage = lazy(() => import('./pages/parentPortal/ParentPortalAcademicsPage'))
const ParentPortalAttendancePage = lazy(() => import('./pages/parentPortal/ParentPortalAttendancePage'))
const ParentPortalFinancePage = lazy(() => import('./pages/parentPortal/ParentPortalFinancePage'))
const ParentPortalCommunicationPage = lazy(() => import('./pages/parentPortal/ParentPortalCommunicationPage'))
const ParentPortalSchedulePage = lazy(() => import('./pages/parentPortal/ParentPortalSchedulePage'))
const ParentPortalAssignmentsPage = lazy(() => import('./pages/parentPortal/ParentPortalAssignmentsPage'))
const ParentPortalLibraryProfilePage = lazy(() => import('./pages/parentPortal/ParentPortalLibraryProfilePage'))
const LibraryLayout = lazy(() => import('./pages/library/LibraryLayout'))
const LibraryDashboardPage = lazy(() => import('./pages/library/LibraryDashboardPage'))
const LibraryCatalogPage = lazy(() => import('./pages/library/LibraryCatalogPage'))
const LibraryCirculationPage = lazy(() => import('./pages/library/LibraryCirculationPage'))
const LibraryReservationsPage = lazy(() => import('./pages/library/LibraryReservationsPage'))
const LibraryMembersPage = lazy(() => import('./pages/library/LibraryMembersPage'))
const LibraryFinesPage = lazy(() => import('./pages/library/LibraryFinesPage'))
const LibraryInventoryPage = lazy(() => import('./pages/library/LibraryInventoryPage'))
const LibraryAcquisitionPage = lazy(() => import('./pages/library/LibraryAcquisitionPage'))
const LibraryReportsPage = lazy(() => import('./pages/library/LibraryReportsPage'))
const AdmissionsLayout = lazy(() => import('./pages/admissions/AdmissionsLayout'))
const AdmissionsDashboardPage = lazy(() => import('./pages/admissions/AdmissionsDashboardPage'))
const AdmissionsApplicationsPage = lazy(() => import('./pages/admissions/AdmissionsApplicationsPage'))
const AdmissionsInquiriesPage = lazy(() => import('./pages/admissions/AdmissionsInquiriesPage'))
const AdmissionsReviewsPage = lazy(() => import('./pages/admissions/AdmissionsReviewsPage'))
const AdmissionsAssessmentsPage = lazy(() => import('./pages/admissions/AdmissionsAssessmentsPage'))
const AdmissionsInterviewsPage = lazy(() => import('./pages/admissions/AdmissionsInterviewsPage'))
const AdmissionsDecisionsPage = lazy(() => import('./pages/admissions/AdmissionsDecisionsPage'))
const AdmissionsEnrollmentPage = lazy(() => import('./pages/admissions/AdmissionsEnrollmentPage'))
const AdmissionsAnalyticsPage = lazy(() => import('./pages/admissions/AdmissionsAnalyticsPage'))
const AssetsLayout = lazy(() => import('./pages/assets/AssetsLayout'))
const AssetsDashboardPage = lazy(() => import('./pages/assets/AssetsDashboardPage'))
const AssetsRegistryPage = lazy(() => import('./pages/assets/AssetsRegistryPage'))
const AssetsCategoriesPage = lazy(() => import('./pages/assets/AssetsCategoriesPage'))
const AssetsAssignmentsPage = lazy(() => import('./pages/assets/AssetsAssignmentsPage'))
const AssetsMaintenancePage = lazy(() => import('./pages/assets/AssetsMaintenancePage'))
const PlatformLoginPage = lazy(() => import('./pages/platform/PlatformLoginPage'))
const PlatformLayout = lazy(() => import('./pages/platform/PlatformLayout'))
const PlatformOverviewPage = lazy(() => import('./pages/platform/PlatformOverviewPage'))
const PlatformTenantsPage = lazy(() => import('./pages/platform/PlatformTenantsPage'))
const PlatformBillingPage = lazy(() => import('./pages/platform/PlatformBillingPage'))
const PlatformSupportPage = lazy(() => import('./pages/platform/PlatformSupportPage'))
const PlatformImpersonationPage = lazy(() => import('./pages/platform/PlatformImpersonationPage'))
const PlatformMonitoringPage = lazy(() => import('./pages/platform/PlatformMonitoringPage'))
const PlatformDeploymentPage = lazy(() => import('./pages/platform/PlatformDeploymentPage'))
const PlatformBackupRecoveryPage = lazy(() => import('./pages/platform/PlatformBackupRecoveryPage'))
const PlatformSecurityCompliancePage = lazy(() => import('./pages/platform/PlatformSecurityCompliancePage'))
const PlatformActionLogsPage = lazy(() => import('./pages/platform/PlatformActionLogsPage'))
const PlatformSettingsPage = lazy(() => import('./pages/platform/PlatformSettingsPage'))
const PlatformAdminUsersPage = lazy(() => import('./pages/platform/PlatformAdminUsersPage'))

function RouteLoader() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6">
        <p className="text-sm tracking-wide text-slate-400">Loading module...</p>
      </div>
    </div>
  )
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authMode = useAuthStore((state) => state.authMode)
  const isTenantAuth = isAuthenticated && authMode === 'tenant'
  const isPlatformAuth = isAuthenticated && authMode === 'platform'
  const studentsEnabled = isModuleRouteEnabled('students')
  const admissionsEnabled = isModuleRouteEnabled('admissions')
  const financeEnabled = isModuleRouteEnabled('finance')
  const parentsEnabled = isModuleRouteEnabled('parents')
  const academicsEnabled = isModuleRouteEnabled('academics')
  const hrEnabled = isModuleRouteEnabled('hr')
  const staffEnabled = isModuleRouteEnabled('staff')
  const communicationEnabled = isModuleRouteEnabled('communication')
  const parentPortalEnabled = isModuleRouteEnabled('parent-portal')
  const libraryEnabled = isModuleRouteEnabled('library')
  const assetsEnabled = isModuleRouteEnabled('assets')
  const settingsEnabled = isModuleRouteEnabled('settings')

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            isTenantAuth ? <Navigate to="/dashboard" replace /> : isPlatformAuth ? <Navigate to="/platform" replace /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/login"
          element={isTenantAuth ? <Navigate to="/dashboard" replace /> : isPlatformAuth ? <Navigate to="/platform" replace /> : <LoginPage />}
        />
        <Route
          path="/platform/login"
          element={isPlatformAuth ? <Navigate to="/platform" replace /> : isTenantAuth ? <Navigate to="/dashboard" replace /> : <PlatformLoginPage />}
        />
        <Route
          path="/dashboard"
          element={isTenantAuth ? <DashboardPage /> : <Navigate to={isPlatformAuth ? '/platform' : '/login'} replace />}
        />
        <Route
          path="/platform/*"
          element={isPlatformAuth ? <PlatformLayout /> : <Navigate to="/platform/login" replace />}
        >
          <Route index element={<PlatformOverviewPage />} />
          <Route path="tenants" element={<PlatformTenantsPage />} />
          <Route path="billing" element={<PlatformBillingPage />} />
          <Route path="support" element={<PlatformSupportPage />} />
          <Route path="impersonation" element={<PlatformImpersonationPage />} />
          <Route path="monitoring" element={<PlatformMonitoringPage />} />
          <Route path="deployment" element={<PlatformDeploymentPage />} />
          <Route path="backup-recovery" element={<PlatformBackupRecoveryPage />} />
          <Route path="security-compliance" element={<PlatformSecurityCompliancePage />} />
          <Route path="action-logs" element={<PlatformActionLogsPage />} />
          <Route path="settings" element={<PlatformSettingsPage />} />
          <Route path="admin-users" element={<PlatformAdminUsersPage />} />
        </Route>
        <Route
          path="/modules"
          element={<Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        />
        <Route
          path="/modules/students/*"
          element={isTenantAuth && studentsEnabled ? <StudentsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<StudentsDashboardPage />} />
          <Route path="directory" element={<StudentsDirectoryPage />} />
          <Route path="admissions" element={<StudentsAdmissionsPage />} />
          <Route path="attendance" element={<StudentsAttendancePage />} />
          <Route path="behavior" element={<StudentsBehaviorPage />} />
          <Route path="medical" element={<StudentsMedicalPage />} />
          <Route path="documents" element={<StudentsDocumentsPage />} />
          <Route path="reports" element={<StudentsReportsPage />} />
          <Route path=":id" element={<StudentProfilePage />} />
        </Route>
        <Route
          path="/modules/admissions/*"
          element={isTenantAuth && admissionsEnabled ? <AdmissionsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/admissions/dashboard" replace />} />
          <Route path="dashboard" element={<AdmissionsDashboardPage />} />
          <Route path="inquiries" element={<AdmissionsInquiriesPage />} />
          <Route path="applications" element={<AdmissionsApplicationsPage />} />
          <Route path="reviews" element={<AdmissionsReviewsPage />} />
          <Route path="assessments" element={<AdmissionsAssessmentsPage />} />
          <Route path="interviews" element={<AdmissionsInterviewsPage />} />
          <Route path="decisions" element={<AdmissionsDecisionsPage />} />
          <Route path="enrollment" element={<AdmissionsEnrollmentPage />} />
          <Route path="analytics" element={<AdmissionsAnalyticsPage />} />
          <Route path="legacy" element={<StudentsAdmissionsPage />} />
        </Route>
        <Route
          path="/modules/finance/*"
          element={isTenantAuth && financeEnabled ? <FinanceLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<FinanceSummaryPage />} />
          <Route path="invoices" element={<FinanceInvoicesPage />} />
          <Route path="invoices/new" element={<FinanceInvoiceFormPage />} />
          <Route path="invoices/:id/edit" element={<FinanceInvoiceFormPage />} />
          <Route path="payments" element={<FinancePaymentsPage />} />
          <Route path="payments/new" element={<FinancePaymentFormPage />} />
          <Route path="expenses" element={<FinanceExpensesPage />} />
          <Route path="expenses/new" element={<FinanceExpenseFormPage />} />
          <Route path="expenses/:id/edit" element={<FinanceExpenseFormPage />} />
          <Route path="fee-structures" element={<FinanceFeeStructuresPage />} />
          <Route path="fee-structures/new" element={<FinanceFeeStructureFormPage />} />
          <Route path="fee-structures/:id/edit" element={<FinanceFeeStructureFormPage />} />
          <Route path="fee-assignments" element={<FinanceFeeAssignmentsPage />} />
          <Route path="fee-assignments/new" element={<FinanceFeeAssignmentFormPage />} />
          <Route path="fee-assignments/:id/edit" element={<FinanceFeeAssignmentFormPage />} />
          <Route path="adjustments" element={<FinanceAdjustmentsPage />} />
          <Route path="adjustments/new" element={<FinanceAdjustmentFormPage />} />
          <Route path="budgets" element={<Navigate to="/modules/finance/expenses" replace />} />
          <Route path="accounts" element={<FinanceAccountsPage />} />
          <Route path="reconciliation" element={<FinanceReconciliationPage />} />
          <Route path="reports" element={<FinanceReportsPage />} />
          <Route path="scholarships" element={<FinanceScholarshipsPage />} />
          <Route path="refunds" element={<FinanceRefundsPage />} />
          <Route path="vote-heads" element={<FinanceVoteHeadsPage />} />
          <Route path="cashbook" element={<FinanceCashbookPage />} />
          <Route path="arrears" element={<FinanceArrearsPage />} />
          <Route path="settings" element={<Navigate to="/settings/finance" replace />} />
        </Route>
        <Route
          path="/modules/parents/*"
          element={isTenantAuth && parentsEnabled ? <ParentsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<ParentsSummaryPage />} />
          <Route path="directory" element={<ParentsDirectoryPage />} />
        </Route>
        <Route
          path="/modules/academics/*"
          element={isTenantAuth && academicsEnabled ? <AcademicsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/academics/dashboard" replace />} />
          <Route path="dashboard" element={<AcademicsDashboardPage />} />
          <Route path="structure" element={<AcademicsStructurePage />} />
          <Route path="subjects" element={<AcademicsSubjectsPage />} />
          <Route path="class-management" element={<AcademicsClassManagementPage />} />
          <Route path="gradebook" element={<AcademicsGradebookPage />} />
          <Route path="report-cards" element={<AcademicsReportCardsPage />} />
          <Route path="assignments" element={<AcademicsAssignmentsPage />} />
          <Route path="calendar" element={<AcademicsCalendarPage />} />
          <Route path="analytics" element={<AcademicsAnalyticsPage />} />
        </Route>
        <Route
          path="/modules/hr/*"
          element={isTenantAuth && hrEnabled ? <HrLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/hr/dashboard" replace />} />
          <Route path="dashboard" element={<HrDashboardPage />} />
          <Route path="employees" element={<HrEmployeesPage />} />
          <Route path="employees/:id" element={<HrEmployeeProfilePage />} />
          <Route path="organization" element={<HrOrganizationPage />} />
          <Route path="attendance" element={<HrAttendancePage />} />
          <Route path="leave" element={<HrLeavePage />} />
          <Route path="payroll" element={<HrPayrollPage />} />
          <Route path="recruitment" element={<HrRecruitmentPage />} />
          <Route path="onboarding" element={<HrOnboardingPage />} />
          <Route path="performance" element={<HrPerformancePage />} />
          <Route path="training" element={<HrTrainingPage />} />
          <Route path="analytics" element={<HrAnalyticsPage />} />
        </Route>
        <Route
          path="/modules/staff/*"
          element={isTenantAuth && staffEnabled ? <StaffLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/staff/dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="directory" element={<StaffDirectoryPage />} />
          <Route path="profiles" element={<StaffProfilesPage />} />
          <Route path="departments-roles" element={<StaffDepartmentsRolesPage />} />
          <Route path="attendance" element={<StaffAttendancePage />} />
          <Route path="performance" element={<StaffPerformancePage />} />
          <Route path="documents" element={<StaffDocumentsPage />} />
          <Route path="analytics" element={<StaffAnalyticsPage />} />
        </Route>
        <Route
          path="/modules/communication/*"
          element={isTenantAuth && communicationEnabled ? <CommunicationLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/communication/dashboard" replace />} />
          <Route path="dashboard" element={<CommunicationDashboardPage />} />
          <Route path="messaging" element={<CommunicationMessagingPage />} />
          <Route path="notifications" element={<CommunicationNotificationsPage />} />
          <Route path="email" element={<CommunicationEmailPage />} />
          <Route path="sms" element={<CommunicationSmsPage />} />
          <Route path="templates" element={<CommunicationTemplatesPage />} />
          <Route path="announcements" element={<CommunicationAnnouncementsPage />} />
          <Route path="analytics" element={<CommunicationAnalyticsPage />} />
          <Route path="parent" element={<CommunicationParentPage />} />
        </Route>
        <Route
          path="/modules/parent-portal/*"
          element={isTenantAuth && parentPortalEnabled ? <ParentPortalLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/parent-portal/dashboard" replace />} />
          <Route path="dashboard" element={<ParentPortalDashboardPage />} />
          <Route path="academics" element={<ParentPortalAcademicsPage />} />
          <Route path="attendance" element={<ParentPortalAttendancePage />} />
          <Route path="finance" element={<ParentPortalFinancePage />} />
          <Route path="communication" element={<ParentPortalCommunicationPage />} />
          <Route path="schedule" element={<ParentPortalSchedulePage />} />
          <Route path="assignments" element={<ParentPortalAssignmentsPage />} />
          <Route path="library-profile" element={<ParentPortalLibraryProfilePage />} />
        </Route>
        <Route
          path="/modules/library/*"
          element={isTenantAuth && libraryEnabled ? <LibraryLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/library/dashboard" replace />} />
          <Route path="dashboard" element={<LibraryDashboardPage />} />
          <Route path="catalog" element={<LibraryCatalogPage />} />
          <Route path="circulation" element={<LibraryCirculationPage />} />
          <Route path="reservations" element={<LibraryReservationsPage />} />
          <Route path="members" element={<LibraryMembersPage />} />
          <Route path="fines" element={<LibraryFinesPage />} />
          <Route path="inventory" element={<LibraryInventoryPage />} />
          <Route path="acquisition" element={<LibraryAcquisitionPage />} />
          <Route path="reports" element={<LibraryReportsPage />} />
        </Route>
        <Route
          path="/modules/assets/*"
          element={isTenantAuth && assetsEnabled ? <AssetsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/assets/dashboard" replace />} />
          <Route path="dashboard" element={<AssetsDashboardPage />} />
          <Route path="registry" element={<AssetsRegistryPage />} />
          <Route path="categories" element={<AssetsCategoriesPage />} />
          <Route path="assignments" element={<AssetsAssignmentsPage />} />
          <Route path="maintenance" element={<AssetsMaintenancePage />} />
        </Route>
        <Route
          path="/settings"
          element={isTenantAuth && settingsEnabled ? <SettingsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/settings/global" replace />} />
          <Route path=":module" element={<ModuleSettingsPage />} />
        </Route>
        <Route path="/modules/:moduleKey" element={<Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
