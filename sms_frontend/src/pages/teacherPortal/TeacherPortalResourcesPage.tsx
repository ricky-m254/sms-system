import { useState } from 'react'
import PageHero from '../../components/PageHero'
import { FileText, Video, Link2, FileImage, Upload, ExternalLink, Trash2, Plus } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Resource = {
  id: number
  title: string
  type: 'document' | 'video' | 'link' | 'slide'
  subject: string
  url: string
  description: string
  created_at: string
}

const TYPE_CONFIG = {
  document: { label: 'Document', icon: FileText, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  video: { label: 'Video', icon: Video, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  link: { label: 'Link', icon: Link2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  slide: { label: 'Slides', icon: FileImage, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

const SUBJECTS = ['Mathematics', 'English', 'Science', 'Kiswahili', 'Social Studies', 'CRE', 'Art & Craft', 'PE']

const INITIAL: Resource[] = [
  { id: 1, title: 'CBC Mathematics Grade 6 Syllabus', type: 'document', subject: 'Mathematics', url: '#', description: 'Official CBC curriculum syllabus for Grade 6 Mathematics', created_at: '2025-03-01' },
  { id: 2, title: 'Fractions & Decimals – Video Lesson', type: 'video', subject: 'Mathematics', url: 'https://youtube.com', description: 'YouTube video lesson on fractions and decimals for Grade 5', created_at: '2025-03-05' },
  { id: 3, title: 'English Reading Comprehension Slides', type: 'slide', subject: 'English', url: '#', description: 'PowerPoint slides for reading comprehension skills', created_at: '2025-03-08' },
  { id: 4, title: 'Kenya Institute of Curriculum Development', type: 'link', subject: 'Science', url: 'https://kicd.ac.ke', description: 'KICD official resource portal for teachers', created_at: '2025-03-10' },
]

let nextId = 5

export default function TeacherPortalResourcesPage() {
  const [resources, setResources] = useState<Resource[]>(INITIAL)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [form, setForm] = useState({ title: '', type: 'document' as Resource['type'], subject: SUBJECTS[0], url: '', description: '' })
  const [notice, setNotice] = useState<string | null>(null)

  const filtered = resources.filter(r => {
    const matchType = filter === 'all' || r.type === filter
    const matchSubject = subjectFilter === 'all' || r.subject === subjectFilter
    return matchType && matchSubject
  })

  const save = () => {
    if (!form.title.trim()) return
    setResources(prev => [...prev, { ...form, id: nextId++, created_at: new Date().toISOString().split('T')[0] }])
    setForm({ title: '', type: 'document', subject: SUBJECTS[0], url: '', description: '' })
    setShowForm(false)
    setNotice('Resource added successfully.')
    setTimeout(() => setNotice(null), 3000)
  }

  const remove = (id: number) => {
    setResources(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-6">
      <PageHero badge="TEACHER" badgeColor="purple" title="Learning Resources" subtitle="Upload and share teaching materials with students" icon="📚" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(TYPE_CONFIG) as [Resource['type'], typeof TYPE_CONFIG[Resource['type']]][]).map(([type, cfg]) => (
          <div key={type} className="rounded-2xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
            <div className="flex items-center justify-between mb-1">
              <cfg.icon size={14} style={{ color: cfg.color }} />
              <span className="text-xs text-slate-500">{cfg.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{resources.filter(r => r.type === type).length}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      )}

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-xs text-white outline-none">
            <option value="all">All types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-xs text-white outline-none">
            <option value="all">All subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
          <Plus size={14} /> Upload Resource
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-5" style={GLASS}>
          <p className="text-sm font-bold text-white mb-4">Add New Resource</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Resource title *"
              className="sm:col-span-2 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Resource['type'] }))}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none">
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none">
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="URL or file link"
              className="sm:col-span-2 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)"
              rows={2}
              className="sm:col-span-2 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none resize-none" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={!form.title.trim()}
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-violet-500 transition">
              <Upload size={13} className="inline mr-1.5" />Add Resource
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-300 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Resource Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-10">No resources found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(r => {
            const cfg = TYPE_CONFIG[r.type]
            return (
              <div key={r.id} className="rounded-2xl p-5 group hover:scale-[1.01] transition-all" style={GLASS}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <cfg.icon size={16} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-400"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>{r.subject}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => remove(r.id)}
                    className="opacity-0 group-hover:opacity-100 transition rounded-lg p-1.5 text-slate-600 hover:text-rose-400"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {r.description && <p className="text-xs text-slate-400 mb-3">{r.description}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-600">{r.created_at}</p>
                  {r.url && r.url !== '#' && (
                    <a href={r.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-semibold transition"
                      style={{ color: cfg.color }}>
                      Open <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
