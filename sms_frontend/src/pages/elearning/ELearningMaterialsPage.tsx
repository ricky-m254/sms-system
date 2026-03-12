import { useState } from 'react'
import { Search, Download, Play, Book, FileText, ExternalLink } from 'lucide-react'

type TabId = 'all' | 'videos' | 'ebooks' | 'documents' | 'papers'

const SUBJECTS = ['All Subjects', 'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Computer Studies']

const VIDEOS = [
  { id: 1, title: 'KCSE Mathematics — Quadratic Equations Step by Step', subject: 'Mathematics', level: 'Form 3', duration: '42:15', views: 1840, from: '#1d4ed8', to: '#3b82f6', channel: 'KLB Digital' },
  { id: 2, title: 'CBC Biology — Cell Division: Mitosis & Meiosis Explained', subject: 'Biology', level: 'Form 2', duration: '38:40', views: 2210, from: '#166534', to: '#22c55e', channel: 'Science Kenya' },
  { id: 3, title: 'Chemistry — Organic Compounds & Reactions', subject: 'Chemistry', level: 'Form 3', duration: '51:20', views: 1650, from: '#581c87', to: '#a855f7', channel: 'KLB Digital' },
  { id: 4, title: 'Physics — Electromagnetism: Faraday\'s Law', subject: 'Physics', level: 'Form 3', duration: '45:00', views: 1430, from: '#0c4a6e', to: '#0ea5e9', channel: 'Physics Kenya' },
  { id: 5, title: 'English — Essay Writing: Structure & Technique', subject: 'English', level: 'Form 3', duration: '28:30', views: 980, from: '#065f46', to: '#10b981', channel: 'KLB Digital' },
  { id: 6, title: 'Kiswahili — Fasihi: Uchambuzi wa Shairi', subject: 'Kiswahili', level: 'Form 3', duration: '35:10', views: 760, from: '#92400e', to: '#f59e0b', channel: 'Kiswahili Mastery' },
  { id: 7, title: 'Geography — Plate Tectonics & Earthquakes', subject: 'Geography', level: 'Form 3', duration: '40:00', views: 890, from: '#14532d', to: '#84cc16', channel: 'Geo Kenya' },
  { id: 8, title: 'History — Colonial Kenya & The Freedom Struggle', subject: 'History', level: 'Form 2', duration: '55:20', views: 1120, from: '#7c2d12', to: '#f97316', channel: 'History Kenya' },
  { id: 9, title: 'Computer Studies — Python Programming Basics', subject: 'Computer Studies', level: 'Form 2', duration: '62:40', views: 3200, from: '#1e1b4b', to: '#6366f1', channel: 'CodeKenya' },
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
  { id: 11, title: 'Agriculture Form 2', author: 'KICD Kenya', subject: 'Agriculture', pages: 245, year: 2021, from: '#052e16', to: '#16a34a', icon: '🌱', available: true },
  { id: 12, title: 'CRE Form 3: Christian Religious Education', author: 'Longman Kenya', subject: 'CRE', pages: 210, year: 2022, from: '#713f12', to: '#eab308', icon: '✝️', available: true },
]

const DOCUMENTS = [
  { id: 1, title: 'Form 3 Mathematics Notes — Complete', subject: 'Mathematics', type: 'Study Notes', size: '2.4 MB', pages: 48, uploaded: '3 Jan 2025' },
  { id: 2, title: 'Biology Practical Lab Manual 2025', subject: 'Biology', type: 'Lab Guide', size: '4.1 MB', pages: 62, uploaded: '5 Jan 2025' },
  { id: 3, title: 'Chemistry Revision Cards — Organic', subject: 'Chemistry', type: 'Revision Cards', size: '1.8 MB', pages: 32, uploaded: '7 Jan 2025' },
  { id: 4, title: 'Physics — Electromagnetism Summary Notes', subject: 'Physics', type: 'Study Notes', size: '1.5 MB', pages: 28, uploaded: '10 Jan 2025' },
  { id: 5, title: 'English Composition Model Essays', subject: 'English', type: 'Model Answers', size: '1.2 MB', pages: 24, uploaded: '12 Jan 2025' },
  { id: 6, title: 'Kiswahili Fasihi — Orodha ya Vitabu', subject: 'Kiswahili', type: 'Reading List', size: '0.8 MB', pages: 16, uploaded: '15 Jan 2025' },
  { id: 7, title: 'History Timeline — Colonial to Independence', subject: 'History', type: 'Timeline', size: '3.2 MB', pages: 40, uploaded: '18 Jan 2025' },
  { id: 8, title: 'Geography — Map Reading & Interpretation', subject: 'Geography', type: 'Study Notes', size: '2.8 MB', pages: 36, uploaded: '20 Jan 2025' },
]

const PAPERS = [
  { id: 1, title: 'KCSE Mathematics 2024 Paper 1 & 2', subject: 'Mathematics', year: 2024, type: 'KCSE', size: '3.1 MB', markscheme: true },
  { id: 2, title: 'KCSE Mathematics 2023 Paper 1 & 2', subject: 'Mathematics', year: 2023, type: 'KCSE', size: '2.9 MB', markscheme: true },
  { id: 3, title: 'KCSE Biology 2024 Paper 1, 2 & 3', subject: 'Biology', year: 2024, type: 'KCSE', size: '4.2 MB', markscheme: true },
  { id: 4, title: 'KCSE Chemistry 2024 Paper 1, 2 & 3', subject: 'Chemistry', year: 2024, type: 'KCSE', size: '3.8 MB', markscheme: true },
  { id: 5, title: 'KCSE Physics 2024 Paper 1, 2 & 3', subject: 'Physics', year: 2024, type: 'KCSE', size: '3.6 MB', markscheme: true },
  { id: 6, title: 'KCSE English 2024 Paper 1, 2 & 3', subject: 'English', year: 2024, type: 'KCSE', size: '2.4 MB', markscheme: true },
  { id: 7, title: 'Form 3 End-Term Exam — Mathematics 2024', subject: 'Mathematics', year: 2024, type: 'School Exam', size: '0.9 MB', markscheme: false },
  { id: 8, title: 'Form 2 Mid-Term — Biology 2024', subject: 'Biology', year: 2024, type: 'School Exam', size: '0.7 MB', markscheme: false },
  { id: 9, title: 'Form 3 CAT 2 — Chemistry 2025', subject: 'Chemistry', year: 2025, type: 'School Exam', size: '0.6 MB', markscheme: false },
]

const TABS: { id: TabId; label: string; icon: React.ElementType; count: number }[] = [
  { id: 'all', label: 'All Materials', icon: FileText, count: VIDEOS.length + EBOOKS.length + DOCUMENTS.length + PAPERS.length },
  { id: 'videos', label: 'Videos', icon: Play, count: VIDEOS.length },
  { id: 'ebooks', label: 'E-Books', icon: Book, count: EBOOKS.length },
  { id: 'documents', label: 'Documents', icon: FileText, count: DOCUMENTS.length },
  { id: 'papers', label: 'Past Papers', icon: FileText, count: PAPERS.length },
]

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border transition-all ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

export default function ELearningMaterialsPage() {
  const [tab, setTab] = useState<TabId>('all')
  const [subject, setSubject] = useState('All Subjects')
  const [search, setSearch] = useState('')

  const matchesSearch = (title: string, subj: string) =>
    (subject === 'All Subjects' || subj === subject) &&
    (search === '' || title.toLowerCase().includes(search.toLowerCase()))

  const showVideos = tab === 'all' || tab === 'videos'
  const showEbooks = tab === 'all' || tab === 'ebooks'
  const showDocs = tab === 'all' || tab === 'documents'
  const showPapers = tab === 'all' || tab === 'papers'

  const filteredVideos = VIDEOS.filter(v => matchesSearch(v.title, v.subject))
  const filteredEbooks = EBOOKS.filter(b => matchesSearch(b.title, b.subject))
  const filteredDocs = DOCUMENTS.filter(d => matchesSearch(d.title, d.subject))
  const filteredPapers = PAPERS.filter(p => matchesSearch(p.title, p.subject))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Learning Materials</h1>
        <p className="text-slate-400 text-sm mt-1">CBC Kenya videos, e-books, study notes, and KCSE past papers</p>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={tab === t.id
                ? { background: '#10b981', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon size={14} /> {t.label}
              <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>{t.count}</span>
            </button>
          )
        })}
      </div>

      {/* Search + Subject Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search materials…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
          {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#1e293b' }}>{s}</option>)}
        </select>
      </div>

      {/* Videos */}
      {showVideos && filteredVideos.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Play size={16} className="text-rose-400" /> Video Lessons
            <span className="text-xs text-slate-500">({filteredVideos.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map(v => (
              <GlassCard key={v.id} className="overflow-hidden hover:border-slate-600 cursor-pointer group">
                <div className="h-36 relative flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${v.from}, ${v.to})` }}>
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={24} className="text-white" fill="white" />
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold bg-black/40 text-white">{v.duration}</div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.5)', color: '#cbd5e1' }}>{v.level}</div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-white leading-snug group-hover:text-rose-300 transition-colors">{v.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">{v.channel}</span>
                    <span className="text-xs text-slate-500">{v.views.toLocaleString()} views</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>{v.subject}</span>
                  </div>
                </div>
              </GlassCard>
            ))}
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
              <GlassCard key={b.id} className="overflow-hidden hover:border-slate-600 cursor-pointer group p-0">
                <div className="h-40 flex flex-col items-center justify-center p-4 relative"
                  style={{ background: `linear-gradient(160deg, ${b.from}, ${b.to})` }}>
                  <span className="text-4xl">{b.icon}</span>
                  {!b.available && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-xs bg-black/40 text-amber-400">Borrowed</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{b.author}</p>
                  <p className="text-xs text-slate-500">{b.pages} pages · {b.year}</p>
                  <button className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={b.available
                      ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                    {b.available ? 'Read Now' : 'Unavailable'}
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Documents */}
      {showDocs && filteredDocs.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-400" /> Study Notes & Documents
            <span className="text-xs text-slate-500">({filteredDocs.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDocs.map(d => (
              <GlassCard key={d.id} className="p-4 hover:border-slate-600 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                    <FileText size={22} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{d.title}</p>
                    <p className="text-xs text-slate-400">{d.subject} · {d.type}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{d.pages} pages · {d.size} · {d.uploaded}</p>
                  </div>
                  <button className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-blue-500/20"
                    style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <Download size={15} className="text-blue-400" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Past Papers */}
      {showPapers && filteredPapers.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-amber-400" /> Past Papers
            <span className="text-xs text-slate-500">({filteredPapers.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPapers.map(p => (
              <GlassCard key={p.id} className="p-4 hover:border-slate-600 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <span className="text-xl">📝</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
                        style={p.type === 'KCSE' ? { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' } : { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
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
              </GlassCard>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
