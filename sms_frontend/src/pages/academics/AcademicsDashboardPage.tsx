import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type SummaryResponse = {
  average_score: string
  pass_rate_percent: number
  total_results: number
  at_risk_students: number
  grade_distribution: Array<{ grade_band: string; count: number }>
}
type ClassPerformance = {
  class_section_id: number
  class_name: string
  average_score: string
  pass_rate_percent: number
  total_results: number
}
type SubjectPerformance = {
  subject_id: number
  subject_name: string
  subject_code: string
  average_score: string
  pass_rate_percent: number
  total_results: number
}
type AtRisk = {
  student_id: number
  admission_number: string
  student_name: string
  failing_subjects: number
  average_score: string
}
type Trend = {
  term_id: number
  term_name: string
  average_score: string
  pass_rate_percent: number
  total_results: number
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

export default function AcademicsDashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([])
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([])
  const [atRisk, setAtRisk] = useState<AtRisk[]>([])
  const [trend, setTrend] = useState<Trend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [summaryRes, classRes, subjectRes, atRiskRes, trendRes] = await Promise.all([
          apiClient.get('/academics/analytics/summary/'),
          apiClient.get('/academics/analytics/class-performance/'),
          apiClient.get('/academics/analytics/subject-performance/'),
          apiClient.get('/academics/analytics/at-risk/'),
          apiClient.get('/academics/analytics/trend/'),
        ])
        setSummary(summaryRes.data as SummaryResponse)
        setClassPerformance(normalizePaginatedResponse<ClassPerformance>(classRes.data).items)
        setSubjectPerformance(normalizePaginatedResponse<SubjectPerformance>(subjectRes.data).items)
        setAtRisk(normalizePaginatedResponse<AtRisk>(atRiskRes.data).items)
        setTrend(normalizePaginatedResponse<Trend>(trendRes.data).items)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Academics</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Academic KPIs, trends, class/subject performance, and at-risk signals.</p>
      </header>

      {isLoading ? <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">Loading analytics dashboard...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}

      <section className="col-span-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Average Score</p><p className="mt-3 text-2xl font-semibold">{summary?.average_score ?? '--'}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Pass Rate</p><p className="mt-3 text-2xl font-semibold">{summary?.pass_rate_percent ?? 0}%</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Total Results</p><p className="mt-3 text-2xl font-semibold">{summary?.total_results ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">At-Risk Students</p><p className="mt-3 text-2xl font-semibold">{summary?.at_risk_students ?? 0}</p></div>
      </section>

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Class Performance</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Avg</th><th className="px-3 py-2 text-left">Pass %</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{classPerformance.map((row) => <tr key={row.class_section_id} className="bg-slate-950/50"><td className="px-3 py-2">{row.class_name}</td><td className="px-3 py-2">{row.average_score}</td><td className="px-3 py-2">{row.pass_rate_percent}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Subject Performance</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Avg</th><th className="px-3 py-2 text-left">Pass %</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{subjectPerformance.map((row) => <tr key={row.subject_id} className="bg-slate-950/50"><td className="px-3 py-2">{row.subject_code} - {row.subject_name}</td><td className="px-3 py-2">{row.average_score}</td><td className="px-3 py-2">{row.pass_rate_percent}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">At-Risk Students</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">Failing Subjects</th><th className="px-3 py-2 text-left">Avg</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{atRisk.map((row) => <tr key={row.student_id} className="bg-slate-950/50"><td className="px-3 py-2">{row.admission_number} - {row.student_name}</td><td className="px-3 py-2">{row.failing_subjects}</td><td className="px-3 py-2">{row.average_score}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Trend by Term</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-left">Avg</th><th className="px-3 py-2 text-left">Pass %</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{trend.map((row) => <tr key={row.term_id} className="bg-slate-950/50"><td className="px-3 py-2">{row.term_name}</td><td className="px-3 py-2">{row.average_score}</td><td className="px-3 py-2">{row.pass_rate_percent}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
