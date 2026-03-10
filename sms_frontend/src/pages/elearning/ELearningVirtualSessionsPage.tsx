import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

type Session = { id: number; title: string; course: number; course_name?: string; scheduled_at: string; duration_minutes: number; meeting_link: string }
type Course = { id: number; title: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function ELearningVirtualSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [meetingLink, setMeetingLink] = useState('')
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

  const save = async () => {
    if (!title.trim() || !courseId || !scheduledAt) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/elearning/sessions/', { title: title.trim(), course: Number(courseId), scheduled_at: scheduledAt, duration_minutes: Number(durationMinutes), meeting_link: meetingLink })
      setTitle(''); setCourseId(''); setScheduledAt(''); setDurationMinutes('60'); setMeetingLink('')
      setShowForm(false); setNotice('Session scheduled.')
      await load()
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Virtual Sessions</h1>
          <p className="text-slate-400 mt-1">Live online classes and interactive sessions.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-6 py-2 rounded-xl transition">
          {showForm ? 'Cancel' : 'Schedule Session'}
        </button>
      </div>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {showForm ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">New Virtual Session</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Select course *</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Scheduled Date & Time *</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Duration (minutes)</label>
              <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} min={5} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </div>
            <input value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="Meeting link (Zoom/Meet URL)" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </div>
          <button onClick={save} disabled={saving || !title.trim() || !courseId || !scheduledAt} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Schedule Session'}</button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Loading virtual sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic rounded-2xl border border-dashed border-slate-800">No virtual sessions scheduled.</div>
        ) : sessions.map(session => (
          <div key={session.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl hover:border-emerald-500/30">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <button onClick={() => setDeleteTarget(session)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button>
              </div>
              <h3 className="text-xl font-display font-bold text-white">{session.title}</h3>
              <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider">{session.course_name || '-'}</p>
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                <p>{new Date(session.scheduled_at).toLocaleDateString()} at {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p>{session.duration_minutes} minutes</p>
              </div>
            </div>
            <div className="mt-6">
              {session.meeting_link ? (
                <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-3 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition">Join Meeting</a>
              ) : <p className="text-xs text-slate-500 text-center">No meeting link set</p>}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Session" description={`Delete session "${deleteTarget?.title}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
