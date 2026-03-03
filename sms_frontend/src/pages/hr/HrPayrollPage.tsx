import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'

type Employee = {
  id: number
  employee_id: string
  full_name: string
}

type SalaryStructure = {
  id: number
  employee: number
  employee_name: string
  basic_salary: string
  currency: string
  pay_frequency: string
  effective_from: string
  effective_to: string | null
}

type SalaryComponent = {
  id: number
  structure: number
  component_type: 'Allowance' | 'Deduction'
  name: string
  amount_type: 'Fixed' | 'Percentage'
  amount: string
  is_taxable: boolean
  is_statutory: boolean
}

type PayrollItem = {
  id: number
  payroll: number
  employee: number
  employee_name: string
  basic_salary: string
  total_allowances: string
  total_deductions: string
  gross_salary: string
  net_salary: string
  days_worked: string
  overtime_hours: string
  sent_at: string | null
}

type PayrollBatch = {
  id: number
  month: number
  year: number
  status: string
  total_gross: string
  total_deductions: string
  total_net: string
  payment_date: string | null
  created_at: string
  items?: PayrollItem[]
}

const defaultStructureForm = {
  employee: '',
  basic_salary: '',
  currency: 'USD',
  pay_frequency: 'Monthly',
  effective_from: '',
  effective_to: '',
}

const defaultComponentForm = {
  structure: '',
  component_type: 'Allowance' as 'Allowance' | 'Deduction',
  name: '',
  amount_type: 'Fixed' as 'Fixed' | 'Percentage',
  amount: '',
  is_taxable: true,
  is_statutory: false,
}

function asArray<T>(value: T[] | { results?: T[] } | undefined): T[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (Array.isArray(value.results)) return value.results
  return []
}

export default function HrPayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [structures, setStructures] = useState<SalaryStructure[]>([])
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [payrolls, setPayrolls] = useState<PayrollBatch[]>([])
  const [payslips, setPayslips] = useState<PayrollItem[]>([])

  const [structureForm, setStructureForm] = useState(defaultStructureForm)
  const [componentForm, setComponentForm] = useState(defaultComponentForm)
  const [runMonth, setRunMonth] = useState(String(new Date().getMonth() + 1))
  const [runYear, setRunYear] = useState(String(new Date().getFullYear()))
  const [paymentDate, setPaymentDate] = useState('')
  const [selectedPayrollId, setSelectedPayrollId] = useState('')

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [employeesRes, structuresRes, componentsRes, payrollsRes] = await Promise.all([
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
        apiClient.get<SalaryStructure[] | { results: SalaryStructure[] }>('/hr/salary-structures/'),
        apiClient.get<SalaryComponent[] | { results: SalaryComponent[] }>('/hr/salary-components/'),
        apiClient.get<PayrollBatch[] | { results: PayrollBatch[] }>('/hr/payrolls/'),
      ])

      const employeeRows = asArray(employeesRes.data)
      const structureRows = asArray(structuresRes.data)
      const componentRows = asArray(componentsRes.data)
      const payrollRows = asArray(payrollsRes.data)

      setEmployees(employeeRows)
      setStructures(structureRows)
      setComponents(componentRows)
      setPayrolls(payrollRows)

      if (payrollRows.length > 0) {
        setSelectedPayrollId((current) => current || String(payrollRows[0].id))
      }
    } catch {
      setError('Unable to load payroll data.')
    } finally {
      setLoading(false)
    }
  }

  const loadPayslips = async (payrollId: string) => {
    if (!payrollId) {
      setPayslips([])
      return
    }
    try {
      const response = await apiClient.get<PayrollItem[] | { results: PayrollItem[] }>(`/hr/payslips/?payroll=${payrollId}`)
      setPayslips(asArray(response.data))
    } catch {
      setError('Unable to load payslips for selected payroll.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    void loadPayslips(selectedPayrollId)
  }, [selectedPayrollId])

  const selectedPayroll = useMemo(
    () => payrolls.find((batch) => String(batch.id) === selectedPayrollId) ?? null,
    [payrolls, selectedPayrollId],
  )

  const createStructure = async () => {
    if (!structureForm.employee || !structureForm.basic_salary || !structureForm.effective_from) {
      setError('Employee, basic salary, and effective from are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/salary-structures/', {
        employee: Number(structureForm.employee),
        basic_salary: Number(structureForm.basic_salary),
        currency: structureForm.currency.trim() || 'USD',
        pay_frequency: structureForm.pay_frequency,
        effective_from: structureForm.effective_from,
        effective_to: structureForm.effective_to || null,
      })
      setStructureForm(defaultStructureForm)
      setNotice('Salary structure created.')
      await load()
    } catch {
      setError('Unable to create salary structure.')
    } finally {
      setWorking(false)
    }
  }

  const createComponent = async () => {
    if (!componentForm.structure || !componentForm.name || !componentForm.amount) {
      setError('Structure, component name, and amount are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/salary-components/', {
        structure: Number(componentForm.structure),
        component_type: componentForm.component_type,
        name: componentForm.name.trim(),
        amount_type: componentForm.amount_type,
        amount: Number(componentForm.amount),
        is_taxable: componentForm.is_taxable,
        is_statutory: componentForm.is_statutory,
      })
      setComponentForm(defaultComponentForm)
      setNotice('Salary component created.')
      await load()
    } catch {
      setError('Unable to create salary component.')
    } finally {
      setWorking(false)
    }
  }

  const processPayroll = async () => {
    if (!runMonth || !runYear) {
      setError('Month and year are required to process payroll.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const response = await apiClient.post<PayrollBatch>('/hr/payrolls/process/', {
        month: Number(runMonth),
        year: Number(runYear),
        payment_date: paymentDate || null,
      })
      setNotice(`Payroll processed for ${response.data.month}/${response.data.year}.`)
      await load()
      setSelectedPayrollId(String(response.data.id))
    } catch {
      setError('Unable to process payroll.')
    } finally {
      setWorking(false)
    }
  }

  const approvePayroll = async (payrollId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/payrolls/${payrollId}/approve/`, {})
      setNotice('Payroll approved.')
      await load()
      await loadPayslips(String(payrollId))
    } catch {
      setError('Unable to approve payroll.')
    } finally {
      setWorking(false)
    }
  }

  const downloadBankFile = async (payrollId: number) => {
    try {
      const response = await apiClient.get(`/hr/payrolls/${payrollId}/bank-file/`, { responseType: 'blob' })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        `payroll_bank_file_${payrollId}.csv`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download bank file.'))
    }
  }

  const downloadTaxReport = async () => {
    try {
      const response = await apiClient.get(`/hr/payrolls/tax-report/?month=${runMonth}&year=${runYear}`, {
        responseType: 'blob',
      })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        `payroll_tax_report_${runYear}_${runMonth}.csv`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download tax report.'))
    }
  }

  const downloadPayslip = async (payslipId: number) => {
    try {
      const response = await apiClient.get(`/hr/payslips/${payslipId}/pdf/`, { responseType: 'blob' })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        `payslip_${payslipId}.txt`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download payslip.'))
    }
  }

  const emailPayslips = async () => {
    if (payslips.length === 0) {
      setError('No payslips available for selected payroll.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/payslips/email/', { payslip_ids: payslips.map((item) => item.id) })
      setNotice('Payslips marked as sent.')
      await loadPayslips(selectedPayrollId)
    } catch {
      setError('Unable to mark payslips as sent.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Payroll</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Salary Structures, Processing, and Payslips</h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Salary Structure</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">
              Employee
              <select
                value={structureForm.employee}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, employee: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_id} - {employee.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Basic Salary
              <input
                value={structureForm.basic_salary}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, basic_salary: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
              />
            </label>
            <label className="text-xs text-slate-300">
              Currency
              <input
                value={structureForm.currency}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, currency: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-300">
              Pay Frequency
              <select
                value={structureForm.pay_frequency}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, pay_frequency: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option>Monthly</option>
                <option>Bi-weekly</option>
                <option>Weekly</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Effective From
              <input
                value={structureForm.effective_from}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, effective_from: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                type="date"
              />
            </label>
            <label className="text-xs text-slate-300">
              Effective To
              <input
                value={structureForm.effective_to}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, effective_to: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                type="date"
              />
            </label>
          </div>
          <button
            onClick={createStructure}
            disabled={working}
            className="mt-4 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {working ? 'Saving...' : 'Save Structure'}
          </button>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Salary Component</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300 sm:col-span-2">
              Salary Structure
              <select
                value={componentForm.structure}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, structure: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">Select structure</option>
                {structures.map((structure) => (
                  <option key={structure.id} value={structure.id}>
                    {structure.employee_name} - {structure.currency} {structure.basic_salary}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Type
              <select
                value={componentForm.component_type}
                onChange={(event) =>
                  setComponentForm((prev) => ({ ...prev, component_type: event.target.value as 'Allowance' | 'Deduction' }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="Allowance">Allowance</option>
                <option value="Deduction">Deduction</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Amount Type
              <select
                value={componentForm.amount_type}
                onChange={(event) =>
                  setComponentForm((prev) => ({ ...prev, amount_type: event.target.value as 'Fixed' | 'Percentage' }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="Fixed">Fixed</option>
                <option value="Percentage">Percentage</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Name
              <input
                value={componentForm.name}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-300">
              Amount
              <input
                value={componentForm.amount}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, amount: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={componentForm.is_taxable}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, is_taxable: event.target.checked }))}
              />
              Taxable
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={componentForm.is_statutory}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, is_statutory: event.target.checked }))}
              />
              Statutory
            </label>
          </div>
          <button
            onClick={createComponent}
            disabled={working}
            className="mt-4 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {working ? 'Saving...' : 'Save Component'}
          </button>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Process Payroll</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-xs text-slate-300">
            Month
            <input
              value={runMonth}
              onChange={(event) => setRunMonth(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              type="number"
              min="1"
              max="12"
            />
          </label>
          <label className="text-xs text-slate-300">
            Year
            <input
              value={runYear}
              onChange={(event) => setRunYear(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              type="number"
              min="2000"
              max="2099"
            />
          </label>
          <label className="text-xs text-slate-300 sm:col-span-2">
            Payment Date
            <input
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              type="date"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={processPayroll}
            disabled={working}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {working ? 'Processing...' : 'Process Payroll'}
          </button>
          <button
            onClick={downloadTaxReport}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Export Tax Report
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Payroll Batches</h2>
            {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Period</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Gross</th>
                  <th className="px-2 py-2">Deductions</th>
                  <th className="px-2 py-2">Net</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((batch) => (
                  <tr
                    key={batch.id}
                    className={`border-t border-slate-800 ${selectedPayrollId === String(batch.id) ? 'bg-slate-800/40' : ''}`}
                  >
                    <td className="px-2 py-2">{batch.month}/{batch.year}</td>
                    <td className="px-2 py-2">{batch.status}</td>
                    <td className="px-2 py-2">{batch.total_gross}</td>
                    <td className="px-2 py-2">{batch.total_deductions}</td>
                    <td className="px-2 py-2">{batch.total_net}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedPayrollId(String(batch.id))}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => void approvePayroll(batch.id)}
                          className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void downloadBankFile(batch.id)}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
                        >
                          Bank File
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {payrolls.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-slate-400" colSpan={6}>
                      No payroll batches yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Selected Payroll</h2>
          {selectedPayroll ? (
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <p>Period: {selectedPayroll.month}/{selectedPayroll.year}</p>
              <p>Status: {selectedPayroll.status}</p>
              <p>Total Gross: {selectedPayroll.total_gross}</p>
              <p>Total Deductions: {selectedPayroll.total_deductions}</p>
              <p>Total Net: {selectedPayroll.total_net}</p>
              <p>Payment Date: {selectedPayroll.payment_date || 'Not set'}</p>
              <button
                onClick={() => void emailPayslips()}
                disabled={working}
                className="mt-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60"
              >
                Mark Payslips Sent
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Select a payroll batch to view details.</p>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Payslips</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Basic</th>
                <th className="px-2 py-2">Allowances</th>
                <th className="px-2 py-2">Deductions</th>
                <th className="px-2 py-2">Net</th>
                <th className="px-2 py-2">Sent</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="px-2 py-2">{item.employee_name}</td>
                  <td className="px-2 py-2">{item.basic_salary}</td>
                  <td className="px-2 py-2">{item.total_allowances}</td>
                  <td className="px-2 py-2">{item.total_deductions}</td>
                  <td className="px-2 py-2">{item.net_salary}</td>
                  <td className="px-2 py-2">{item.sent_at ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => void downloadPayslip(item.id)}
                      className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {payslips.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-400" colSpan={7}>
                    No payslips available for selected batch.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Active Salary Structures</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {structures.map((structure) => (
              <div key={structure.id} className="rounded-lg border border-slate-800 px-3 py-2">
                <p className="font-semibold text-slate-100">{structure.employee_name}</p>
                <p>
                  {structure.currency} {structure.basic_salary} • {structure.pay_frequency}
                </p>
                <p>Effective: {structure.effective_from}{structure.effective_to ? ` to ${structure.effective_to}` : ''}</p>
              </div>
            ))}
            {structures.length === 0 ? <p className="text-slate-400">No salary structures configured.</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Salary Components</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {components.map((component) => (
              <div key={component.id} className="rounded-lg border border-slate-800 px-3 py-2">
                <p className="font-semibold text-slate-100">{component.name}</p>
                <p>
                  {component.component_type} • {component.amount_type} {component.amount}
                </p>
                <p>{component.is_taxable ? 'Taxable' : 'Non-taxable'} • {component.is_statutory ? 'Statutory' : 'Optional'}</p>
              </div>
            ))}
            {components.length === 0 ? <p className="text-slate-400">No salary components configured.</p> : null}
          </div>
        </article>
      </section>
    </div>
  )
}
