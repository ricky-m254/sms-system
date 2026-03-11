import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

type Course = { id: number; title: string; subject_name?: string; school_class_name?: string; teacher_name?: string; is_published: boolean; description: string }
type Subject = { id: number; name: string }
type SchoolClass = { id: number; name: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function ELearningCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [classId, setClassId] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, sRes, clRes] = await Promise.all([
        apiClient.get<Course[] | { results: Course[] }>('/elearning/courses/'),
        apiClient.get<Subject[] | { results: Subject[] }>('/academics/subjects/'),
        apiClient.get<SchoolClass[] | { results: SchoolClass[] }>('/academics/classes/'),
      ])
      setCourses(asArray(cRes.data)); setSubjects(asArray(sRes.data)); setClasses(asArray(clRes.data))
    } catch { setError('Unable to load courses.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!title.trim()) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/elearning/courses/', { title: title.trim(), subject: subjectId ? Number(subjectId) : null, school_class: classId ? Number(classId) : null, description })
      setTitle(''); setSubjectId(''); setClassId(''); setDescription(''); setShowForm(false); setNotice('Course created.')
      await load()
    } catch { setError('Unable to create course.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/elearning/courses/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete course.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Courses</h1>
          <p className="text-slate-400 mt-1">Manage online course curriculum.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-5 py-2 rounded-xl transition">
          {showForm ? 'Cancel' : 'Create Course'}
        </button>
      </div>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {showForm ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">New Course</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Subject (optional)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={classId} onChange={e => setClassId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Class (optional)</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
          </div>
          <button onClick={save} disabled={saving || !title.trim()} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Create Course'}</button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course Title</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Class & Subject</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Teacher</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 animate-pulse">Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No courses found.</td></tr>
            ) : courses.map(course => (
              <tr key={course.id} className="hover:bg-slate-800/40 transition">
                <td className="px-6 py-4 font-medium text-white">{course.title}</td>
                <td className="px-6 py-4 text-slate-300">
                  <span className="text-emerald-400 font-medium">{course.school_class_name || '-'}</span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span className="text-slate-400">{course.subject_name || '-'}</span>
                </td>
                <td className="px-6 py-4 text-slate-300">{course.teacher_name || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${course.is_published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => setDeleteTarget(course)} className="text-rose-400 hover:text-rose-300 font-semibold text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Course" description={`Delete course "${deleteTarget?.title}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
