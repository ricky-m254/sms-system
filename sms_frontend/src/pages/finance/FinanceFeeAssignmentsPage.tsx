import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type FeeAssignment = {
  id: number
  student: number
  student_name?: string
  fee_structure: number
  fee_name?: string
  discount_amount: number
  is_active: boolean
  start_date?: string
  end_date?: string
}

type FinanceStudent = {
  id: number
  first_name: string
  last_name: string
}

type FeeStructure = {
  id: number
  name: string
}

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
    const first = Object.values(data as Record<string, unknown>).find((value) =>
      Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0,
    )
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

const statusBadgeClass = (isActive: boolean) =>
  isActive
    ? 'border-emerald-400/40 text-emerald-200'
    : 'border-slate-600 text-slate-300'

export default function FinanceFeeAssignmentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [assignments, setAssignments] = useState<FeeAssignment[]>([])
  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FeeAssignment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [query, setQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState('all')
  const [feeFilter, setFeeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )

  useEffect(() => {
    const state = location.state as { flash?: string } | null
    if (state?.flash) {
      setFlash(state.flash)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        if (isMounted) setError(null)
        const [assignmentRes, studentRes, feeRes] = await Promise.all([
          apiClient.get<FeeAssignment[] | { results: FeeAssignment[]; count: number }>(
            '/finance/fee-assignments/',
            {
              params: {
                page,
                search: query.trim() || undefined,
                student: studentFilter !== 'all' ? studentFilter : undefined,
                fee_structure: feeFilter !== 'all' ? feeFilter : undefined,
                is_active:
                  statusFilter === 'all' ? undefined : statusFilter === 'active' ? true : false,
              },
            },
          ),
          apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>(
            '/finance/ref/students/',
          ),
          apiClient.get<FeeStructure[] | { results: FeeStructure[]; count: number }>(
            '/finance/fees/',
          ),
        ])
        if (isMounted) {
          const normalized = normalizePaginatedResponse(assignmentRes.data)
          setAssignments(normalized.items)
          setTotalCount(normalized.totalCount)
          setIsServerPaginated(normalized.isPaginated)
          setStudents(normalizePaginatedResponse(studentRes.data).items)
          setFees(normalizePaginatedResponse(feeRes.data).items)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the FINANCE module and proper role.')
          } else if (status === 404) {
            setError(
              'Fee assignments endpoint not found (404). Backend route is likely missing; register FeeAssignmentViewSet.',
            )
          } else {
            setError(extractApiError(err, 'Unable to load fee assignments. Please try again.'))
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [page, query, studentFilter, feeFilter, statusFilter])

  const filteredAssignments = useMemo(() => {
    if (isServerPaginated) return assignments
    const term = query.trim().toLowerCase()
    return assignments.filter((assignment) => {
      if (studentFilter !== 'all' && String(assignment.student) !== studentFilter) return false
      if (feeFilter !== 'all' && String(assignment.fee_structure) !== feeFilter) return false
      if (statusFilter !== 'all' && assignment.is_active !== (statusFilter === 'active')) {
        return false
      }
      if (!term) return true
      const studentName = assignment.student_name?.toLowerCase() ?? ''
      const feeName = assignment.fee_name?.toLowerCase() ?? ''
      return studentName.includes(term) || feeName.includes(term) || String(assignment.student).includes(term)
    })
  }, [assignments, query, isServerPaginated, studentFilter, feeFilter, statusFilter])

  const pagedAssignments = useMemo(() => {
    if (isServerPaginated) return filteredAssignments
    const start = (page - 1) * pageSize
    return filteredAssignments.slice(start, start + pageSize)
  }, [filteredAssignments, page, isServerPaginated])

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredAssignments.length) / pageSize),
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/finance/fee-assignments/${deleteTarget.id}/`)
      setAssignments((prev) => prev.filter((assignment) => assignment.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(extractApiError(err, 'Unable to delete fee assignment.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Fee Assignments</h1>
        <p className="mt-2 text-sm text-slate-400">
          Link students to fee structures and track discounts.
        </p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading fee assignments...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-sm text-emerald-200">{flash}</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Assignment list</h2>
            <p className="mt-1 text-sm text-slate-400">Expected from `/api/finance/fee-assignments/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search student or fee"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
            <select
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={studentFilter}
              onChange={(event) => {
                setStudentFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={feeFilter}
              onChange={(event) => {
                setFeeFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All fee structures</option>
              {fees.map((fee) => (
                <option key={fee.id} value={String(fee.id)}>
                  {fee.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
                setPage(1)
              }}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200"
              onClick={() => {
                setQuery('')
                setStudentFilter('all')
                setFeeFilter('all')
                setStatusFilter('all')
                setPage(1)
              }}
            >
              Reset
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => navigate('/modules/finance/fee-assignments/new')}
            >
              Assign fee
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-[840px] w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedAssignments.map((assignment) => (
                <tr key={assignment.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">
                    {assignment.student_name ?? assignment.student}
                  </td>
                  <td className="px-4 py-3">{assignment.fee_name ?? assignment.fee_structure}</td>
                  <td className="px-4 py-3">{Number(assignment.discount_amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{assignment.start_date ?? '--'}</td>
                  <td className="px-4 py-3">{assignment.end_date ?? '--'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs ${statusBadgeClass(assignment.is_active)}`}>
                      {assignment.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                      onClick={() => navigate(`/modules/finance/fee-assignments/${assignment.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                      onClick={() => setDeleteTarget(assignment)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {pagedAssignments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={7}>
                    No fee assignments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-display font-semibold">Delete fee assignment</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will remove the assignment for{' '}
              <strong>{deleteTarget.student_name ?? deleteTarget.student}</strong>. Continue?
            </p>
            {deleteError ? <p className="mt-3 text-xs text-rose-300">{deleteError}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
