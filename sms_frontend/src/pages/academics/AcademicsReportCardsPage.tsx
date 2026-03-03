import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'

type SchoolClass = { id: number; display_name?: string; name: string }
type Term = { id: number; name: string }
type ReportCard = {
  id: number
  student: number
  student_name?: string
  class_section: number
  class_section_name?: string
  term: number
  term_name?: string
  academic_year_name?: string
  status: 'Draft' | 'Submitted' | 'Approved' | 'Published' | 'Distributed'
  overall_grade?: string
  class_rank?: number | null
  attendance_days: number
  teacher_remarks?: string
  principal_remarks?: string
  pdf_url?: string
}

function getErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data) return 'Request failed.'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const messages: string[] = []
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if (Array.isArray(value)) messages.push(`${key}: ${value.join(' ')}`)
      else if (typeof value === 'string') messages.push(`${key}: ${value}`)
    })
    if (messages.length > 0) return messages.join(' | ')
  }
  return 'Request failed.'
}

const statusClasses: Record<ReportCard['status'], string> = {
  Draft: 'border-slate-600 text-slate-300',
  Submitted: 'border-sky-500/50 text-sky-200',
  Approved: 'border-emerald-500/50 text-emerald-200',
  Published: 'border-amber-500/50 text-amber-200',
  Distributed: 'border-violet-500/50 text-violet-200',
}

export default function AcademicsReportCardsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [reportCards, setReportCards] = useState<ReportCard[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [classRes, termRes, reportRes] = await Promise.all([
        apiClient.get('/academics/classes/'),
        apiClient.get('/academics/ref/terms/'),
        apiClient.get('/academics/report-cards/'),
      ])
      setClasses(normalizePaginatedResponse<SchoolClass>(classRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(termRes.data).items)
      setReportCards(normalizePaginatedResponse<ReportCard>(reportRes.data).items)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const generateReportCards = async () => {
    if (!selectedClass || !selectedTerm) return
    setIsGenerating(true)
    setError(null)
    setFlash(null)
    try {
      const res = await apiClient.post('/academics/report-cards/generate/', {
        class_section: Number(selectedClass),
        term: Number(selectedTerm),
      })
      setFlash((res.data as { message?: string })?.message ?? 'Report cards generated.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsGenerating(false)
    }
  }

  const runAction = async (id: number, action: 'approve' | 'publish') => {
    setError(null)
    setFlash(null)
    try {
      await apiClient.post(`/academics/report-cards/${id}/${action}/`, {})
      setFlash(`Report card ${action}d.`)
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const distributePublished = async () => {
    setError(null)
    setFlash(null)
    try {
      const publishedIds = reportCards.filter((item) => item.status === 'Published').map((item) => item.id)
      const res = await apiClient.post('/academics/report-cards/distribute/', {
        report_card_ids: publishedIds,
      })
      const count = (res.data as { count?: number })?.count ?? 0
      setFlash(`Distributed ${count} report card(s).`)
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const downloadPdf = async (id: number) => {
    setError(null)
    try {
      const response = await apiClient.get(`/academics/report-cards/${id}/pdf/`, {
        responseType: 'blob',
      })
      downloadFromResponse(response as { data: Blob; headers?: Record<string, unknown> }, `report_card_${id}.pdf`)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download report card PDF.'))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Academics</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Report Cards</h1>
        <p className="mt-2 text-sm text-slate-400">
          Generate, approve, publish, distribute, and download student report cards.
        </p>
      </header>

      {isLoading ? <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">Loading report cards...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}
      {flash ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">{flash}</div> : null}

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-display font-semibold">Generate Report Cards</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <select
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.display_name ?? item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="">Select term</option>
            {terms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-60"
            onClick={generateReportCards}
            disabled={isGenerating || !selectedClass || !selectedTerm}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
          <button
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200"
            onClick={distributePublished}
          >
            Distribute Published
          </button>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-display font-semibold">Report Card List</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Term</th>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-left">Overall</th>
                <th className="px-3 py-2 text-left">Rank</th>
                <th className="px-3 py-2 text-left">Attendance</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {reportCards.map((item) => (
                <tr key={item.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{item.student_name}</td>
                  <td className="px-3 py-2">{item.class_section_name}</td>
                  <td className="px-3 py-2">{item.term_name}</td>
                  <td className="px-3 py-2">{item.academic_year_name}</td>
                  <td className="px-3 py-2">{item.overall_grade || '--'}</td>
                  <td className="px-3 py-2">{item.class_rank ?? '--'}</td>
                  <td className="px-3 py-2">{item.attendance_days}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClasses[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-60"
                        onClick={() => runAction(item.id, 'approve')}
                        disabled={item.status === 'Approved' || item.status === 'Published' || item.status === 'Distributed'}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-60"
                        onClick={() => runAction(item.id, 'publish')}
                        disabled={item.status !== 'Approved'}
                      >
                        Publish
                      </button>
                      <button
                        className="rounded-lg border border-slate-700 px-2 py-1 text-xs"
                        onClick={() => downloadPdf(item.id)}
                      >
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reportCards.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-400">
                    No report cards yet. Generate for a class and term.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
