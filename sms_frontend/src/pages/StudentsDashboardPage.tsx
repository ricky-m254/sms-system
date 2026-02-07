import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'

type StudentsSummary = {
  students_active: number
  enrollments_active: number
}

type Student = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  gender: string
  date_of_birth: string
  is_active: boolean
}

export default function StudentsDashboardPage() {
  const navigate = useNavigate()
  const username = useAuthStore((state) => state.username)
  const tenantId = useAuthStore((state) => state.tenantId)
  const accessToken = useAuthStore((state) => state.accessToken)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://demo.localhost:8000'

  const [summary, setSummary] = useState<StudentsSummary | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const [summaryResponse, studentsResponse] = await Promise.all([
          apiClient.get<StudentsSummary>('/students/summary/'),
          apiClient.get<Student[]>('/students/'),
        ])
        if (isMounted) {
          setSummary(summaryResponse.data)
          setStudents(studentsResponse.data)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the STUDENTS module and proper role.')
          } else if (status === 404) {
            setError(
              'Students endpoints not found (404). This usually means the tenant routing is wrong. Verify the tenant schema_name (e.g. "school_oxford") or use the correct tenant domain.',
            )
          } else {
            setError('Unable to load students data. Please try again.')
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
  }, [])

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return students
    return students.filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
      return (
        fullName.includes(term) ||
        student.admission_number.toLowerCase().includes(term)
      )
    })
  }, [query, students])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Students Module</p>
            <h1 className="text-2xl font-display font-semibold">Students Dashboard</h1>
            <p className="text-sm text-slate-400">Tenant: {tenantId ?? 'public'}</p>
          </div>
          <button
            className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 sm:w-auto"
            onClick={() => navigate('/dashboard')}
          >
            Back to main dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
          <div className="flex flex-wrap gap-4">
            <span>
              <strong>API Base:</strong> {apiBaseUrl}
            </span>
            <span>
              <strong>Tenant:</strong> {tenantId ?? 'none'}
            </span>
            <span>
              <strong>Auth:</strong> {accessToken ? 'Bearer token present' : 'Missing token'}
            </span>
          </div>
        </section>
        {isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-300">Loading students data...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active students</p>
            <p className="mt-3 text-3xl font-display font-semibold">
              {summary?.students_active ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active enrollments</p>
            <p className="mt-3 text-3xl font-display font-semibold">
              {summary?.enrollments_active ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in</p>
            <p className="mt-3 text-lg font-semibold text-emerald-200">
              {username ?? 'user'}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-semibold">Student roster</h2>
              <p className="mt-1 text-sm text-slate-400">
                Pulled from `/api/students/` using real backend data.
              </p>
            </div>
            <input
              className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search by name or admission number"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Admission #</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">DOB</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="bg-slate-950/60">
                    <td className="px-4 py-3 font-semibold">{student.admission_number}</td>
                    <td className="px-4 py-3">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-4 py-3">{student.gender}</td>
                    <td className="px-4 py-3">{student.date_of_birth}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-emerald-400/40 px-2 py-1 text-xs text-emerald-200">
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                      No students found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
