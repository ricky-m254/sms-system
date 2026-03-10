import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

interface Material {
  id: number
  title: string
  course: number
  course_name?: string
  material_type: string
  file_url: string
  link_url: string
}

type Course = { id: number; title: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function ELearningMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [materialType, setMaterialType] = useState('PDF')
  const [linkUrl, setLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, cRes] = await Promise.all([
        apiClient.get<Material[] | { results: Material[] }>('/elearning/materials/'),
        apiClient.get<Course[] | { results: Course[] }>('/elearning/courses/'),
      ])
      setMaterials(asArray(mRes.data)); setCourses(asArray(cRes.data))
    } catch { setError('Unable to load materials.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!title.trim() || !courseId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/elearning/materials/', { title: title.trim(), course: Number(courseId), material_type: materialType, link_url: linkUrl })
      setTitle(''); setCourseId(''); setLinkUrl(''); setShowForm(false); setNotice('Material added.')
      await load()
    } catch { setError('Unable to add material.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/elearning/materials/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete material.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Materials</h1>
          <p className="text-slate-400 mt-1">Access study resources and documents.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-5 py-2 rounded-xl transition">
          {showForm ? 'Cancel' : 'Add Material'}
        </button>
      </div>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {showForm ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Add Material</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Material title *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Select course *</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={materialType} onChange={e => setMaterialType(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option>PDF</option><option>Video</option><option>Presentation</option><option>Link</option><option>Note</option>
            </select>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="External URL" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-4" />
          </div>
          <button onClick={save} disabled={saving || !title.trim() || !courseId} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Add Material'}</button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic">No materials found.</div>
        ) : (
          materials.map((mat) => (
            <div key={mat.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center text-center shadow-lg hover:border-slate-700">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-display font-semibold text-white">{mat.title}</h3>
              <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider">{mat.course_name}</p>
              <div className="mt-4 pt-4 border-t border-slate-800 w-full flex justify-between items-center">
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold uppercase">{mat.material_type}</span>
                <div className="flex gap-3">
                  {(mat.file_url || mat.link_url) ? <a href={mat.file_url || mat.link_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-medium text-sm">Open</a> : null}
                  <button onClick={() => setDeleteTarget(mat)} className="text-rose-400 hover:text-rose-300 text-sm font-semibold">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Material" description={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
