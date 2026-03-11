import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'

type Session = { id: number; name: string }
type Subject = { id: number; name: string }
type SchoolClass = { id: number; display_name: string; name: string }
type Paper = {
  id: number
  session: number
  session_name: string
  subject: number
  subject_name: string
  school_class: number
  class_name: string
  paper_code: string
  max_marks: number
  date: string
  start_time: string
  duration_minutes: number
  venue: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function ExaminationsPapersPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [filterSession, setFilterSession] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Paper | null>(null)
  const [sessionId, setSessionId] = useState<number | ''>('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [classId, setClassId] = useState<number | ''>('')
  const [paperCode, setPaperCode] = useState('')
  const [maxMarks, setMaxMarks] = useState('100')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('120')
  const [venue, setVenue] = useState('')

  const load = async () => {
    try {
      const [rp, rs, rx, rc] = await Promise.all([
        apiClient.get<Paper[] | { results: Paper[] }>('/examinations/papers/' + (filterSession ? `?session=${filterSession}` : '')),
        apiClient.get<Session[] | { results: Session[] }>('/examinations/sessions/'),
        apiClient.get<Subject[] | { results: Subject[] }>('/academics/subjects/'),
        apiClient.get<SchoolClass[] | { results: SchoolClass[] }>('/academics/classes/'),
      ])
      setPapers(asArray(rp.data))
      setSessions(asArray(rs.data))
      setSubjects(asArray(rx.data))
      const rawClasses = asArray(rc.data)
      setClasses(rawClasses.map((c: any) => ({ ...c, display_name: c.display_name || c.name })))
    } catch { setError('Unable to load papers.') }
  }

  useEffect(() => { void load() }, [filterSession])

  const openCreate = () => {
    setEditing(null)
    setSessionId(filterSession || '')
    setSubjectId('')
    setClassId('')
    setPaperCode('')
    setMaxMarks('100')
    setDate('')
    setStartTime('09:00')
    setDuration('120')
    setVenue('')
    setModal(true)
  }

  const openEdit = (p: Paper) => {
    setEditing(p)
    setSessionId(p.session)
    setSubjectId(p.subject)
    setClassId(p.school_class)
    setPaperCode(p.paper_code)
    setMaxMarks(String(p.max_marks))
    setDate(p.date)
    setStartTime(p.start_time?.substring(0, 5) || '')
    setDuration(String(p.duration_minutes))
    setVenue(p.venue)
    setModal(true)
  }

  const save = async () => {
    if (!sessionId || !subjectId || !classId || !date || !startTime) {
      setError('Session, Subject, Class, Date and Start Time are required.')
      return
    }
    setError(null)
    try {
      const payload = {
        session: sessionId,
        subject: subjectId,
        school_class: classId,
        paper_code: paperCode.trim(),
        max_marks: Number(maxMarks),
        date,
        start_time: startTime,
        duration_minutes: Number(duration),
        venue: venue.trim(),
      }
      if (editing) {
        await apiClient.put(`/examinations/papers/${editing.id}/`, payload)
        setNotice('Paper updated.')
      } else {
        await apiClient.post('/examinations/papers/', payload)
        setNotice('Paper created.')
      }
      setModal(false)
      await load()
    } catch { setError('Unable to save paper.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this exam paper?')) return
    try { await apiClient.delete(`/examinations/papers/${id}/`); await load() }
    catch { setError('Unable to delete paper.') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Examinations</p>
          <h1 className="mt-1 text-2xl font-display font-bold text-white">Exam Papers</h1>
        </div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">+ Add Paper</button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="flex gap-3">
        <select value={filterSession} onChange={e => setFilterSession(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm min-w-[200px]">
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Marks</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {papers.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No exam papers found.</td></tr>
            ) : papers.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-mono font-semibold text-white">{p.paper_code || '—'}</td>
                <td className="px-4 py-3">{p.subject_name}</td>
                <td className="px-4 py-3 text-slate-400">{p.class_name || classes.find(c => c.id === p.school_class)?.display_name || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{p.session_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.date}</td>
                <td className="px-4 py-3">{p.max_marks}</td>
                <td className="px-4 py-3 text-slate-400">{p.duration_minutes} min</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800">Edit</button>
                    <button onClick={() => del(p.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Paper' : 'Add Paper'}</h2>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Session *</label>
              <select value={sessionId} onChange={e => setSessionId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                <option value="">Select session</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Class *</label>
              <select value={classId} onChange={e => setClassId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
            </div>

            <input value={paperCode} onChange={e => setPaperCode(e.target.value)} placeholder="Paper code (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Max marks</label>
                <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Duration (min)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start time *</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              </div>
            </div>

            <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue / Room" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />

            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Add'}</button>
              <button onClick={() => { setModal(false); setError(null) }} className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
