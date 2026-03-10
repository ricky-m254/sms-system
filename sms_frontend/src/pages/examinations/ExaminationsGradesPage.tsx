import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'

type GradeBoundary = { id: number; session: number; session_name: string; grade: string; min_score: number; max_score: number; points: number; remarks: string }
type Session = { id: number; name: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function ExaminationsGradesPage() {
  const [grades, setGrades] = useState<GradeBoundary[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [filterSession, setFilterSession] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<GradeBoundary | null>(null)
  const [sessionId, setSessionId] = useState<number | ''>('')
  const [grade, setGrade] = useState('')
  const [minScore, setMinScore] = useState('0')
  const [maxScore, setMaxScore] = useState('100')
  const [points, setPoints] = useState('0')
  const [gradeRemarks, setGradeRemarks] = useState('')

  const load = async () => {
    try {
      const params: Record<string, string> = {}
      if (filterSession) params.session = String(filterSession)
      const [rg, rs] = await Promise.all([
        apiClient.get<GradeBoundary[] | { results: GradeBoundary[] }>('/examinations/grade-boundaries/', { params }),
        apiClient.get<Session[] | { results: Session[] }>('/examinations/sessions/'),
      ])
      setGrades(asArray(rg.data)); setSessions(asArray(rs.data))
    } catch { setError('Unable to load grade boundaries.') }
  }

  useEffect(() => { void load() }, [filterSession])

  const openCreate = () => {
    setEditing(null); setSessionId(filterSession || ''); setGrade(''); setMinScore('0'); setMaxScore('100'); setPoints('0'); setGradeRemarks('')
    setModal(true)
  }

  const openEdit = (g: GradeBoundary) => {
    setEditing(g); setSessionId(g.session); setGrade(g.grade); setMinScore(String(g.min_score)); setMaxScore(String(g.max_score)); setPoints(String(g.points)); setGradeRemarks(g.remarks)
    setModal(true)
  }

  const save = async () => {
    if (!sessionId || !grade.trim()) return
    setError(null)
    try {
      const p = { session: sessionId, grade: grade.trim(), min_score: Number(minScore), max_score: Number(maxScore), points: Number(points), remarks: gradeRemarks.trim() }
      if (editing) { await apiClient.put(`/examinations/grade-boundaries/${editing.id}/`, p); setNotice('Grade boundary updated.') }
      else { await apiClient.post('/examinations/grade-boundaries/', p); setNotice('Grade boundary added.') }
      setModal(false); await load()
    } catch { setError('Unable to save grade boundary.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this grade boundary?')) return
    try { await apiClient.delete(`/examinations/grade-boundaries/${id}/`); await load() }
    catch { setError('Unable to delete grade boundary.') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Examinations</p><h1 className="mt-1 text-2xl font-display font-bold text-white">Grade Boundaries</h1></div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">+ Add Grade</button>
      </div>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
      <div className="flex gap-3">
        <select value={filterSession} onChange={e => setFilterSession(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm min-w-[180px]">
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-xs">
            <tr><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Range</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Remarks</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {grades.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No grade boundaries defined.</td></tr>
            ) : grades.map(g => (
              <tr key={g.id} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-bold text-white text-lg">{g.grade}</td>
                <td className="px-4 py-3 text-slate-400">{g.session_name}</td>
                <td className="px-4 py-3 font-mono">{g.min_score} – {g.max_score}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">{g.points} pts</span></td>
                <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{g.remarks || '—'}</td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <button onClick={() => openEdit(g)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800">Edit</button>
                  <button onClick={() => del(g.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20">Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Grade Boundary' : 'Add Grade Boundary'}</h2>
            <select value={sessionId} onChange={e => setSessionId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">Select session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade label (A, B+, D, …)" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-3">
              <input type="number" value={minScore} onChange={e => setMinScore(e.target.value)} placeholder="Min %" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              <input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)} placeholder="Max %" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              <input type="number" value={points} onChange={e => setPoints(e.target.value)} placeholder="Points" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
            </div>
            <input value={gradeRemarks} onChange={e => setGradeRemarks(e.target.value)} placeholder="Remarks (e.g. Excellent)" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Add'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
