import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'

type Term = { id: number; name: string }
type Session = { id: number; name: string; status: string; start_date: string; end_date: string; term: number | null; is_active: boolean; notes: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const STATUSES = ['Scheduled', 'Ongoing', 'Completed', 'Cancelled']
const statusBadge: Record<string, string> = {
  Scheduled: 'bg-slate-700 text-slate-300',
  Ongoing: 'bg-blue-500/20 text-blue-300',
  Completed: 'bg-emerald-500/20 text-emerald-300',
  Cancelled: 'bg-rose-500/20 text-rose-300',
}

export default function ExaminationsSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('Scheduled')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [termId, setTermId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [rs, rt] = await Promise.all([
        apiClient.get<Session[] | { results: Session[] }>('/examinations/sessions/'),
        apiClient.get<Term[] | { results: Term[] }>('/academics/terms/'),
      ])
      setSessions(asArray(rs.data)); setTerms(asArray(rt.data))
    } catch { setError('Unable to load sessions.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setEditing(null); setName(''); setStatus('Scheduled'); setStartDate(''); setEndDate(''); setTermId(''); setNotes('')
    setModal(true)
  }

  const openEdit = (s: Session) => {
    setEditing(s); setName(s.name); setStatus(s.status); setStartDate(s.start_date); setEndDate(s.end_date); setTermId(s.term ?? ''); setNotes(s.notes)
    setModal(true)
  }

  const save = async () => {
    if (!name.trim() || !startDate || !endDate) return
    setError(null)
    try {
      const p = { name: name.trim(), status, start_date: startDate, end_date: endDate, term: termId || null, notes: notes.trim() }
      if (editing) { await apiClient.put(`/examinations/sessions/${editing.id}/`, p); setNotice('Session updated.') }
      else { await apiClient.post('/examinations/sessions/', p); setNotice('Session created.') }
      setModal(false); await load()
    } catch { setError('Unable to save session.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this exam session?')) return
    try { await apiClient.delete(`/examinations/sessions/${id}/`); await load() }
    catch { setError('Unable to delete session.') }
  }

  const changeStatus = async (s: Session, newStatus: string) => {
    try { await apiClient.patch(`/examinations/sessions/${s.id}/`, { status: newStatus }); await load() }
    catch { setError('Unable to update status.') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Examinations</p><h1 className="mt-1 text-2xl font-display font-bold text-white">Exam Sessions</h1></div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">+ Create Session</button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Term</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading sessions...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No exam sessions found</td></tr>
            ) : sessions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/40 transition">
                <td className="px-6 py-4 font-medium text-white">{s.name}</td>
                <td className="px-6 py-4 text-slate-400">{terms.find(t => t.id === s.term)?.name || '—'}</td>
                <td className="px-6 py-4">
                  <select value={s.status} onChange={e => changeStatus(s, e.target.value)} className={`rounded-full px-2 py-1 text-xs font-medium cursor-pointer bg-transparent border-0 ${statusBadge[s.status] ?? 'text-slate-300'}`}>
                    {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </td>
                <td className="px-6 py-4 text-xs font-mono">{s.start_date} → {s.end_date}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">Edit</button>
                    <button onClick={() => del(s.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Session' : 'Create Session'}</h2>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Session name (e.g. Mid-Term 2025)" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Start date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">End date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" /></div>
            </div>
            <select value={termId} onChange={e => setTermId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
              <option value="">No term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm resize-none" />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Create'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
