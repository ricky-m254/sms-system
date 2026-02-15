import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type FeeStructure = {
  id: number
  name: string
  amount?: number
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
  is_active?: boolean
}

type StudentDetail = FinanceStudent & {
  guardians?: Guardian[]
  gender?: string
  is_active?: boolean
}

type EnrollmentRef = {
  id: number
  student: number
  class_name?: string
  term_name?: string
  school_class?: number
  term?: number
  is_active?: boolean
}

type FeeAssignment = {
  id: number
  student: number
  fee_structure: number
  discount_amount: number
  is_active: boolean
  start_date?: string
  end_date?: string
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

export default function FinanceFeeAssignmentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [studentEnrollment, setStudentEnrollment] = useState<EnrollmentRef | null>(null)
  const [studentInfoNotice, setStudentInfoNotice] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    student: '',
    fee_structure: '',
    discount_amount: '',
    start_date: '',
    end_date: '',
    is_active: true,
  })
  const isFormDisabled = isSubmitting || isLoading

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        if (isMounted) setFormError(null)
        const [studentRes, feeRes] = await Promise.all([
          apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>(
            '/finance/ref/students/',
          ),
          apiClient.get<FeeStructure[] | { results: FeeStructure[]; count: number }>('/finance/fees/'),
        ])
        if (isMounted) {
          setStudents(normalizePaginatedResponse(studentRes.data).items)
          setFees(normalizePaginatedResponse(feeRes.data).items)
        }
        if (isEdit && id) {
          const assignmentRes = await apiClient.get<FeeAssignment>(`/finance/fee-assignments/${id}/`)
          if (isMounted) {
            setFormState({
              student: String(assignmentRes.data.student),
              fee_structure: String(assignmentRes.data.fee_structure),
              discount_amount: String(assignmentRes.data.discount_amount ?? 0),
              start_date: assignmentRes.data.start_date ?? '',
              end_date: assignmentRes.data.end_date ?? '',
              is_active: assignmentRes.data.is_active,
            })
          }
        }
      } catch (err) {
        if (isMounted) {
          setFormError(extractApiError(err, 'Unable to load assignment data.'))
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
  }, [id, isEdit])

  useEffect(() => {
    if (!formState.student) {
      setStudentDetail(null)
      setStudentEnrollment(null)
      setStudentInfoNotice(null)
      return
    }
    let isMounted = true
    const loadStudentInfo = async () => {
      try {
        const [detailRes, enrollmentRes] = await Promise.all([
          apiClient.get<StudentDetail>(`/students/${formState.student}/`),
          apiClient.get<EnrollmentRef[] | { results: EnrollmentRef[]; count: number }>(
            '/finance/ref/enrollments/',
            { params: { student_id: formState.student, active: true } },
          ),
        ])
        if (isMounted) {
          setStudentDetail(detailRes.data)
          const enrollments = normalizePaginatedResponse(enrollmentRes.data).items
          setStudentEnrollment(enrollments[0] ?? null)
          setStudentInfoNotice(null)
        }
      } catch {
        if (!isMounted) return
        setStudentDetail(null)
        setStudentEnrollment(null)
        setStudentInfoNotice('Student contact or class info not available.')
      }
    }
    loadStudentInfo()
    return () => {
      isMounted = false
    }
  }, [formState.student])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const nextErrors: Record<string, string> = {}
    if (!formState.student) nextErrors.student = 'Select a student.'
    if (!formState.fee_structure) nextErrors.fee_structure = 'Select a fee structure.'
    const discountValue = Number(formState.discount_amount)
    if (formState.discount_amount && (Number.isNaN(discountValue) || discountValue < 0)) {
      nextErrors.discount_amount = 'Enter a valid discount amount.'
    }
    const selectedFee = fees.find((fee) => String(fee.id) === formState.fee_structure)
    if (selectedFee && Number.isFinite(selectedFee.amount)) {
      const feeAmount = Number(selectedFee.amount)
      if (discountValue > feeAmount) {
        nextErrors.discount_amount = 'Discount cannot exceed selected fee amount.'
      }
    }
    if (
      formState.start_date &&
      formState.end_date &&
      formState.end_date < formState.start_date
    ) {
      nextErrors.end_date = 'End date cannot be before start date.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    const payload = {
      student: Number(formState.student),
      fee_structure: Number(formState.fee_structure),
      discount_amount: Number(formState.discount_amount || 0),
      start_date: formState.start_date || undefined,
      end_date: formState.end_date || undefined,
      is_active: formState.is_active,
    }

    setIsSubmitting(true)
    try {
      if (isEdit && id) {
        await apiClient.patch(`/finance/fee-assignments/${id}/`, payload)
      } else {
        await apiClient.post('/finance/fee-assignments/', payload)
      }
      navigate('/modules/finance/fee-assignments', {
        state: { flash: isEdit ? 'Fee assignment updated.' : 'Fee assignment created.' },
      })
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      if (data && typeof data === 'object') {
        const nextErrors: Record<string, string> = {}
        const assign = (key: string) => {
          const value = data[key]
          if (Array.isArray(value)) {
            nextErrors[key] = value.join(' ')
          } else if (typeof value === 'string') {
            nextErrors[key] = value
          }
        }
        ;['student', 'fee_structure', 'discount_amount', 'start_date', 'end_date', 'is_active'].forEach(assign)
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors)
          setFormError('Please correct the highlighted fields.')
          return
        }
      }
      const detail = (err as { response?: { data?: { detail?: string; error?: string } } })?.response?.data
      setFormError(detail?.error ?? detail?.detail ?? extractApiError(err, 'Unable to save fee assignment.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">
          {isEdit ? 'Edit Fee Assignment' : 'Assign Fee'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {isEdit ? 'Update an existing assignment.' : 'Link a student to a fee structure.'}
        </p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading assignment...</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Student
            <select
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.student}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, student: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, student: '' }))
              }}
              disabled={isFormDisabled}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admission_number} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            {fieldErrors.student ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.student}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Fee Structure
            <select
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.fee_structure}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, fee_structure: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, fee_structure: '' }))
              }}
              disabled={isFormDisabled}
            >
              <option value="">Select fee</option>
              {fees.map((fee) => (
                <option key={fee.id} value={fee.id}>
                  {fee.name}
                </option>
              ))}
            </select>
            {fieldErrors.fee_structure ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.fee_structure}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Discount Amount
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.discount_amount}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, discount_amount: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, discount_amount: '' }))
              }}
              placeholder="0.00"
              disabled={isFormDisabled}
            />
            {fieldErrors.discount_amount ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.discount_amount}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Start Date
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.start_date}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, start_date: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, start_date: '' }))
              }}
              disabled={isFormDisabled}
            />
            {fieldErrors.start_date ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.start_date}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            End Date
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.end_date}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, end_date: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, end_date: '' }))
              }}
              disabled={isFormDisabled}
            />
            {fieldErrors.end_date ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.end_date}</p>
            ) : null}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formState.is_active}
              onChange={(event) => setFormState((prev) => ({ ...prev, is_active: event.target.checked }))}
              disabled={isFormDisabled}
            />
            Active
          </label>
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update assignment' : 'Assign fee'}
            </button>
            <button
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
              type="button"
              onClick={() => navigate('/modules/finance/fee-assignments')}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      <aside className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-5">
        <h3 className="text-sm font-semibold text-slate-200">Student context</h3>
        <div className="mt-3 grid gap-3 text-xs text-slate-300 md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase text-slate-400">Name</p>
            <p>
              {studentDetail
                ? `${studentDetail.first_name} ${studentDetail.last_name}`
                : 'Select a student'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-400">Admission #</p>
            <p>{studentDetail?.admission_number ?? '--'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-400">Class</p>
            <p>{studentEnrollment?.class_name ?? '--'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-400">Term</p>
            <p>{studentEnrollment?.term_name ?? '--'}</p>
          </div>
        </div>
        {studentInfoNotice ? (
          <p className="mt-2 text-[11px] text-amber-200">{studentInfoNotice}</p>
        ) : null}
        <div className="mt-4">
          <p className="text-[11px] uppercase text-slate-400">Parents / Guardians</p>
          <div className="mt-2 space-y-2">
            {(studentDetail?.guardians ?? []).length > 0 ? (
              studentDetail?.guardians?.map((guardian) => (
                <div key={guardian.id} className="rounded-xl border border-slate-800 p-3 text-xs">
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
              <p className="text-[11px] text-slate-400">No guardian records found.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
