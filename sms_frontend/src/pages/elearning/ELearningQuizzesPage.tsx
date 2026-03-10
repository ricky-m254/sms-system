import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

type Quiz = { id: number; title: string; course: number; course_name?: string; total_marks: number; pass_percentage: number; is_published: boolean; time_limit_minutes: number | null }
type Course = { id: number; title: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function ELearningQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [totalMarks, setTotalMarks] = useState('100')
  const [passPercentage, setPassPercentage] = useState('50')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [qRes, cRes] = await Promise.all([
        apiClient.get<Quiz[] | { results: Quiz[] }>('/elearning/quizzes/'),
        apiClient.get<Course[] | { results: Course[] }>('/elearning/courses/'),
      ])
      setQuizzes(asArray(qRes.data)); setCourses(asArray(cRes.data))
    } catch { setError('Unable to load quizzes.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!title.trim() || !courseId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/elearning/quizzes/', {
        title: title.trim(), course: Number(courseId), total_marks: Number(totalMarks), pass_percentage: Number(passPercentage),
        time_limit_minutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
      })
      setTitle(''); setCourseId(''); setTotalMarks('100'); setPassPercentage('50'); setTimeLimitMinutes('')
      setShowForm(false); setNotice('Quiz created.')
      await load()
    } catch { setError('Unable to create quiz.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/elearning/quizzes/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete quiz.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Quizzes</h1>
          <p className="text-slate-400 mt-1">Assess student knowledge through online tests.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-5 py-2 rounded-xl transition">
          {showForm ? 'Cancel' : 'Create Quiz'}
        </button>
      </div>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {showForm ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">New Quiz</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Select course *</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Total Marks</label>
              <input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Pass % (0-100)</label>
              <input type="number" value={passPercentage} onChange={e => setPassPercentage(e.target.value)} min={0} max={100} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Time Limit (mins, optional)</label>
              <input type="number" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(e.target.value)} placeholder="No limit" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={save} disabled={saving || !title.trim() || !courseId} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Create Quiz'}</button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Quiz Title</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Total Marks</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Pass %</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 animate-pulse">Loading quizzes...</td></tr>
            ) : quizzes.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No quizzes found.</td></tr>
            ) : quizzes.map(quiz => (
              <tr key={quiz.id} className="hover:bg-slate-800/40 transition">
                <td className="px-6 py-4 font-medium text-white">{quiz.title}</td>
                <td className="px-6 py-4 text-slate-300 text-xs uppercase tracking-wider">{quiz.course_name || '-'}</td>
                <td className="px-6 py-4 text-slate-300 font-bold">{quiz.total_marks}</td>
                <td className="px-6 py-4 text-slate-300">{quiz.pass_percentage}%</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${quiz.is_published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {quiz.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => setDeleteTarget(quiz)} className="text-rose-400 hover:text-rose-300 font-semibold text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Quiz" description={`Delete quiz "${deleteTarget?.title}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
