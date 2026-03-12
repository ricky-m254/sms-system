import { useState, useEffect } from 'react'
import { Search, Download, Play, Book, FileText, ExternalLink, Youtube, Loader2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

type TabId = 'all' | 'videos' | 'ebooks' | 'documents' | 'papers'

interface Material {
  id: number
  title: string
  material_type: string
  content: string
  course_name: string
  sequence: number
  is_active: boolean
  created_at: string
  course: number
}

const SUBJECTS = ['All Subjects', 'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Computer Studies']

const VIDEOS = [
  { id: 1,  title: 'KCSE Mathematics — Quadratic Equations Step By Step', subject: 'Mathematics', level: 'Form 3', duration: '42:15', views: 1840, from: '#1d4ed8', to: '#3b82f6', channel: 'Elimu Channel Kenya', youtubeId: 'xGXLkSCDZLg' },
  { id: 2,  title: 'CBC Biology — Cell Division: Mitosis & Meiosis Explained', subject: 'Biology', level: 'Form 2', duration: '38:40', views: 2210, from: '#166534', to: '#22c55e', channel: 'Science Kenya', youtubeId: '2Lsg5iLM5fk' },
  { id: 3,  title: 'Chemistry — Organic Compounds & Reactions Simplified', subject: 'Chemistry', level: 'Form 3', duration: '51:20', views: 1650, from: '#581c87', to: '#a855f7', channel: 'KLB Digital', youtubeId: 'VGHmQZXB1z4' },
  { id: 4,  title: 'Physics — Electromagnetism & Faraday\'s Law', subject: 'Physics', level: 'Form 3', duration: '45:00', views: 1430, from: '#0c4a6e', to: '#0ea5e9', channel: 'Physics Kenya', youtubeId: 'hFAOXdXZ5TM' },
  { id: 5,  title: 'English — Essay Writing: Structure & Technique', subject: 'English', level: 'Form 3', duration: '28:30', views: 980,  from: '#065f46', to: '#10b981', channel: 'KLB Digital', youtubeId: 'jNJyXj8KpyA' },
  { id: 6,  title: 'Kiswahili — Fasihi: Uchambuzi wa Shairi', subject: 'Kiswahili', level: 'Form 3', duration: '35:10', views: 760,  from: '#92400e', to: '#f59e0b', channel: 'Kiswahili Mastery', youtubeId: 'FXe7ZeIg9sg' },
  { id: 7,  title: 'Geography — Plate Tectonics & Earthquakes Kenya', subject: 'Geography', level: 'Form 3', duration: '40:00', views: 890,  from: '#14532d', to: '#84cc16', channel: 'Geo Kenya', youtubeId: 'mXaad0rsV38' },
  { id: 8,  title: 'History — Colonial Kenya & The Freedom Struggle', subject: 'History', level: 'Form 2', duration: '55:20', views: 1120, from: '#7c2d12', to: '#f97316', channel: 'History Kenya', youtubeId: '8YVS_6sDCCE' },
  { id: 9,  title: 'Computer Studies — Python Programming Basics', subject: 'Computer Studies', level: 'Form 2', duration: '62:40', views: 3200, from: '#1e1b4b', to: '#6366f1', channel: 'CodeKenya', youtubeId: 'kqtD5dpn9C8' },
  { id: 10, title: 'Mathematics — Matrices & Transformations', subject: 'Mathematics', level: 'Form 4', duration: '48:00', views: 1340, from: '#1d4ed8', to: '#3b82f6', channel: 'Elimu Channel Kenya', youtubeId: 'rowWM-MijXU' },
]

const EBOOKS = [
  { id: 1, title: 'KLB Mathematics Form 3', author: 'Kenya Literature Bureau', subject: 'Mathematics', pages: 384, year: 2022, from: '#1d4ed8', to: '#3b82f6', icon: '📐', available: true },
  { id: 2, title: 'KLB Biology Form 2 Textbook', author: 'Kenya Literature Bureau', subject: 'Biology', pages: 312, year: 2022, from: '#166534', to: '#22c55e', icon: '🧬', available: true },
  { id: 3, title: 'KLB Chemistry Form 3', author: 'Kenya Literature Bureau', subject: 'Chemistry', pages: 368, year: 2023, from: '#581c87', to: '#a855f7', icon: '⚗️', available: true },
  { id: 4, title: 'KLB Physics Form 3', author: 'Kenya Literature Bureau', subject: 'Physics', pages: 342, year: 2023, from: '#0c4a6e', to: '#0ea5e9', icon: '⚡', available: true },
  { id: 5, title: 'Longman English Form 4', author: 'Longman Kenya', subject: 'English', pages: 280, year: 2022, from: '#065f46', to: '#10b981', icon: '📖', available: true },
  { id: 6, title: 'Kiswahili Sanifu Form 3', author: 'Oxford University Press', subject: 'Kiswahili', pages: 260, year: 2021, from: '#92400e', to: '#f59e0b', icon: '📚', available: false },
  { id: 7, title: 'Longman History & Govt Form 3', author: 'Longman Kenya', subject: 'History', pages: 298, year: 2022, from: '#7c2d12', to: '#f97316', icon: '🏛️', available: true },
  { id: 8, title: 'Oxford Geography Form 3', author: 'Oxford Kenya', subject: 'Geography', pages: 310, year: 2022, from: '#14532d', to: '#84cc16', icon: '🌍', available: true },
  { id: 9, title: 'Computer Studies for Secondary', author: 'KICD Kenya', subject: 'Computer Studies', pages: 224, year: 2023, from: '#1e1b4b', to: '#6366f1', icon: '💻', available: true },
  { id: 10, title: 'Business Studies Form 4', author: 'Kenya Literature Bureau', subject: 'Business', pages: 350, year: 2022, from: '#1e3a5f', to: '#64748b', icon: '💼', available: true },
]

const PAPERS = [
  { id: 1, title: 'KCSE Mathematics 2024 Paper 1 & 2', subject: 'Mathematics', year: 2024, type: 'KCSE', size: '3.1 MB', markscheme: true },
  { id: 2, title: 'KCSE Mathematics 2023 Paper 1 & 2', subject: 'Mathematics', year: 2023, type: 'KCSE', size: '2.9 MB', markscheme: true },
  { id: 3, title: 'KCSE Biology 2024 Paper 1, 2 & 3', subject: 'Biology', year: 2024, type: 'KCSE', size: '4.2 MB', markscheme: true },
  { id: 4, title: 'KCSE Chemistry 2024 Paper 1, 2 & 3', subject: 'Chemistry', year: 2024, type: 'KCSE', size: '3.8 MB', markscheme: true },
  { id: 5, title: 'KCSE Physics 2024 Paper 1, 2 & 3', subject: 'Physics', year: 2024, type: 'KCSE', size: '3.6 MB', markscheme: true },
  { id: 6, title: 'KCSE English 2024 Paper 1, 2 & 3', subject: 'English', year: 2024, type: 'KCSE', size: '2.4 MB', markscheme: true },
  { id: 7, title: 'Form 3 End-Term Exam — Mathematics 2025', subject: 'Mathematics', year: 2025, type: 'School Exam', size: '0.9 MB', markscheme: false },
  { id: 8, title: 'Form 2 Mid-Term — Biology 2025', subject: 'Biology', year: 2025, type: 'School Exam', size: '0.7 MB', markscheme: false },
  { id: 9, title: 'Form 3 CAT 2 — Chemistry 2026', subject: 'Chemistry', year: 2026, type: 'School Exam', size: '0.6 MB', markscheme: false },
  { id: 10, title: 'Form 4 Mocks — All Subjects 2025', subject: 'Mathematics', year: 2025, type: 'School Exam', size: '8.4 MB', markscheme: true },
]

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border transition-all ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

function VideoCard({ v }: { v: typeof VIDEOS[0] }) {
  const [thumbError, setThumbError] = useState(false)
  const thumbUrl = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`
  const ytLink = `https://www.youtube.com/watch?v=${v.youtubeId}`

  return (
    <GlassCard className="overflow-hidden hover:border-rose-500/30 cursor-pointer group">
      <a href={ytLink} target="_blank" rel="noopener noreferrer">
        <div className="h-36 relative flex items-center justify-center overflow-hidden">
          {!thumbError ? (
            <img
              src={thumbUrl} alt={v.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setThumbError(true)}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${v.from}, ${v.to})` }} />
          )}
          <div className="relative z-10 w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
            <Play size={22} className="text-white ml-0.5" fill="white" />
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold bg-black/70 text-white backdrop-blur-sm">{v.duration}</div>
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-semibold bg-black/70 text-white backdrop-blur-sm capitalize">{v.level}</div>
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-600/90 text-white">
            <Youtube size={10} /> YouTube
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm font-bold text-white leading-snug group-hover:text-rose-300 transition-colors capitalize">{v.title}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400 capitalize">{v.channel}</span>
            <span className="text-xs text-slate-500">{v.views.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold capitalize" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>{v.subject}</span>
          </div>
        </div>
      </a>
    </GlassCard>
  )
}

export default function ELearningMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [tab, setTab] = useState<TabId>('all')
  const [subject, setSubject] = useState('All Subjects')
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiClient.get('elearning/materials/')
      .then(r => {
        const data = r.data
        setMaterials(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setMaterials([]))
      .finally(() => setLoadingMaterials(false))
  }, [])

  const matchesSearch = (title: string, subj: string) =>
    (subject === 'All Subjects' || title.toLowerCase().includes(subj.toLowerCase())) &&
    (search === '' || title.toLowerCase().includes(search.toLowerCase()))

  const showVideos    = tab === 'all' || tab === 'videos'
  const showEbooks    = tab === 'all' || tab === 'ebooks'
  const showDocs      = tab === 'all' || tab === 'documents'
  const showPapers    = tab === 'all' || tab === 'papers'

  const filteredVideos   = VIDEOS.filter(v => matchesSearch(v.title, v.subject))
  const filteredEbooks   = EBOOKS.filter(b => matchesSearch(b.title, b.subject))
  const filteredPapers   = PAPERS.filter(p => matchesSearch(p.title, p.subject))

  const filteredMaterials = materials.filter(m =>
    m.is_active &&
    (search === '' || m.title.toLowerCase().includes(search.toLowerCase()) || m.course_name.toLowerCase().includes(search.toLowerCase()))
  )

  const totalCount = filteredVideos.length + filteredEbooks.length + filteredMaterials.length + filteredPapers.length

  const TABS = [
    { id: 'all' as TabId,       label: 'All Materials', icon: FileText, count: totalCount },
    { id: 'videos' as TabId,    label: 'Videos',        icon: Play,     count: VIDEOS.length },
    { id: 'ebooks' as TabId,    label: 'E-Books',       icon: Book,     count: EBOOKS.length },
    { id: 'documents' as TabId, label: 'Documents',     icon: FileText, count: materials.length },
    { id: 'papers' as TabId,    label: 'Past Papers',   icon: FileText, count: PAPERS.length },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        badge="E-LEARNING"
        badgeColor="violet"
        title="Learning Materials"
        subtitle="Textbooks, videos, and digital resources per subject"
        icon="🎓"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white capitalize">Learning Materials</h1>
        <p className="text-slate-400 text-sm mt-1 capitalize">CBC Kenya videos, e-books, study notes, and KCSE past papers</p>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize"
              style={tab === t.id
                ? { background: '#10b981', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Icon size={14} /> {t.label}
              <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + Subject Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search materials…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <select
          value={subject} onChange={e => setSubject(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
        >
          {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#1e293b' }}>{s}</option>)}
        </select>
      </div>

      {/* Videos — YouTube thumbnails */}
      {showVideos && filteredVideos.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Youtube size={16} className="text-red-400" /> Video Lessons
            <span className="text-xs text-slate-500">({filteredVideos.length})</span>
            <span className="ml-auto text-xs text-slate-600 capitalize">Opens on YouTube</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map(v => <VideoCard key={v.id} v={v} />)}
          </div>
        </section>
      )}

      {/* E-Books */}
      {showEbooks && filteredEbooks.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Book size={16} className="text-emerald-400" /> E-Books & Textbooks
            <span className="text-xs text-slate-500">({filteredEbooks.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredEbooks.map(b => (
              <div
                key={b.id}
                className="rounded-2xl border overflow-hidden hover:border-slate-600 cursor-pointer group p-0"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="h-40 flex flex-col items-center justify-center p-4 relative" style={{ background: `linear-gradient(160deg, ${b.from}, ${b.to})` }}>
                  <span className="text-4xl">{b.icon}</span>
                  {!b.available && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-xs bg-black/50 text-amber-400 font-semibold">Out</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors capitalize">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{b.author}</p>
                  <p className="text-xs text-slate-500">{b.pages} pg · {b.year}</p>
                  <button
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                    style={b.available
                      ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
                  >
                    {b.available ? 'Read Now' : 'Unavailable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Study Notes & Documents from DB */}
      {showDocs && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-400" /> Study Notes & Documents
            <span className="text-xs text-slate-500">({filteredMaterials.length})</span>
          </h2>
          {loadingMaterials ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-blue-400 animate-spin" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <FileText size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm">No documents found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMaterials.map(m => (
                <div
                  key={m.id}
                  className="rounded-2xl border p-4 hover:border-slate-600 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <FileText size={22} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate capitalize">{m.title}</p>
                      <p className="text-xs text-slate-400 capitalize">{m.course_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.material_type} · Seq. {m.sequence}</p>
                    </div>
                    <button
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-blue-500/20"
                      style={{ background: 'rgba(59,130,246,0.1)' }}
                    >
                      <Download size={15} className="text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Past Papers */}
      {showPapers && filteredPapers.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-amber-400" /> Past Papers & Exams
            <span className="text-xs text-slate-500">({filteredPapers.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPapers.map(p => (
              <div
                key={p.id}
                className="rounded-2xl border p-4 hover:border-slate-600 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <span className="text-xl">📝</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate capitalize">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-semibold capitalize"
                        style={p.type === 'KCSE' ? { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' } : { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
                      >
                        {p.type} {p.year}
                      </span>
                      {p.markscheme && <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>Mark Scheme ✓</span>}
                      <span className="text-xs text-slate-500">{p.size}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-amber-500/20 transition-all" style={{ background: 'rgba(245,158,11,0.1)' }}>
                      <ExternalLink size={14} className="text-amber-400" />
                    </button>
                    <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-emerald-500/20 transition-all" style={{ background: 'rgba(16,185,129,0.1)' }}>
                      <Download size={14} className="text-emerald-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
