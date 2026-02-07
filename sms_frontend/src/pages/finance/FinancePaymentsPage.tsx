import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type Payment = {
  id: number
  student: number
  amount: number
  payment_method: string
  reference_number: string
  payment_date: string
}

type FinanceStudent = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
}

type Guardian = {
  id: number
  name: string
  relationship?: string
  phone?: string
  email?: string
}

type StudentDetail = FinanceStudent & {
  guardians?: Guardian[]
}

type EnrollmentRef = {
  id: number
  student: number
  class_name?: string
  term_name?: string
}

const mockStudentDetail: StudentDetail = {
  id: 0,
  admission_number: 'N/A',
  first_name: 'Student',
  last_name: 'Not Found',
  guardians: [
    { id: 1, name: 'Guardian Name', relationship: 'Parent', phone: 'N/A', email: 'N/A' },
  ],
}

export default function FinancePaymentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [paymentQuery, setPaymentQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState('all')
  const [paymentPage, setPaymentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [openContextId, setOpenContextId] = useState<number | null>(null)
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)
  const [studentDetails, setStudentDetails] = useState<Record<number, StudentDetail>>({})
  const [studentEnrollments, setStudentEnrollments] = useState<Record<number, EnrollmentRef | null>>({})
  const [studentContextNotice, setStudentContextNotice] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )

  const pageSize = 8

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
        const [paymentRes, studentRes] = await Promise.all([
          apiClient.get<Payment[] | { results: Payment[]; count: number }>(
            '/finance/payments/',
            {
              params: {
                page: paymentPage,
                search: paymentQuery.trim() || undefined,
                student: studentFilter !== 'all' ? studentFilter : undefined,
              },
            },
          ),
          apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>(
            '/finance/ref/students/',
          ),
        ])
        if (isMounted) {
          const normalized = normalizePaginatedResponse(paymentRes.data)
          setPayments(normalized.items)
          setTotalCount(normalized.totalCount)
          setIsServerPaginated(normalized.isPaginated)
          setStudents(normalizePaginatedResponse(studentRes.data).items)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the FINANCE module and proper role.')
          } else if (status === 404) {
            setError('Finance endpoints not found (404). Verify tenant routing.')
          } else {
            setError('Unable to load payments. Please try again.')
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
  }, [paymentPage, paymentQuery, studentFilter])

  const studentMap = useMemo(() => {
    return students.reduce<Record<number, string>>((acc, student) => {
      acc[student.id] = `${student.first_name} ${student.last_name} ${student.admission_number}`.trim()
      return acc
    }, {})
  }, [students])

  const filteredPayments = useMemo(() => {
    const term = paymentQuery.trim().toLowerCase()
    return payments.filter((payment) => {
      if (studentFilter !== 'all' && String(payment.student) !== studentFilter) {
        return false
      }
      if (!term) return true
      const studentName = studentMap[payment.student]?.toLowerCase() ?? ''
      return (
        payment.reference_number.toLowerCase().includes(term) ||
        String(payment.student).includes(term) ||
        payment.payment_method.toLowerCase().includes(term) ||
        studentName.includes(term)
      )
    })
  }, [paymentQuery, payments, studentFilter, studentMap])

  const pagedPayments = useMemo(() => {
    if (isServerPaginated) return filteredPayments
    const start = (paymentPage - 1) * pageSize
    return filteredPayments.slice(start, start + pageSize)
  }, [filteredPayments, paymentPage, isServerPaginated])

  const totalPaymentPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredPayments.length) / pageSize),
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/finance/payments/${deleteTarget.id}/`)
      setPayments((prev) => prev.filter((payment) => payment.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setDeleteError(detail ?? 'Unable to delete payment.')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleContext = async (payment: Payment) => {
    if (openContextId === payment.id) {
      setOpenContextId(null)
      return
    }
    setOpenContextId(payment.id)
    const studentId = payment.student
    if (studentDetails[studentId] && studentEnrollments[studentId] !== undefined) {
      return
    }
    setDetailLoadingId(payment.id)
    setStudentContextNotice(null)
    try {
      const [detailRes, enrollmentRes] = await Promise.all([
        apiClient.get<StudentDetail>(`/students/${studentId}/`),
        apiClient.get<EnrollmentRef[] | { results: EnrollmentRef[]; count: number }>(
          '/finance/ref/enrollments/',
          { params: { student_id: studentId, active: true } },
        ),
      ])
      const enrollments = normalizePaginatedResponse(enrollmentRes.data).items
      setStudentDetails((prev) => ({ ...prev, [studentId]: detailRes.data }))
      setStudentEnrollments((prev) => ({ ...prev, [studentId]: enrollments[0] ?? null }))
    } catch {
      setStudentDetails((prev) => ({
        ...prev,
        [studentId]: { ...mockStudentDetail, id: studentId },
      }))
      setStudentEnrollments((prev) => ({ ...prev, [studentId]: null }))
      setStudentContextNotice('Student contact or class info not available. Using fallback data.')
    } finally {
      setDetailLoadingId(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Payments</h1>
        <p className="mt-2 text-sm text-slate-400">Track collections and payment history.</p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading payments...</p>
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
            <h2 className="text-lg font-display font-semibold">Payment list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/payments/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search reference, method, student"
              value={paymentQuery}
              onChange={(event) => {
                setPaymentQuery(event.target.value)
                setPaymentPage(1)
              }}
            />
            <select
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={studentFilter}
              onChange={(event) => {
                setStudentFilter(event.target.value)
                setPaymentPage(1)
              }}
            >
              <option value="all">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => navigate('/modules/finance/payments/new')}
            >
              Record payment
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedPayments.map((payment) => (
                <Fragment key={payment.id}>
                  <tr className="bg-slate-950/60">
                    <td className="px-4 py-3 font-semibold">{payment.reference_number}</td>
                    <td className="px-4 py-3">
                      {studentMap[payment.student] ?? payment.student}
                    </td>
                    <td className="px-4 py-3">{payment.payment_method}</td>
                    <td className="px-4 py-3">{Number(payment.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">{payment.payment_date}</td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                        onClick={() => toggleContext(payment)}
                      >
                        {openContextId === payment.id ? 'Hide context' : 'Context'}
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                        onClick={() => setDeleteTarget(payment)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {openContextId === payment.id ? (
                    <tr className="bg-slate-950/40">
                      <td colSpan={6} className="px-4 py-4">
                        {detailLoadingId === payment.id ? (
                          <p className="text-xs text-slate-400">Loading student context...</p>
                        ) : (
                          <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-3">
                            <div>
                              <p className="text-[11px] uppercase text-slate-400">Class / Term</p>
                              <p className="text-sm text-slate-200">
                                {studentEnrollments[payment.student]?.class_name ?? '--'} /{' '}
                                {studentEnrollments[payment.student]?.term_name ?? '--'}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-[11px] uppercase text-slate-400">
                                Parents / Guardians
                              </p>
                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                {(studentDetails[payment.student]?.guardians ?? []).length > 0 ? (
                                  studentDetails[payment.student]?.guardians?.map((guardian) => (
                                    <div
                                      key={guardian.id}
                                      className="rounded-xl border border-slate-800 p-3 text-xs text-slate-300"
                                    >
                                      <p className="text-sm text-white">{guardian.name}</p>
                                      <p className="text-[11px] text-slate-400">
                                        {guardian.relationship ?? 'Guardian'}
                                      </p>
                                      <p className="text-[11px] text-slate-400">
                                        {guardian.phone ?? '--'} | {guardian.email ?? '--'}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[11px] text-slate-400">
                                    No guardian records found.
                                  </p>
                                )}
                              </div>
                            </div>
                            {studentContextNotice ? (
                              <p className="text-[11px] text-amber-200">{studentContextNotice}</p>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {pagedPayments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No payments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {paymentPage} of {totalPaymentPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={paymentPage === 1}
              onClick={() => setPaymentPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={paymentPage === totalPaymentPages}
              onClick={() => setPaymentPage((prev) => Math.min(totalPaymentPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-display font-semibold">Delete payment</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will remove payment <strong>{deleteTarget.reference_number}</strong>. Continue?
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
