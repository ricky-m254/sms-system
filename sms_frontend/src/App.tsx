import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StudentsDashboardPage from './pages/StudentsDashboardPage'
import FinanceLayout from './pages/finance/FinanceLayout'
import FinanceSummaryPage from './pages/finance/FinanceSummaryPage'
import FinanceInvoicesPage from './pages/finance/FinanceInvoicesPage'
import FinanceInvoiceFormPage from './pages/finance/FinanceInvoiceFormPage'
import FinancePaymentsPage from './pages/finance/FinancePaymentsPage'
import FinancePaymentFormPage from './pages/finance/FinancePaymentFormPage'
import FinanceExpensesPage from './pages/finance/FinanceExpensesPage'
import FinanceExpenseFormPage from './pages/finance/FinanceExpenseFormPage'
import FinanceFeeStructuresPage from './pages/finance/FinanceFeeStructuresPage'
import FinanceFeeStructureFormPage from './pages/finance/FinanceFeeStructureFormPage'
import FinanceFeeAssignmentsPage from './pages/finance/FinanceFeeAssignmentsPage'
import FinanceFeeAssignmentFormPage from './pages/finance/FinanceFeeAssignmentFormPage'
import FinanceAdjustmentsPage from './pages/finance/FinanceAdjustmentsPage'
import FinanceAdjustmentFormPage from './pages/finance/FinanceAdjustmentFormPage'
import SettingsLayout from './pages/settings/SettingsLayout'
import ModuleSettingsPage from './pages/settings/ModuleSettingsPage'
import ModuleDashboardPage from './pages/ModuleDashboardPage'
import ParentsLayout from './pages/parents/ParentsLayout'
import ParentsSummaryPage from './pages/parents/ParentsSummaryPage'
import ParentsDirectoryPage from './pages/parents/ParentsDirectoryPage'
import { useAuthStore } from './store/auth'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/modules/students"
        element={isAuthenticated ? <StudentsDashboardPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/modules/finance/*"
        element={isAuthenticated ? <FinanceLayout /> : <Navigate to="/login" replace />}
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
        <Route path="settings" element={<Navigate to="/settings/finance" replace />} />
      </Route>
      <Route
        path="/modules/parents/*"
        element={isAuthenticated ? <ParentsLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<ParentsSummaryPage />} />
        <Route path="directory" element={<ParentsDirectoryPage />} />
      </Route>
      <Route
        path="/settings"
        element={isAuthenticated ? <SettingsLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/settings/global" replace />} />
        <Route path=":module" element={<ModuleSettingsPage />} />
      </Route>
      <Route
        path="/modules/:moduleKey"
        element={isAuthenticated ? <ModuleDashboardPage /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
