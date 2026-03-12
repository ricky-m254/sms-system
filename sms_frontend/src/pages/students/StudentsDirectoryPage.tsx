import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadBlob, extractFilename } from '../../utils/download'
import PageHero from '../../components/PageHero'

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
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [addSaving, setAddSaving] = useState(false)
  const [addMsg, setAddMsg] = useState('')
  const [classes, setClasses] = useState<{ id: number; display_name: string }[]>([])
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', gender: 'Male', date_of_birth: '',
    school_class: '', enrollment_date: new Date().toISOString().slice(0, 10),
  })

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

  useEffect(() => {
    apiClient.get('/academics/classes/').then(res => {
      setClasses(res.data.results || res.data || [])
    }).catch(() => setClasses([]))
  }, [])

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

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault()
    if (!newStudent.first_name || !newStudent.last_name) {
      setAddMsg('First and last name are required.')
      return
    }
    setAddSaving(true)
    setAddMsg('')
    try {
      const payload: Record<string, unknown> = {
        first_name: newStudent.first_name.trim(),
        last_name: newStudent.last_name.trim(),
        gender: newStudent.gender,
        is_active: true,
      }
      if (newStudent.date_of_birth) payload.date_of_birth = newStudent.date_of_birth
      if (newStudent.enrollment_date) payload.enrollment_date = newStudent.enrollment_date
      if (newStudent.school_class) payload.school_class = Number(newStudent.school_class)
      await apiClient.post('/students/', payload)
      setAddMsg('Student added successfully!')
      setNewStudent({ first_name: '', last_name: '', gender: 'Male', date_of_birth: '', school_class: '', enrollment_date: new Date().toISOString().slice(0, 10) })
      setTimeout(() => { setShowAddStudent(false); setAddMsg(''); setPage(1) }, 1500)
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.first_name?.[0]) setAddMsg(detail.first_name[0])
      else if (detail?.error) setAddMsg(detail.error)
      else if (typeof detail === 'string') setAddMsg(detail)
      else setAddMsg('Unable to create student. Please try again.')
    } finally {
      setAddSaving(false)
    }
  }

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
        actions={
          <button onClick={() => { setShowAddStudent(true); setAddMsg('') }}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            + Add Student
          </button>
        }
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

      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Students</p>
                <h2 className="text-lg font-display font-bold text-white">New Student</h2>
              </div>
              <button onClick={() => setShowAddStudent(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">First Name *</label>
                  <input required value={newStudent.first_name} onChange={e => setNewStudent(s => ({ ...s, first_name: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="First name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Last Name *</label>
                  <input required value={newStudent.last_name} onChange={e => setNewStudent(s => ({ ...s, last_name: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="Last name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Gender</label>
                  <select value={newStudent.gender} onChange={e => setNewStudent(s => ({ ...s, gender: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date of Birth</label>
                  <input type="date" value={newStudent.date_of_birth} onChange={e => setNewStudent(s => ({ ...s, date_of_birth: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Class</label>
                  <select value={newStudent.school_class} onChange={e => setNewStudent(s => ({ ...s, school_class: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Enrollment Date</label>
                  <input type="date" value={newStudent.enrollment_date} onChange={e => setNewStudent(s => ({ ...s, enrollment_date: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              {addMsg && (
                <p className={`text-xs font-medium ${addMsg.includes('successfully') ? 'text-emerald-400' : 'text-rose-400'}`}>{addMsg}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddStudent(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-300 transition"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
                <button type="submit" disabled={addSaving}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-slate-950 transition hover:opacity-90" style={{ background: '#10b981' }}>
                  {addSaving ? 'Creating…' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
