import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Video, X, Pencil } from 'lucide-react'

interface Session {
  id: number
  title: string
  course: number
  course_name?: string
  session_date: string
  start_time: string
  end_time: string
  meeting_link: string
  platform: string
  notes: string
}

type Course = { id: number; title: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const PLATFORMS = ['Zoom', 'Google Meet', 'Teams', 'Other']

const emptyForm = () => ({
  title: '', course: '', session_date: '', start_time: '', end_time: '',
  meeting_link: '', platform: 'Zoom', notes: '',
})

export default function ELearningVirtualSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, cRes] = await Promise.all([
        apiClient.get<Session[] | { results: Session[] }>('/elearning/sessions/'),
        apiClient.get<Course[] | { results: Course[] }>('/elearning/courses/'),
      ])
      setSessions(asArray(sRes.data)); setCourses(asArray(cRes.data))
    } catch { setError('Unable to load sessions.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setError(null); setModal(true) }
  const openEdit = (s: Session) => {
    setEditing(s)
    setForm({
      title: s.title, course: String(s.course), session_date: s.session_date,
      start_time: s.start_time, end_time: s.end_time, meeting_link: s.meeting_link,
      platform: s.platform, notes: s.notes,
    })
    setError(null); setModal(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.course || !form.session_date || !form.start_time || !form.end_time) {
      setError('Title, course, date, start time and end time are required.'); return
    }
    setSaving(true); setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        course: Number(form.course),
        session_date: form.session_date,
        start_time: form.start_time,
        end_time: form.end_time,
        meeting_link: form.meeting_link,
        platform: form.platform,
        notes: form.notes,
      }
      if (editing) {
        await apiClient.put(`/elearning/sessions/${editing.id}/`, payload)
        setNotice('Session updated.')
      } else {
        await apiClient.post('/elearning/sessions/', payload)
        setNotice('Session scheduled.')
      }
      setModal(false); await load()
    } catch { setError('Unable to schedule session.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/elearning/sessions/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete session.') }
    finally { setDeleting(false) }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const platformColor = (p: string) => {
    if (p === 'Zoom') return 'text-blue-400'
    if (p === 'Google Meet') return 'text-green-400'
    if (p === 'Teams') return 'text-purple-400'
    return 'text-slate-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Virtual Sessions</h1>
          <p className="text-slate-400 mt-1">Live online classes and interactive sessions.</p>
        </div>
        <button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-6 py-2 rounded-xl transition">
          Schedule Session
        </button>
      </div>

      {error && !modal ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Loading virtual sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic rounded-2xl border border-dashed border-slate-800">No virtual sessions scheduled.</div>
        ) : sessions.map(session => (
          <div key={session.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl hover:border-emerald-500/30 transition">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(session)} className="p-1 text-slate-500 hover:text-slate-200 transition"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(session)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button>
                </div>
              </div>
              <h3 className="text-lg font-display font-bold text-white">{session.title}</h3>
              <p className="mt-0.5 text-xs text-slate-400 uppercase tracking-wider">{session.course_name || '-'}</p>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <p className="font-medium">{session.session_date}</p>
                <p className="text-slate-400">{session.start_time} – {session.end_time}</p>
                <span className={`text-xs font-semibold uppercase tracking-wider ${platformColor(session.platform)}`}>{session.platform}</span>
              </div>
              {session.notes && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{session.notes}</p>}
            </div>
            <div className="mt-4">
              {session.meeting_link ? (
                <a href={session.meeting_link} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-2.5 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition text-sm">
                  Join Meeting
                </a>
              ) : <p className="text-xs text-slate-500 text-center">No meeting link set</p>}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Session' : 'Schedule Session'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Session Title *</label>
              <input value={form.title} onChange={e => setF('title', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200" placeholder="e.g. Week 3 – Algebra Live" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Course *</label>
              <select value={form.course} onChange={e => setF('course', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <option value="">Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Date *</label>
              <input type="date" value={form.session_date} onChange={e => setF('session_date', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start Time *</label>
                <input type="time" value={form.start_time} onChange={e => setF('start_time', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">End Time *</label>
                <input type="time" value={form.end_time} onChange={e => setF('end_time', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Platform</label>
              <select value={form.platform} onChange={e => setF('platform', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Meeting Link</label>
              <input value={form.meeting_link} onChange={e => setF('meeting_link', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200" placeholder="https://zoom.us/j/..." />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition">
                {saving ? 'Saving...' : editing ? 'Update' : 'Schedule'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Session" description={`Delete session "${deleteTarget?.title}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
