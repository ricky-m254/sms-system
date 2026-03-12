import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadBlob, extractFilename } from '../../utils/download'

type AttendanceSummary = {
  attendance_rate?: number
  present?: number
  absent?: number
  late?: number
  period_label?: string
}

type AttendanceRecord = {
  id: number
  student: number
  student_name?: string
  status: string
  date: string
  notes?: string
}

type StudentRef = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
}

const isNetworkError = (err: unknown) => !(err as { response?: unknown })?.response

export default function StudentsAttendancePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [students, setStudents] = useState<StudentRef[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [studentFilter, setStudentFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const pageSize = 8

  const [formState, setFormState] = useState({
    student: '',
    date: new Date().toISOString().slice(0, 10),
    status: '',
    notes: '',
  })

  useEffect(() => {
    let isMounted = true
    const loadAttendance = async () => {
      try {
        const [summaryRes, recordsRes, studentsRes] = await Promise.all([
          apiClient.get<AttendanceSummary>('/attendance/summary/'),
          apiClient.get<AttendanceRecord[] | { results: AttendanceRecord[]; count: number }>(
            '/attendance/',
            {
              params: {
                page,
                page_size: pageSize,
                student: studentFilter || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
              },
            },
          ),
          apiClient.get<StudentRef[] | { results: StudentRef[]; count: number }>('/students/', {
            params: { page_size: 200 },
          }),
        ])
        if (!isMounted) return
        setSummary(summaryRes.data)
        const normalized = normalizePaginatedResponse(recordsRes.data)
        setRecords(normalized.items)
        setTotalCount(normalized.totalCount)
        setIsServerPaginated(normalized.isPaginated)
        setStudents(normalizePaginatedResponse(studentsRes.data).items)
        setError(null)
      } catch (err) {
        if (!isMounted) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) setError('Session expired. Please log in again.')
        else if (status === 403) setError('Access denied. Ensure this user has the STUDENTS module.')
        else setError('Unable to load attendance records.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadAttendance()
    return () => {
      isMounted = false
    }
  }, [page, studentFilter, statusFilter, dateFrom, dateTo, refreshKey])

  const handleDownload = async (format: 'csv' | 'pdf') => {
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const response = await apiClient.get(`/attendance/records/export/${format}/`, {
        responseType: 'blob',
        params: {
          student: studentFilter || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName = format === 'csv' ? 'attendance_records_report.csv' : 'attendance_records_report.pdf'
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setDownloadError(`Unable to download attendance ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const stats = useMemo(
    () => [
      { label: 'Attendance Rate', value: `${summary?.attendance_rate ?? 0}%` },
      { label: 'Present', value: summary?.present ?? 0 },
      { label: 'Absent', value: summary?.absent ?? 0 },
      { label: 'Late', value: summary?.late ?? 0 },
    ],
    [summary],
  )

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : records.length) / pageSize),
  )

  const handleSubmit = async () => {
    setFormError(null)
    setFlash(null)
    if (!formState.student || !formState.date || !formState.status) {
      setFormError('Student, date, and status are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        student: Number(formState.student),
        date: formState.date,
        status: formState.status,
      }
      if (formState.notes.trim()) payload.notes = formState.notes.trim()

      await apiClient.post('/attendance/', payload)
      setIsFormOpen(false)
      setFormState({
        student: '',
        date: new Date().toISOString().slice(0, 10),
        status: '',
        notes: '',
      })
      setPage(1)
      setFlash('Attendance recorded successfully.')
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setFormError(isNetworkError(err) ? 'Network error. Please try again.' : 'Unable to save attendance.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Students</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Attendance</h1>
        <p className="mt-2 text-sm text-slate-400">Daily attendance records from the backend.</p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading attendance...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {downloadError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {downloadError}
        </div>
      ) : null}

      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">
          {flash}
        </div>
      ) : null}

      <section className="col-span-12 grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl glass-panel p-5">
            <p className="text-xs uppercase text-slate-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Daily register</h2>
            <p className="mt-1 text-sm text-slate-400">Most recent attendance entries.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownload('csv')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download CSV'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownload('pdf')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download PDF'}
            </button>
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={studentFilter}
              onChange={(event) => {
                setStudentFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.admission_number} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Excused">Excused</option>
              <option value="Half-Day">Half-Day</option>
            </select>
            <input
              type="date"
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="date"
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPage(1)
              }}
            />
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200"
              onClick={() => {
                setStudentFilter('')
                setStatusFilter('all')
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
            >
              Reset
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => {
                setIsFormOpen(true)
                setFormError(null)
              }}
            >
              Record attendance
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {records.map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{row.student_name ?? row.student}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{row.date}</td>
                  <td className="px-4 py-3">{row.notes ?? '--'}</td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={4}>
                    No attendance records found.
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
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Attendance</p>
                <h3 className="text-lg font-display font-semibold">Record attendance</h3>
              </div>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
                onClick={() => setIsFormOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="block text-sm">
                Student
                <select
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={formState.student}
                  onChange={(event) => setFormState((prev) => ({ ...prev, student: event.target.value }))}
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.admission_number} - {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  Date
                  <input
                    type="date"
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={formState.date}
                    onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  Status
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={formState.status}
                    onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option value="">Select status</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Excused">Excused</option>
                    <option value="Half-Day">Half-Day</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                Notes
                <textarea
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={formState.notes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
            </div>

            {formError ? <p className="mt-4 text-xs text-rose-300">{formError}</p> : null}
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
