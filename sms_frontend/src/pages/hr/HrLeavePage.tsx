import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'

type Employee = {
  id: number
  employee_id: string
  full_name: string
  employment_type: string
}

type LeaveType = {
  id: number
  name: string
  code: string
  is_paid: boolean
  max_days_year: number | null
  notice_days: number
}

type LeavePolicy = {
  id: number
  leave_type: number
  leave_type_name: string
  employment_type: string
  entitlement_days: string
  accrual_method: string
  effective_from: string
}

type LeaveBalance = {
  id: number
  leave_type_name: string
  year: number
  opening_balance: string
  accrued: string
  used: string
  pending: string
  available: string
}

type LeaveRequest = {
  id: number
  employee: number
  employee_name: string
  leave_type: number
  leave_type_name: string
  start_date: string
  end_date: string
  days_requested: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  rejection_reason: string
  submitted_at: string
}

type LeaveCalendarRow = {
  id: number
  employee_name: string
  department: string
  leave_type: string
  start_date: string
  end_date: string
  days_requested: string
  status: string
}

const defaultLeaveTypeForm = {
  name: '',
  code: '',
  is_paid: true,
  requires_approval: true,
  requires_document: false,
  max_days_year: '',
  notice_days: '0',
  color: '#16A34A',
}

const defaultLeavePolicyForm = {
  leave_type: '',
  employment_type: 'Full-time',
  entitlement_days: '0',
  accrual_method: 'Annual',
  carry_forward_max: '0',
  effective_from: '',
}

const defaultLeaveRequestForm = {
  employee: '',
  leave_type: '',
  start_date: '',
  end_date: '',
  reason: '',
}

export default function HrLeavePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveCalendar, setLeaveCalendar] = useState<LeaveCalendarRow[]>([])
  const [selectedEmployeeForBalance, setSelectedEmployeeForBalance] = useState('')
  const [balances, setBalances] = useState<LeaveBalance[]>([])

  const [leaveTypeForm, setLeaveTypeForm] = useState(defaultLeaveTypeForm)
  const [leavePolicyForm, setLeavePolicyForm] = useState(defaultLeavePolicyForm)
  const [leaveRequestForm, setLeaveRequestForm] = useState(defaultLeaveRequestForm)
  const [activeTab, setActiveTab] = useState<'types' | 'policies' | 'requests' | 'balances'>('requests')
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const noticeDaysGiven = useMemo(() => {
    if (!leaveRequestForm.start_date) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(leaveRequestForm.start_date)
    start.setHours(0, 0, 0, 0)
    return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }, [leaveRequestForm.start_date])

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((t) => String(t.id) === leaveRequestForm.leave_type) ?? null,
    [leaveTypes, leaveRequestForm.leave_type]
  )

  const toArr = <T,>(v: T[] | { results?: T[] } | null | undefined): T[] =>
    !v ? [] : Array.isArray(v) ? v : v.results ?? []

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [employeesRes, leaveTypesRes, leavePoliciesRes, leaveRequestsRes, leaveCalendarRes] = await Promise.all([
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
        apiClient.get<LeaveType[] | { results: LeaveType[] }>('/hr/leave-types/'),
        apiClient.get<LeavePolicy[] | { results: LeavePolicy[] }>('/hr/leave-policies/'),
        apiClient.get<LeaveRequest[] | { results: LeaveRequest[] }>('/hr/leave-requests/'),
        apiClient.get<LeaveCalendarRow[] | { results: LeaveCalendarRow[] }>('/hr/leave-calendar/'),
      ])
      setEmployees(toArr(employeesRes.data))
      setLeaveTypes(toArr(leaveTypesRes.data))
      setLeavePolicies(toArr(leavePoliciesRes.data))
      setLeaveRequests(toArr(leaveRequestsRes.data))
      setLeaveCalendar(toArr(leaveCalendarRes.data))
    } catch {
      setError('Unable to load leave management data.')
    } finally {
      setLoading(false)
    }
  }

  const loadBalances = async (employeeId: string) => {
    if (!employeeId) {
      setBalances([])
      return
    }
    try {
      const response = await apiClient.get<LeaveBalance[]>(`/hr/leave-balance/${employeeId}/`)
      setBalances(response.data)
    } catch {
      setError('Unable to load leave balances for selected employee.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    void loadBalances(selectedEmployeeForBalance)
  }, [selectedEmployeeForBalance])

  const createLeaveType = async () => {
    if (!leaveTypeForm.name || !leaveTypeForm.code) {
      setError('Leave type name and code are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/leave-types/', {
        ...leaveTypeForm,
        max_days_year: leaveTypeForm.max_days_year ? Number(leaveTypeForm.max_days_year) : null,
        notice_days: Number(leaveTypeForm.notice_days || '0'),
      })
      setLeaveTypeForm(defaultLeaveTypeForm)
      setShowTypeForm(false)
      setNotice('Leave type created.')
      await load()
    } catch {
      setError('Unable to create leave type.')
    } finally {
      setWorking(false)
    }
  }

  const createLeavePolicy = async () => {
    if (!leavePolicyForm.leave_type || !leavePolicyForm.effective_from) {
      setError('Leave type and effective date are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/leave-policies/', {
        ...leavePolicyForm,
        leave_type: Number(leavePolicyForm.leave_type),
        entitlement_days: Number(leavePolicyForm.entitlement_days || '0'),
        carry_forward_max: Number(leavePolicyForm.carry_forward_max || '0'),
      })
      setLeavePolicyForm(defaultLeavePolicyForm)
      setShowPolicyForm(false)
      setNotice('Leave policy created.')
      await load()
    } catch {
      setError('Unable to create leave policy.')
    } finally {
      setWorking(false)
    }
  }

  const createLeaveRequest = async () => {
    if (!leaveRequestForm.employee || !leaveRequestForm.leave_type || !leaveRequestForm.start_date || !leaveRequestForm.end_date) {
      setError('Employee, leave type, start date and end date are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/leave-requests/', {
        ...leaveRequestForm,
        employee: Number(leaveRequestForm.employee),
        leave_type: Number(leaveRequestForm.leave_type),
      })
      setLeaveRequestForm(defaultLeaveRequestForm)
      setShowRequestForm(false)
      setNotice('Leave request submitted.')
      await load()
      if (selectedEmployeeForBalance === leaveRequestForm.employee) {
        await loadBalances(selectedEmployeeForBalance)
      }
    } catch {
      setError('Unable to submit leave request.')
    } finally {
      setWorking(false)
    }
  }

  const approveLeaveRequest = async (requestId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/approve/`, {})
      setNotice('Leave request approved.')
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch {
      setError('Unable to approve leave request.')
    } finally {
      setWorking(false)
    }
  }

  const rejectLeaveRequest = async (requestId: number) => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/reject/`, { rejection_reason: rejectReason.trim() })
      setNotice('Leave request rejected.')
      setRejectReason('')
      setRejectingRequestId(null)
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch {
      setError('Unable to reject leave request.')
    } finally {
      setWorking(false)
    }
  }

  const cancelLeaveRequest = async (requestId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/cancel/`, {})
      setNotice('Leave request cancelled.')
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch {
      setError('Unable to cancel leave request.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Leave Management</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Policies, Requests, and Balances</h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="flex border-b border-slate-800 overflow-x-auto">
          {(['requests', 'types', 'policies', 'balances'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-5 py-3 text-sm font-semibold transition capitalize ${activeTab === tab ? 'border-b-2 border-emerald-500 text-emerald-400 bg-slate-950/40' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab === 'types' ? 'Leave Types' : tab === 'policies' ? 'Leave Policies' : tab === 'requests' ? 'New Request' : 'Balances'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'types' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">Leave Types</h2>
                <button onClick={() => setShowTypeForm((prev) => !prev)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">{showTypeForm ? 'Close' : 'Create'}</button>
              </div>
              {showTypeForm && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <input value={leaveTypeForm.name} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                  <input value={leaveTypeForm.code} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, code: e.target.value }))} placeholder="Code (e.g. ANNUAL)" className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                  <input value={leaveTypeForm.max_days_year} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, max_days_year: e.target.value }))} placeholder="Max days/year (blank = unlimited)" className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                  <input value={leaveTypeForm.notice_days} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, notice_days: e.target.value }))} placeholder="Required notice days" type="number" min="0" className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                  <button onClick={createLeaveType} disabled={working} className="sm:col-span-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Save Leave Type</button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(loading ? [] : leaveTypes).map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <p className="font-semibold text-slate-100">{row.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{row.code}</p>
                    <p className="text-xs text-slate-400 mt-1">Max: {row.max_days_year ?? 'Unlimited'} days/yr · Notice: {row.notice_days}d</p>
                    <p className="text-xs text-slate-500 mt-0.5">{row.is_paid ? 'Paid' : 'Unpaid'}</p>
                  </div>
                ))}
                {!loading && leaveTypes.length === 0 && <p className="col-span-3 text-xs text-slate-500">No leave types yet. Create one above.</p>}
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">Leave Policies</h2>
                <button onClick={() => setShowPolicyForm((prev) => !prev)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">{showPolicyForm ? 'Close' : 'Create'}</button>
              </div>
              {showPolicyForm && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <select value={leavePolicyForm.leave_type} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, leave_type: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="">Leave type</option>
                    {leaveTypes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                  <select value={leavePolicyForm.employment_type} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, employment_type: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="">All employment types</option>
                  </select>
                  <input value={leavePolicyForm.entitlement_days} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, entitlement_days: e.target.value }))} placeholder="Entitlement days" type="number" min="0" className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                  <input type="date" value={leavePolicyForm.effective_from} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, effective_from: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                  <button onClick={createLeavePolicy} disabled={working} className="sm:col-span-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Save Policy</button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(loading ? [] : leavePolicies).map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <p className="font-semibold text-slate-100">{row.leave_type_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{row.employment_type || 'All types'} · {row.accrual_method}</p>
                    <p className="text-xs text-emerald-400 mt-1">{row.entitlement_days} days entitlement</p>
                    <p className="text-xs text-slate-500">From {row.effective_from}</p>
                  </div>
                ))}
                {!loading && leavePolicies.length === 0 && <p className="col-span-3 text-xs text-slate-500">No leave policies yet. Create one above.</p>}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">New Leave Request</h2>
                <button onClick={() => setShowRequestForm((prev) => !prev)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">{showRequestForm ? 'Close' : 'Open Form'}</button>
              </div>
              {showRequestForm && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <select value={leaveRequestForm.employee} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, employee: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="">Select employee</option>
                    {employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} - {row.full_name}</option>)}
                  </select>
                  <select value={leaveRequestForm.leave_type} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, leave_type: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="">Leave type</option>
                    {leaveTypes.map((row) => <option key={row.id} value={row.id}>{row.name}{row.notice_days > 0 ? ` (${row.notice_days}d notice)` : ''}</option>)}
                  </select>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                    <input type="date" value={leaveRequestForm.start_date} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, start_date: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                    {noticeDaysGiven !== null && (
                      <p className={`mt-1 text-xs font-medium ${noticeDaysGiven < 0 ? 'text-rose-400' : selectedLeaveType && noticeDaysGiven < selectedLeaveType.notice_days ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {noticeDaysGiven < 0
                          ? `⚠ Start date is ${Math.abs(noticeDaysGiven)} day(s) in the past`
                          : `${noticeDaysGiven} day(s) notice given${selectedLeaveType && selectedLeaveType.notice_days > 0 ? ` · ${selectedLeaveType.notice_days} required` : ''}`}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">End Date</label>
                    <input type="date" value={leaveRequestForm.end_date} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, end_date: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" />
                  </div>
                  <textarea value={leaveRequestForm.reason} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for leave" className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm" rows={2} />
                  <button onClick={createLeaveRequest} disabled={working} className="sm:col-span-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Submit Request</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'balances' && (
            <div>
              <h2 className="text-sm font-semibold text-slate-100 mb-4">Leave Balances by Employee</h2>
              <select value={selectedEmployeeForBalance} onChange={(e) => setSelectedEmployeeForBalance(e.target.value)} className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
                <option value="">Select employee</option>
                {employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} - {row.full_name}</option>)}
              </select>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {balances.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <p className="font-semibold text-slate-100">{row.leave_type_name}</p>
                    <p className="text-xs text-slate-500">{row.year}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-emerald-400">Available: {row.available}</span>
                      <span className="text-slate-400">Used: {row.used}</span>
                      <span className="text-amber-400">Pending: {row.pending}</span>
                    </div>
                  </div>
                ))}
                {balances.length === 0 && selectedEmployeeForBalance && <p className="col-span-3 text-xs text-slate-500">No leave balances found for this employee.</p>}
                {!selectedEmployeeForBalance && <p className="col-span-3 text-xs text-slate-500">Select an employee to view their leave balances.</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <header className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Leave Requests</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : leaveRequests).map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-100">{row.employee_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.leave_type_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.start_date} to {row.end_date}</td>
                  <td className="px-4 py-3 text-slate-300">{row.days_requested}</td>
                  <td className="px-4 py-3 text-slate-300">{row.status}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.status === 'Pending' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => void approveLeaveRequest(row.id)} disabled={working} className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">Approve</button>
                        <button onClick={() => setRejectingRequestId(row.id)} disabled={working} className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">Reject</button>
                        <button onClick={() => void cancelLeaveRequest(row.id)} disabled={working} className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Cancel</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {rejectingRequestId ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Reject Leave Request #{rejectingRequestId}</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <button onClick={() => void rejectLeaveRequest(rejectingRequestId)} disabled={working} className="rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-200 disabled:opacity-60">Confirm Reject</button>
            <button onClick={() => { setRejectingRequestId(null); setRejectReason('') }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Dismiss</button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <header className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Team Leave Calendar</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Dates</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : leaveCalendar).map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-100">{row.employee_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.department || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{row.leave_type}</td>
                  <td className="px-4 py-3 text-slate-300">{row.start_date} to {row.end_date}</td>
                  <td className="px-4 py-3 text-slate-300">{row.days_requested}</td>
                  <td className="px-4 py-3 text-slate-300">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
