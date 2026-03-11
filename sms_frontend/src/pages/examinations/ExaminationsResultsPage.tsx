import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PrintButton from '../../components/PrintButton'

type Session = { id: number; name: string }
type Paper = { id: number; subject_name: string; total_marks: number; session: number }
type Student = { id: number; full_name: string; admission_number: string }
type Result = { id: number; paper: number; paper_name: string; student: number; student_name: string; marks_obtained: number; grade: string; remarks: string; is_absent: boolean }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function ExaminationsResultsPage() {
  const [results, setResults] = useState<Result[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filterSession, setFilterSession] = useState<number | ''>('')
  const [filterPaper, setFilterPaper] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Result | null>(null)
  const [paperId, setPaperId] = useState<number | ''>('')
  const [studentId, setStudentId] = useState<number | ''>('')
  const [marks, setMarks] = useState('0')
  const [grade, setGrade] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isAbsent, setIsAbsent] = useState(false)

  const load = async () => {
    try {
      const params: Record<string, string> = {}
      if (filterPaper) params.paper = String(filterPaper)
      const [rr, rs, rp, rst] = await Promise.all([
        apiClient.get<Result[] | { results: Result[] }>('/examinations/results/', { params }),
        apiClient.get<Session[] | { results: Session[] }>('/examinations/sessions/'),
        apiClient.get<Paper[] | { results: Paper[] }>('/examinations/papers/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/'),
      ])
      setResults(asArray(rr.data)); setSessions(asArray(rs.data)); setPapers(asArray(rp.data)); setStudents(asArray(rst.data))
    } catch { setError('Unable to load results.') }
  }

  useEffect(() => { void load() }, [filterPaper])

  const filteredPapers = filterSession ? papers.filter(p => p.session === filterSession) : papers

  const openCreate = () => {
    setEditing(null); setPaperId(filterPaper || ''); setStudentId(''); setMarks('0'); setGrade(''); setRemarks(''); setIsAbsent(false)
    setModal(true)
  }

  const openEdit = (r: Result) => {
    setEditing(r); setPaperId(r.paper); setStudentId(r.student); setMarks(String(r.marks_obtained)); setGrade(r.grade); setRemarks(r.remarks); setIsAbsent(r.is_absent)
    setModal(true)
  }

  const save = async () => {
    if (!paperId || !studentId) return
    setError(null)
    try {
      const p = { paper: paperId, student: studentId, marks_obtained: Number(marks), grade: grade.trim(), remarks: remarks.trim(), is_absent: isAbsent }
      if (editing) { await apiClient.put(`/examinations/results/${editing.id}/`, p); setNotice('Result updated.') }
      else { await apiClient.post('/examinations/results/', p); setNotice('Result recorded.') }
      setModal(false); await load()
    } catch { setError('Unable to save result.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this result?')) return
    try { await apiClient.delete(`/examinations/results/${id}/`); await load() }
    catch { setError('Unable to delete result.') }
  }

  const maxMarksFor = (papId: number | '') => papers.find(p => p.id === papId)?.total_marks ?? 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Examinations</p><h1 className="mt-1 text-2xl font-display font-bold text-white">Results Entry</h1></div>
        <div className="flex gap-2">
          <PrintButton printId="results-print-area" label="Print Results" title="Exam Results" />
          <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">+ Record Result</button>
        </div>
      </div>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
      <div className="flex gap-3 flex-wrap">
        <select value={filterSession} onChange={e => { setFilterSession(e.target.value ? Number(e.target.value) : ''); setFilterPaper('') }} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm min-w-[180px]">
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterPaper} onChange={e => setFilterPaper(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm min-w-[180px]">
          <option value="">All papers</option>
          {filteredPapers.map(p => <option key={p.id} value={p.id}>{p.subject_name}</option>)}
        </select>
      </div>
      {/* Hidden print area */}
      <div id="results-print-area" className="hidden">
        <div className="print-header"><h1>Exam Results</h1></div>
        <table>
          <thead><tr><th>Student</th><th>Adm. No.</th><th>Paper / Subject</th><th>Marks</th><th>Grade</th><th>Status</th><th>Remarks</th></tr></thead>
          <tbody>
            {results.map(r => (
              <tr key={r.id}>
                <td>{r.student_name}</td>
                <td>{(r as any).admission_number || '—'}</td>
                <td>{r.paper_name}</td>
                <td>{r.is_absent ? 'ABS' : `${r.marks_obtained} / ${maxMarksFor(r.paper)}`}</td>
                <td>{r.grade || '—'}</td>
                <td>{r.is_absent ? 'Absent' : 'Sat'}</td>
                <td>{r.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-xs">
            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Paper</th><th className="px-4 py-3">Marks</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {results.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No results recorded.</td></tr>
            ) : results.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-medium text-white">{r.student_name}</td>
                <td className="px-4 py-3 text-slate-400">{r.paper_name}</td>
                <td className="px-4 py-3 font-mono">{r.is_absent ? 'ABS' : `${r.marks_obtained} / ${maxMarksFor(r.paper)}`}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">{r.grade || '—'}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${r.is_absent ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{r.is_absent ? 'Absent' : 'Sat'}</span></td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800">Edit</button>
                  <button onClick={() => del(r.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20">Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Result' : 'Record Result'}</h2>
            <select value={paperId} onChange={e => setPaperId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Select paper</option>
              {papers.map(p => <option key={p.id} value={p.id}>{p.subject_name} (/{p.total_marks})</option>)}
            </select>
            <select value={studentId} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} — {s.full_name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={isAbsent} onChange={e => setIsAbsent(e.target.checked)} />
              Mark as absent
            </label>
            {!isAbsent && (
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={marks} onChange={e => setMarks(e.target.value)} placeholder="Marks obtained" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade (A, B, …)" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              </div>
            )}
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks…" rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm resize-none" />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Record'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
