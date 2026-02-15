import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type GradingScheme = { id: number; name: string; is_default: boolean; is_active: boolean }
type GradeBand = {
  id: number
  scheme: number
  scheme_name?: string
  label: string
  min_score: string
  max_score: string
  grade_point?: string | null
  remark?: string
}
type Assessment = {
  id: number
  name: string
  category: string
  subject: number
  subject_name?: string
  class_section: number
  class_section_name?: string
  term: number
  term_name?: string
  max_score: string
  weight_percent: string
  date: string
  is_published: boolean
}
type Grade = {
  id: number
  assessment: number
  student: number
  student_name?: string
  raw_score: string
  percentage: string
  grade_band_label?: string
}
type TermResult = {
  id: number
  student_name?: string
  class_section_name?: string
  term_name?: string
  subject_name?: string
  total_score: string
  grade_band_label?: string
  class_rank?: number | null
  is_pass: boolean
}
type Student = { id: number; first_name: string; last_name: string; admission_number: string }
type Subject = { id: number; name: string; code: string }
type SchoolClass = { id: number; display_name?: string; name: string }
type Term = { id: number; name: string }

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

export default function AcademicsGradebookPage() {
  const [schemes, setSchemes] = useState<GradingScheme[]>([])
  const [bands, setBands] = useState<GradeBand[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [results, setResults] = useState<TermResult[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [schemeForm, setSchemeForm] = useState({ name: '', is_default: false, is_active: true })
  const [bandForm, setBandForm] = useState({
    scheme: '',
    label: '',
    min_score: '0',
    max_score: '100',
    grade_point: '',
    remark: '',
  })
  const [assessmentForm, setAssessmentForm] = useState({
    name: '',
    category: 'Test',
    subject: '',
    class_section: '',
    term: '',
    max_score: '100',
    weight_percent: '100',
    date: '',
    is_active: true,
  })
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [selectedClassForCompute, setSelectedClassForCompute] = useState('')
  const [selectedTermForCompute, setSelectedTermForCompute] = useState('')
  const [selectedSchemeForCompute, setSelectedSchemeForCompute] = useState('')
  const [gradeRows, setGradeRows] = useState<Record<number, string>>({})

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [schemeRes, bandRes, assessmentRes, gradeRes, resultRes, studentsRes, subjectsRes, classRes, termRes] =
        await Promise.all([
          apiClient.get('/academics/grading-schemes/'),
          apiClient.get('/academics/grade-bands/'),
          apiClient.get('/academics/assessments/'),
          apiClient.get('/academics/grades/'),
          apiClient.get('/academics/term-results/'),
          apiClient.get('/students/'),
          apiClient.get('/academics/subjects/'),
          apiClient.get('/academics/classes/'),
          apiClient.get('/academics/ref/terms/'),
        ])
      setSchemes(normalizePaginatedResponse<GradingScheme>(schemeRes.data).items)
      setBands(normalizePaginatedResponse<GradeBand>(bandRes.data).items)
      setAssessments(normalizePaginatedResponse<Assessment>(assessmentRes.data).items)
      setGrades(normalizePaginatedResponse<Grade>(gradeRes.data).items)
      setResults(normalizePaginatedResponse<TermResult>(resultRes.data).items)
      setStudents(normalizePaginatedResponse<Student>(studentsRes.data).items)
      setSubjects(normalizePaginatedResponse<Subject>(subjectsRes.data).items)
      setClasses(normalizePaginatedResponse<SchoolClass>(classRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(termRes.data).items)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const currentAssessment = useMemo(
    () => assessments.find((item) => String(item.id) === String(selectedAssessment)),
    [assessments, selectedAssessment],
  )

  const submitScheme = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/grading-schemes/', schemeForm)
      setSchemeForm({ name: '', is_default: false, is_active: true })
      setFlash('Grading scheme created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitBand = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/grade-bands/', {
        scheme: Number(bandForm.scheme),
        label: bandForm.label,
        min_score: Number(bandForm.min_score),
        max_score: Number(bandForm.max_score),
        grade_point: bandForm.grade_point ? Number(bandForm.grade_point) : null,
        remark: bandForm.remark,
        is_active: true,
      })
      setBandForm({ scheme: '', label: '', min_score: '0', max_score: '100', grade_point: '', remark: '' })
      setFlash('Grade band created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitAssessment = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/assessments/', {
        ...assessmentForm,
        subject: Number(assessmentForm.subject),
        class_section: Number(assessmentForm.class_section),
        term: Number(assessmentForm.term),
        max_score: Number(assessmentForm.max_score),
        weight_percent: Number(assessmentForm.weight_percent),
      })
      setAssessmentForm({
        name: '',
        category: 'Test',
        subject: '',
        class_section: '',
        term: '',
        max_score: '100',
        weight_percent: '100',
        date: '',
        is_active: true,
      })
      setFlash('Assessment created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const publishAssessment = async (id: number) => {
    setError(null)
    setFlash(null)
    try {
      await apiClient.post(`/academics/assessments/${id}/publish/`, {})
      setFlash('Assessment published.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitBulkGrades = async () => {
    if (!currentAssessment) return
    setError(null)
    setFlash(null)
    const rows = Object.entries(gradeRows)
      .filter(([, score]) => score !== '')
      .map(([studentId, score]) => ({
        student: Number(studentId),
        raw_score: Number(score),
        remarks: '',
      }))
    if (rows.length === 0) {
      setError('Enter at least one score.')
      return
    }
    try {
      await apiClient.post('/academics/grades/bulk/', {
        assessment: currentAssessment.id,
        grades: rows,
      })
      setFlash('Bulk grades saved.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const computeResults = async () => {
    if (!selectedClassForCompute || !selectedTermForCompute) return
    setError(null)
    setFlash(null)
    try {
      const payload: Record<string, number> = {
        class_section: Number(selectedClassForCompute),
        term: Number(selectedTermForCompute),
      }
      if (selectedSchemeForCompute) payload.grading_scheme = Number(selectedSchemeForCompute)
      await apiClient.post('/academics/term-results/compute/', payload)
      setFlash('Term results computed.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Academics</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Gradebook</h1>
        <p className="mt-2 text-sm text-slate-400">Manage grading schemes, assessments, mark entry, and term computation.</p>
      </header>

      {isLoading ? <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">Loading gradebook...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}
      {flash ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">{flash}</div> : null}

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Grading Schemes</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitScheme}>
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Scheme name" value={schemeForm.name} onChange={(e) => setSchemeForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={schemeForm.is_default} onChange={(e) => setSchemeForm((prev) => ({ ...prev, is_default: e.target.checked }))} />Set as default</label>
            <button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Create scheme</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[420px] text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Default</th></tr></thead><tbody className="divide-y divide-slate-800">{schemes.map((item) => <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.is_default ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Grade Bands</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitBand}>
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={bandForm.scheme} onChange={(e) => setBandForm((prev) => ({ ...prev, scheme: e.target.value }))} required>
              <option value="">Select scheme</option>
              {schemes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-3">
              <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Label (A)" value={bandForm.label} onChange={(e) => setBandForm((prev) => ({ ...prev, label: e.target.value }))} required />
              <input type="number" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Min" value={bandForm.min_score} onChange={(e) => setBandForm((prev) => ({ ...prev, min_score: e.target.value }))} required />
              <input type="number" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Max" value={bandForm.max_score} onChange={(e) => setBandForm((prev) => ({ ...prev, max_score: e.target.value }))} required />
            </div>
            <button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Create band</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[520px] text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Scheme</th><th className="px-3 py-2 text-left">Label</th><th className="px-3 py-2 text-left">Range</th></tr></thead><tbody className="divide-y divide-slate-800">{bands.map((item) => <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.scheme_name}</td><td className="px-3 py-2">{item.label}</td><td className="px-3 py-2">{item.min_score} - {item.max_score}</td></tr>)}</tbody></table>
          </div>
        </div>
      </section>

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Assessments</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitAssessment}>
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Assessment name" value={assessmentForm.name} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assessmentForm.category} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, category: e.target.value }))}>
                {['Classwork','Homework','Test','Exam','Project','Practical'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assessmentForm.subject} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, subject: e.target.value }))} required>
                <option value="">Subject</option>
                {subjects.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
              </select>
              <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assessmentForm.class_section} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, class_section: e.target.value }))} required>
                <option value="">Class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assessmentForm.term} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, term: e.target.value }))} required>
                <option value="">Term</option>
                {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input type="number" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Max score" value={assessmentForm.max_score} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, max_score: e.target.value }))} required />
              <input type="number" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Weight %" value={assessmentForm.weight_percent} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, weight_percent: e.target.value }))} required />
              <input type="date" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assessmentForm.date} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, date: e.target.value }))} required />
            </div>
            <button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Create assessment</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-left">Published</th><th className="px-3 py-2 text-left">Action</th></tr></thead><tbody className="divide-y divide-slate-800">{assessments.map((item) => <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.subject_name}</td><td className="px-3 py-2">{item.class_section_name}</td><td className="px-3 py-2">{item.term_name}</td><td className="px-3 py-2">{item.is_published ? 'Yes' : 'No'}</td><td className="px-3 py-2"><button className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-60" onClick={() => publishAssessment(item.id)} disabled={item.is_published}>Publish</button></td></tr>)}</tbody></table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-display font-semibold">Bulk Mark Entry</h2>
          <div className="mt-4 grid gap-3">
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={selectedAssessment} onChange={(e) => { setSelectedAssessment(e.target.value); setGradeRows({}) }}>
              <option value="">Select assessment</option>
              {assessments.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.class_section_name})</option>)}
            </select>
            {currentAssessment ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">Score / {currentAssessment.max_score}</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {students.map((student) => (
                      <tr key={student.id} className="bg-slate-950/50">
                        <td className="px-3 py-2">{student.admission_number} - {student.first_name} {student.last_name}</td>
                        <td className="px-3 py-2"><input type="number" min={0} max={Number(currentAssessment.max_score)} className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm" value={gradeRows[student.id] ?? ''} onChange={(e) => setGradeRows((prev) => ({ ...prev, [student.id]: e.target.value }))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-60" onClick={submitBulkGrades} disabled={!currentAssessment}>Save bulk grades</button>
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Term Results</h2>
            <p className="mt-1 text-sm text-slate-400">Compute weighted term results by class and term.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={selectedClassForCompute} onChange={(e) => setSelectedClassForCompute(e.target.value)}>
              <option value="">Class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>)}
            </select>
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={selectedTermForCompute} onChange={(e) => setSelectedTermForCompute(e.target.value)}>
              <option value="">Term</option>
              {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={selectedSchemeForCompute} onChange={(e) => setSelectedSchemeForCompute(e.target.value)}>
              <option value="">Default scheme</option>
              {schemes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" onClick={computeResults}>Compute</button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[860px] text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Total</th><th className="px-3 py-2 text-left">Grade</th><th className="px-3 py-2 text-left">Rank</th><th className="px-3 py-2 text-left">Pass</th></tr></thead><tbody className="divide-y divide-slate-800">{results.map((item) => <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.student_name}</td><td className="px-3 py-2">{item.class_section_name}</td><td className="px-3 py-2">{item.term_name}</td><td className="px-3 py-2">{item.subject_name}</td><td className="px-3 py-2">{item.total_score}</td><td className="px-3 py-2">{item.grade_band_label || '--'}</td><td className="px-3 py-2">{item.class_rank ?? '--'}</td><td className="px-3 py-2">{item.is_pass ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-display font-semibold">Recent Grades</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Assessment</th><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">Raw</th><th className="px-3 py-2 text-left">%</th><th className="px-3 py-2 text-left">Band</th></tr></thead><tbody className="divide-y divide-slate-800">{grades.map((item) => <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.assessment}</td><td className="px-3 py-2">{item.student_name}</td><td className="px-3 py-2">{item.raw_score}</td><td className="px-3 py-2">{item.percentage}</td><td className="px-3 py-2">{item.grade_band_label || '--'}</td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  )
}
