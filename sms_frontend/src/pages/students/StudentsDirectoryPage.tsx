import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { Link } from 'react-router-dom'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadBlob, extractFilename } from '../../utils/download'

type Student = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  gender: string
  date_of_birth?: string
  is_active: boolean
  enrollment_date?: string
  photo?: string
  class_name?: string
}

export default function StudentsDirectoryPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [exportError, setExportError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadStudents = async () => {
      try {
        const response = await apiClient.get<Student[] | { results: Student[]; count: number }>(
          '/students/',
          {
            params: {
              page,
              page_size: pageSize,
              search: query.trim() || undefined,
              gender: genderFilter !== 'all' ? genderFilter : undefined,
              is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
            },
          },
        )
        if (isMounted) {
          const normalized = normalizePaginatedResponse(response.data)
          setStudents(normalized.items)
          setTotalCount(normalized.totalCount)
          setIsServerPaginated(normalized.isPaginated)
        }
      } catch (err) {
        if (!isMounted) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          setError('Session expired. Please log in again.')
        } else if (status === 403) {
          setError('Access denied. Ensure this user has the STUDENTS module and proper role.')
        } else if (status === 404) {
          setError('Students endpoints not found (404). Verify tenant routing.')
        } else {
          setError('Unable to load students. Check backend connectivity.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadStudents()
    return () => {
      isMounted = false
    }
  }, [page, query, genderFilter, statusFilter])

  const filteredStudents = useMemo(() => {
    if (isServerPaginated) return students
    const term = query.trim().toLowerCase()
    return students.filter((student) => {
      if (genderFilter !== 'all' && student.gender !== genderFilter) return false
      if (statusFilter !== 'all' && student.is_active !== (statusFilter === 'active')) {
        return false
      }
      if (!term) return true
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
      return (
        fullName.includes(term) ||
        student.admission_number?.toLowerCase().includes(term)
      )
    })
  }, [students, query, genderFilter, statusFilter, isServerPaginated])

  const pagedStudents = useMemo(() => {
    if (isServerPaginated) return filteredStudents
    const start = (page - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, isServerPaginated, page])

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredStudents.length) / pageSize),
  )

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExportError(null)
    setIsExporting(true)
    try {
      const response = await apiClient.get(`/students/export/${format}/`, {
        params: {
          search: query.trim() || undefined,
          gender: genderFilter !== 'all' ? genderFilter : undefined,
          is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        },
        responseType: 'blob',
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName = format === 'csv' ? 'students_directory.csv' : 'students_directory.pdf'
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setExportError(`Unable to export ${format.toUpperCase()} for student directory.`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Student Directory"
        subtitle="Browse and search all students."
        icon="📋"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading students...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Roster</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/students/`.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-60"
              disabled={isExporting}
              onClick={() => handleExport('csv')}
            >
              Download CSV
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-60"
              disabled={isExporting}
              onClick={() => handleExport('pdf')}
            >
              Download PDF
            </button>
            <input
              className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search name or admission #"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={genderFilter}
              onChange={(event) => {
                setGenderFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {exportError ? (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
            {exportError}
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Admission #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Enrollment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedStudents.map((student) => (
                <tr key={student.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{student.admission_number}</td>
                  <td className="px-4 py-3">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-4 py-3">{student.gender}</td>
                  <td className="px-4 py-3">{student.class_name ?? '--'}</td>
                  <td className="px-4 py-3">{student.enrollment_date ?? '--'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-emerald-400/40 px-2 py-1 text-xs text-emerald-200">
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                      to={`/modules/students/${student.id}`}
                    >
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
              {pagedStudents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={7}>
                    No students found.
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
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
