import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Play, Book, FileText, ExternalLink, Youtube, Loader2, Globe, BookOpen, Library, ArrowRight, CheckCircle, Clock } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'
import { cachedGet } from '../../api/cache'

type TabId = 'all' | 'videos' | 'ebooks' | 'papers' | 'platforms' | 'library'

interface Material {
  id: number
  title: string
  material_type: string
  content: string
  file_url: string
  link_url: string
  course_name: string
  sequence: number
  is_active: boolean
  created_at: string
  course: number
}

interface LibraryBook {
  id: number
  title: string
  subtitle: string
  authors: string
  publisher: string
  publication_year: number | null
  isbn: string
  resource_type: string
  subjects: string
  language: string
  category_name: string
  total_copies: number
  available_copies: number
  is_active: boolean
}

const SUBJECT_COLORS: Record<string, { from: string; to: string; icon: string }> = {
  'Mathematics':    { from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  'Biology':        { from: '#166534', to: '#22c55e', icon: '🧬' },
  'Chemistry':      { from: '#581c87', to: '#a855f7', icon: '⚗️' },
  'Physics':        { from: '#0c4a6e', to: '#0ea5e9', icon: '⚡' },
  'English':        { from: '#065f46', to: '#10b981', icon: '📖' },
  'Kiswahili':      { from: '#92400e', to: '#f59e0b', icon: '🗣️' },
  'History':        { from: '#7c2d12', to: '#f97316', icon: '🏛️' },
  'Geography':      { from: '#14532d', to: '#84cc16', icon: '🌍' },
  'Computer':       { from: '#1e1b4b', to: '#6366f1', icon: '💻' },
  'Business':       { from: '#1e3a5f', to: '#64748b', icon: '💼' },
  'Agriculture':    { from: '#052e16', to: '#16a34a', icon: '🌱' },
  'Literature':     { from: '#065f46', to: '#10b981', icon: '📚' },
  'Fiction':        { from: '#713f12', to: '#eab308', icon: '📕' },
  'Science':        { from: '#0c4a6e', to: '#22d3ee', icon: '🔬' },
}

function getBookColors(book: LibraryBook) {
  const text = `${book.subjects} ${book.resource_type} ${book.category_name}`.toLowerCase()
  for (const [key, v] of Object.entries(SUBJECT_COLORS)) {
    if (text.includes(key.toLowerCase())) return v
  }
  return { from: '#1e293b', to: '#475569', icon: '📖' }
}

const SUBJECTS = ['All Subjects', 'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Computer Studies', 'Business']

const VIDEOS = [
  { id: 1,  title: 'KCSE Mathematics — Quadratic Equations Step By Step', subject: 'Mathematics', level: 'Form 3', duration: '42 min', views: '1.8K', from: '#1d4ed8', to: '#3b82f6', channel: 'Elimu Channel Kenya', youtubeId: 'xGXLkSCDZLg', searchQ: 'KCSE Mathematics Quadratic Equations Kenya Form 3' },
  { id: 2,  title: 'CBC Biology — Cell Division: Mitosis & Meiosis Explained', subject: 'Biology', level: 'Form 2', duration: '38 min', views: '2.2K', from: '#166534', to: '#22c55e', channel: 'Science Kenya', youtubeId: '2Lsg5iLM5fk', searchQ: 'CBC Biology Cell Division Mitosis Meiosis Kenya Form 2' },
  { id: 3,  title: 'Chemistry — Organic Compounds & Reactions Simplified', subject: 'Chemistry', level: 'Form 3', duration: '51 min', views: '1.6K', from: '#581c87', to: '#a855f7', channel: 'KLB Digital', youtubeId: 'VGHmQZXB1z4', searchQ: 'KCSE Chemistry Organic Compounds Kenya Form 3' },
  { id: 4,  title: 'Physics — Electromagnetism & Faraday\'s Law', subject: 'Physics', level: 'Form 3', duration: '45 min', views: '1.4K', from: '#0c4a6e', to: '#0ea5e9', channel: 'Physics Kenya', youtubeId: 'hFAOXdXZ5TM', searchQ: 'KCSE Physics Electromagnetism Faraday Law Kenya' },
  { id: 5,  title: 'English — Essay Writing: Structure & Technique for KCSE', subject: 'English', level: 'Form 3', duration: '28 min', views: '980', from: '#065f46', to: '#10b981', channel: 'KLB Digital', youtubeId: 'jNJyXj8KpyA', searchQ: 'KCSE English Essay Writing Kenya Form 3' },
  { id: 6,  title: 'Kiswahili — Fasihi: Uchambuzi wa Shairi la KCSE', subject: 'Kiswahili', level: 'Form 3', duration: '35 min', views: '760', from: '#92400e', to: '#f59e0b', channel: 'Kiswahili Mastery', youtubeId: 'FXe7ZeIg9sg', searchQ: 'KCSE Kiswahili Fasihi Uchambuzi Shairi' },
  { id: 7,  title: 'Geography — Plate Tectonics & Earthquakes (Kenya)', subject: 'Geography', level: 'Form 3', duration: '40 min', views: '890', from: '#14532d', to: '#84cc16', channel: 'Geo Kenya', youtubeId: 'mXaad0rsV38', searchQ: 'KCSE Geography Plate Tectonics Kenya' },
  { id: 8,  title: 'History — Colonial Kenya & The Freedom Struggle', subject: 'History', level: 'Form 2', duration: '55 min', views: '1.1K', from: '#7c2d12', to: '#f97316', channel: 'History Kenya', youtubeId: '8YVS_6sDCCE', searchQ: 'KCSE History Colonial Kenya Freedom Struggle Form 2' },
  { id: 9,  title: 'Computer Studies — Python Programming Basics for Beginners', subject: 'Computer Studies', level: 'Form 2', duration: '62 min', views: '3.2K', from: '#1e1b4b', to: '#6366f1', channel: 'CodeKenya', youtubeId: 'rfscVS0vtbw', searchQ: 'Python Programming Basics Kenya Computer Studies KCSE' },
  { id: 10, title: 'Mathematics — Matrices & Transformations KCSE', subject: 'Mathematics', level: 'Form 4', duration: '48 min', views: '1.3K', from: '#1d4ed8', to: '#3b82f6', channel: 'Elimu Channel Kenya', youtubeId: 'rowWM-MijXU', searchQ: 'KCSE Mathematics Matrices Transformations Kenya Form 4' },
  { id: 11, title: 'Biology — Genetics & Heredity Explained (KCSE)', subject: 'Biology', level: 'Form 4', duration: '44 min', views: '1.5K', from: '#166534', to: '#22c55e', channel: 'Biology Kenya', youtubeId: 'v1fVGaqTFgM', searchQ: 'KCSE Biology Genetics Heredity Kenya Form 4' },
  { id: 12, title: 'Business Studies — Financial Statements & Analysis', subject: 'Business', level: 'Form 4', duration: '38 min', views: '720', from: '#1e3a5f', to: '#64748b', channel: 'Business Kenya', youtubeId: '8cCn2TNQZM0', searchQ: 'KCSE Business Studies Financial Statements Kenya Form 4' },
]

const EBOOKS = [
  { id: 1,  title: 'KLB Mathematics Form 3', subject: 'Mathematics', pages: 384, year: 2022, icon: '📐', from: '#1d4ed8', to: '#3b82f6', source: 'OpenStax', url: 'https://openstax.org/books/college-algebra-2e/pages/1-introduction', badge: 'Free PDF' },
  { id: 2,  title: 'KLB Biology Form 2 Textbook', subject: 'Biology', pages: 312, year: 2022, icon: '🧬', from: '#166534', to: '#22c55e', source: 'OpenStax', url: 'https://openstax.org/books/biology-2e/pages/1-introduction', badge: 'Free PDF' },
  { id: 3,  title: 'KLB Chemistry Form 3', subject: 'Chemistry', pages: 368, year: 2023, icon: '⚗️', from: '#581c87', to: '#a855f7', source: 'OpenStax', url: 'https://openstax.org/books/chemistry-2e/pages/1-introduction', badge: 'Free PDF' },
  { id: 4,  title: 'KLB Physics Form 3', subject: 'Physics', pages: 342, year: 2023, icon: '⚡', from: '#0c4a6e', to: '#0ea5e9', source: 'OpenStax', url: 'https://openstax.org/books/university-physics-volume-1/pages/1-introduction', badge: 'Free PDF' },
  { id: 5,  title: 'Longman English Form 4', subject: 'English', pages: 280, year: 2022, icon: '📖', from: '#065f46', to: '#10b981', source: 'OpenStax', url: 'https://openstax.org/books/writing-guide/pages/1-unit-introduction', badge: 'Free PDF' },
  { id: 6,  title: 'Kiswahili Sanifu Form 3', subject: 'Kiswahili', pages: 260, year: 2021, icon: '📚', from: '#92400e', to: '#f59e0b', source: 'KICD OER', url: 'https://oer.kec.ac.ke/', badge: 'Free' },
  { id: 7,  title: 'Longman History & Govt Form 3', subject: 'History', pages: 298, year: 2022, icon: '🏛️', from: '#7c2d12', to: '#f97316', source: 'CK-12', url: 'https://www.ck12.org/browse/#c/social-studies', badge: 'Free' },
  { id: 8,  title: 'Oxford Geography Form 3', subject: 'Geography', pages: 310, year: 2022, icon: '🌍', from: '#14532d', to: '#84cc16', source: 'CK-12', url: 'https://www.ck12.org/earth-science/', badge: 'Free' },
  { id: 9,  title: 'Computer Studies for Secondary', subject: 'Computer Studies', pages: 224, year: 2023, icon: '💻', from: '#1e1b4b', to: '#6366f1', source: "CS50 Harvard", url: 'https://cs50.harvard.edu/x/2024/', badge: 'Free' },
  { id: 10, title: 'Business Studies Form 4', subject: 'Business', pages: 350, year: 2022, icon: '💼', from: '#1e3a5f', to: '#64748b', source: 'OpenStax', url: 'https://openstax.org/books/principles-of-economics-3e/pages/1-introduction', badge: 'Free PDF' },
  { id: 11, title: 'Pre-Primary Mathematics CBC', subject: 'Mathematics', pages: 180, year: 2023, icon: '🔢', from: '#1d4ed8', to: '#818cf8', source: 'Kenya Edu Cloud', url: 'https://kec.ac.ke/', badge: 'CBC Official' },
  { id: 12, title: 'Agriculture Form 2 Kenya', subject: 'Agriculture', pages: 256, year: 2022, icon: '🌱', from: '#052e16', to: '#16a34a', source: 'CK-12', url: 'https://www.ck12.org/browse/', badge: 'Free' },
]

const PAPERS = [
  { id: 1,  title: 'KCSE Mathematics 2023 Paper 1 & 2', subject: 'Mathematics', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 2,  title: 'KCSE Mathematics 2022 Paper 1 & 2', subject: 'Mathematics', year: 2022, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 3,  title: 'KCSE Biology 2023 Paper 1, 2 & 3', subject: 'Biology', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 4,  title: 'KCSE Chemistry 2023 Paper 1, 2 & 3', subject: 'Chemistry', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 5,  title: 'KCSE Physics 2023 Paper 1, 2 & 3', subject: 'Physics', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 6,  title: 'KCSE English 2023 Paper 1, 2 & 3', subject: 'English', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 7,  title: 'KCSE Kiswahili 2023 Paper 1 & 2', subject: 'Kiswahili', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 8,  title: 'KCSE History & Govt 2023 Paper 1 & 2', subject: 'History', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 9,  title: 'KCSE Geography 2023 Paper 1 & 2', subject: 'Geography', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 10, title: 'KCSE Computer Studies 2023 Paper 1 & 2', subject: 'Computer Studies', year: 2023, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 11, title: 'KCSE Mathematics 2021 Paper 1 & 2', subject: 'Mathematics', year: 2021, type: 'KCSE', markscheme: true, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
  { id: 12, title: 'KCSE Biology 2021 Paper 1, 2 & 3', subject: 'Biology', year: 2021, type: 'KCSE', markscheme: false, knecUrl: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', altUrl: 'https://learner.co.ke/past-papers/' },
]

const FREE_PLATFORMS = [
  { name: 'Kenya Education Cloud', short: 'KEC', desc: 'Official KICD platform — CBC curriculum, radio lessons, e-books and OER for all levels.', url: 'https://kec.ac.ke/', icon: '🇰🇪', color: '#10b981', tag: 'Official · Free' },
  { name: 'KICD OER Portal', short: 'OER', desc: 'Openly licensed CBC materials with no restrictions — integrate directly into school catalogs.', url: 'https://oer.kec.ac.ke/', icon: '📂', color: '#6366f1', tag: 'Open License' },
  { name: 'Khan Academy', short: 'KA', desc: 'World-class free math, science, computing — aligns with Form 1-4 KCSE curriculum.', url: 'https://www.khanacademy.org/', icon: '🌐', color: '#14b8a6', tag: 'Free Forever' },
  { name: 'CK-12 Foundation', short: 'CK12', desc: 'Free textbooks, simulations and practice for all secondary school subjects.', url: 'https://www.ck12.org/', icon: '📗', color: '#f59e0b', tag: 'Free Textbooks' },
  { name: 'OpenStax', short: 'OS', desc: 'Peer-reviewed, free university-level textbooks in PDF — Biology, Chemistry, Physics, Math.', url: 'https://openstax.org/', icon: '🔓', color: '#ef4444', tag: 'Free PDF Download' },
  { name: 'M-Shule', short: 'MS', desc: 'Mobile-first KCPE & KCSE learning platform built for Kenyan students with SMS access.', url: 'https://m-shule.com/', icon: '📱', color: '#8b5cf6', tag: 'Kenya · Mobile' },
  { name: 'Elimuspace', short: 'ES', desc: 'Kenyan CBC resources, revision materials and videos curated for all forms.', url: 'https://elimuspace.co.ke/', icon: '🎓', color: '#0ea5e9', tag: 'Kenya Focused' },
  { name: 'CS50 Harvard (Free)', short: 'CS50', desc: "Harvard's free Computer Science course — ideal for KCSE Computer Studies Form 2-4.", url: 'https://cs50.harvard.edu/x/', icon: '💻', color: '#64748b', tag: 'Free Certificate' },
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
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(v.searchQ)}`
  const ytDirectUrl = `https://www.youtube.com/watch?v=${v.youtubeId}`

  return (
    <GlassCard className="overflow-hidden hover:border-rose-500/30 cursor-pointer group">
      <a href={thumbError ? ytSearchUrl : ytDirectUrl} target="_blank" rel="noopener noreferrer">
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
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-semibold bg-black/70 text-white backdrop-blur-sm">{v.level}</div>
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-600/90 text-white">
            <Youtube size={10} /> YouTube
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm font-bold text-white leading-snug group-hover:text-rose-300 transition-colors line-clamp-2">{v.title}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">{v.channel}</span>
            <span className="text-xs text-slate-500">{v.views} views</span>
          </div>
          <span className="mt-2 inline-block px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>{v.subject}</span>
        </div>
      </a>
    </GlassCard>
  )
}

export default function ELearningMaterialsPage() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [tab, setTab] = useState<TabId>('all')
  const [subject, setSubject] = useState('All Subjects')
  const [search, setSearch] = useState('')
  const [libSearch, setLibSearch] = useState('')
  const [libFilter, setLibFilter] = useState<'all' | 'available'>('all')

  useEffect(() => {
    cachedGet<Material[] | { results?: Material[] }>('elearning/materials', () => apiClient.get('elearning/materials/').then(r => r.data as Material[] | { results?: Material[] }), 2 * 60_000)
      .then(data => setMaterials(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setMaterials([]))
      .finally(() => setLoadingMaterials(false))

    cachedGet<LibraryBook[] | { results?: LibraryBook[] }>('library/resources/300', () => apiClient.get('library/resources/?limit=300').then(r => r.data as LibraryBook[] | { results?: LibraryBook[] }), 3 * 60_000)
      .then(data => setLibraryBooks(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setLibraryBooks([]))
      .finally(() => setLoadingLibrary(false))
  }, [])

  const matchesSearch = (title: string, subj: string) =>
    (subject === 'All Subjects' || subj === subject) &&
    (search === '' || title.toLowerCase().includes(search.toLowerCase()))

  const showVideos    = tab === 'all' || tab === 'videos'
  const showEbooks    = tab === 'all' || tab === 'ebooks'
  const showPapers    = tab === 'all' || tab === 'papers'
  const showPlatforms = tab === 'all' || tab === 'platforms'
  const showSchoolDocs = tab === 'all'
  const showLibrary   = tab === 'all' || tab === 'library'

  const filteredVideos = VIDEOS.filter(v => matchesSearch(v.title, v.subject))
  const filteredEbooks = EBOOKS.filter(b => matchesSearch(b.title, b.subject))
  const filteredPapers = PAPERS.filter(p => matchesSearch(p.title, p.subject))

  const filteredMaterials = materials.filter(m =>
    m.is_active &&
    (search === '' || m.title.toLowerCase().includes(search.toLowerCase()) || m.course_name.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredLibrary = libraryBooks.filter(b =>
    b.is_active &&
    (libFilter === 'all' || b.available_copies > 0) &&
    (libSearch === '' ||
      b.title.toLowerCase().includes(libSearch.toLowerCase()) ||
      (b.authors || '').toLowerCase().includes(libSearch.toLowerCase()) ||
      (b.subjects || '').toLowerCase().includes(libSearch.toLowerCase()) ||
      (b.category_name || '').toLowerCase().includes(libSearch.toLowerCase()))
  )

  const openMaterial = (m: Material) => {
    const url = m.link_url || m.file_url || m.content
    if (url && url.startsWith('http')) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const totalCount = filteredVideos.length + filteredEbooks.length + filteredMaterials.length + filteredPapers.length + FREE_PLATFORMS.length + libraryBooks.length

  const TABS = [
    { id: 'all' as TabId,       label: 'All',            count: totalCount },
    { id: 'videos' as TabId,    label: 'Video Lessons',  count: VIDEOS.length },
    { id: 'ebooks' as TabId,    label: 'Free E-Books',   count: EBOOKS.length },
    { id: 'papers' as TabId,    label: 'Past Papers',    count: PAPERS.length },
    { id: 'platforms' as TabId, label: 'Platforms',      count: FREE_PLATFORMS.length },
    { id: 'library' as TabId,   label: 'Library Books',  count: libraryBooks.length },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        badge="LEARNING HUB"
        badgeColor="violet"
        title="Student Resource Centre"
        subtitle="Free videos, textbooks, past papers and platforms — available to every school using this module"
        icon="🌍"
      />

      <div className="rounded-3xl px-6 py-5 flex flex-wrap gap-4 items-center justify-between"
        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div>
          <p className="text-sm font-bold text-emerald-300">Universal Access — No Login Required for Free Resources</p>
          <p className="text-xs text-slate-400 mt-0.5">All {VIDEOS.length} videos · {EBOOKS.length} free textbooks · {PAPERS.length} past papers · {FREE_PLATFORMS.length} learning platforms available to every school on RSM.</p>
        </div>
        <div className="flex gap-3 text-center">
          {[['📹', VIDEOS.length, 'Videos'], ['📚', EBOOKS.length, 'E-Books'], ['📝', PAPERS.length, 'Papers'], ['🌐', FREE_PLATFORMS.length, 'Platforms']].map(([icon, count, label]) => (
            <div key={label as string} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p className="text-lg font-bold text-white">{icon} {count}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          {TABS.map(t => (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={tab === t.id
                ? { background: '#10b981', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {t.label}
              <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-48"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <select
            value={subject} onChange={e => setSubject(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          >
            {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#1e293b' }}>{s}</option>)}
          </select>
        </div>
      </div>

      {showVideos && filteredVideos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Youtube size={16} className="text-red-400" /> Video Lessons
              <span className="text-xs text-slate-500">({filteredVideos.length}) — Opens on YouTube</span>
            </h2>
            <a href="https://www.youtube.com/results?search_query=KCSE+Kenya+CBC+lessons" target="_blank" rel="noopener noreferrer"
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
              More on YouTube <ExternalLink size={11} />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map(v => <VideoCard key={v.id} v={v} />)}
          </div>
        </section>
      )}

      {showEbooks && filteredEbooks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Book size={16} className="text-emerald-400" /> Free Textbooks & E-Books
              <span className="text-xs text-slate-500">({filteredEbooks.length})</span>
            </h2>
            <a href="https://openstax.org/" target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              OpenStax Library <ExternalLink size={11} />
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredEbooks.map(b => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border overflow-hidden hover:border-emerald-500/40 cursor-pointer group block transition-all"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="h-36 flex flex-col items-center justify-center p-4 relative" style={{ background: `linear-gradient(160deg, ${b.from}, ${b.to})` }}>
                  <span className="text-4xl">{b.icon}</span>
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-xs bg-black/60 text-emerald-300 font-bold">{b.badge}</div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors">{b.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{b.source} · {b.pages} pg</p>
                  <div className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold text-center"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                    Open Free
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {showSchoolDocs && (loadingMaterials || filteredMaterials.length > 0) && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-400" /> School Study Notes & Documents
            <span className="text-xs text-slate-500">({filteredMaterials.length}) — School specific</span>
          </h2>
          {loadingMaterials ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
          ) : filteredMaterials.length === 0 ? (
            <GlassCard className="p-6 text-center text-slate-500 text-sm">No school documents uploaded yet</GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMaterials.map(m => (
                <GlassCard key={m.id} className="p-4 hover:border-slate-600 cursor-pointer" >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <FileText size={22} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{m.title}</p>
                      <p className="text-xs text-slate-400">{m.course_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.material_type}</p>
                    </div>
                    <button
                      onClick={() => openMaterial(m)}
                      title={m.link_url || m.file_url ? 'Open resource' : 'No URL'}
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-blue-500/20"
                      style={{ background: 'rgba(59,130,246,0.1)', opacity: m.link_url || m.file_url ? 1 : 0.4 }}
                    >
                      <Download size={15} className="text-blue-400" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      )}

      {showPapers && filteredPapers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-amber-400" /> KCSE Past Papers
              <span className="text-xs text-slate-500">({filteredPapers.length})</span>
            </h2>
            <a href="https://www.knec.ac.ke/index.php/component/content/article/past-papers" target="_blank" rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
              KNEC Official Portal <ExternalLink size={11} />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPapers.map(p => (
              <GlassCard key={p.id} className="p-4 hover:border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ background: 'rgba(245,158,11,0.15)' }}>📝</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}>
                        KCSE {p.year}
                      </span>
                      {p.markscheme && <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>Mark Scheme ✓</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href={p.knecUrl}
                      target="_blank" rel="noopener noreferrer"
                      title="View on KNEC Official Portal"
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-amber-500/20 transition-all"
                      style={{ background: 'rgba(245,158,11,0.1)' }}
                    >
                      <ExternalLink size={14} className="text-amber-400" />
                    </a>
                    <a
                      href={p.altUrl}
                      target="_blank" rel="noopener noreferrer"
                      title="Download Free PDF from Learner.co.ke"
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-emerald-500/20 transition-all"
                      style={{ background: 'rgba(16,185,129,0.1)' }}
                    >
                      <Download size={14} className="text-emerald-400" />
                    </a>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
          <div className="mt-3 rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ExternalLink size={12} className="text-amber-400 flex-shrink-0" />
            <span>Download button opens <strong className="text-slate-300">learner.co.ke</strong> — a free KCSE past paper repository.
              Official link opens <strong className="text-slate-300">knec.ac.ke</strong> which is the authoritative source.</span>
          </div>
        </section>
      )}

      {showPlatforms && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Globe size={16} className="text-indigo-400" /> Free Learning Platforms
            <span className="text-xs text-slate-500">({FREE_PLATFORMS.length}) — Available worldwide, no login required</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FREE_PLATFORMS.map(p => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border p-5 flex flex-col gap-3 hover:border-slate-500 transition-all group"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${p.color}20` }}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{p.name}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${p.color}20`, color: p.color }}>{p.tag}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed flex-1">{p.desc}</p>
                <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: p.color }}>
                  <BookOpen size={12} /> Open Platform <ExternalLink size={10} className="ml-auto" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {showLibrary && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Library size={16} className="text-emerald-400" />
              <h2 className="text-base font-bold text-white">Library Books</h2>
              <span className="text-xs text-slate-500">
                {loadingLibrary ? 'Loading...' : `(${filteredLibrary.length} of ${libraryBooks.length} books)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLibFilter('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={libFilter === 'all'
                  ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}
              >All Books</button>
              <button
                onClick={() => setLibFilter('available')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={libFilter === 'available'
                  ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <CheckCircle size={11} className="inline mr-1" />Available Now
              </button>
              <button
                onClick={() => navigate('/modules/library/catalog')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:bg-emerald-500/20"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                Full Catalog <ArrowRight size={11} />
              </button>
            </div>
          </div>

          {tab === 'library' && (
            <div className="mb-4 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={libSearch}
                onChange={e => setLibSearch(e.target.value)}
                placeholder="Search by title, author, subject or category…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          )}

          {loadingLibrary ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-emerald-400" size={22} />
              <span className="text-sm text-slate-400">Fetching library catalog…</span>
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-14 gap-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Library size={36} className="text-slate-600" />
              <p className="text-sm text-slate-400">
                {libraryBooks.length === 0 ? 'No library books found in the catalog' : 'No books match your search'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLibrary.map(book => {
                const colors = getBookColors(book)
                const isAvailable = book.available_copies > 0
                return (
                  <div
                    key={book.id}
                    className="rounded-2xl flex flex-col overflow-hidden group transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div
                      className="h-28 flex items-center justify-center text-4xl relative"
                      style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                    >
                      <span className="drop-shadow-lg">{colors.icon}</span>
                      <div className="absolute top-2 right-2">
                        {isAvailable ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.45)', color: '#34d399' }}>
                            <CheckCircle size={9} /> {book.available_copies} avail.
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.45)', color: '#fb923c' }}>
                            <Clock size={9} /> Out
                          </span>
                        )}
                      </div>
                      {book.resource_type && book.resource_type !== 'Book' && (
                        <div className="absolute bottom-2 left-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.45)', color: '#e2e8f0' }}>
                            {book.resource_type}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <p className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {book.title}
                      </p>
                      {book.authors && (
                        <p className="text-xs text-slate-400 truncate">{book.authors}</p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {book.category_name && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ background: `${colors.from}30`, color: colors.to }}>
                            {book.category_name}
                          </span>
                        )}
                        {book.publication_year && (
                          <span className="text-[10px] text-slate-500">{book.publication_year}</span>
                        )}
                      </div>
                      {book.subjects && (
                        <p className="text-[10px] text-slate-500 truncate">{book.subjects}</p>
                      )}
                      <div className="mt-auto pt-2">
                        <button
                          onClick={() => navigate('/modules/library/catalog')}
                          className="w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                          style={isAvailable
                            ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }
                            : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <Library size={11} />
                          {isAvailable ? 'Borrow Book' : 'Reserve Book'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Library size={12} className="text-emerald-400 flex-shrink-0" />
            <span>
              Showing live data from the <strong className="text-slate-300">school library catalog</strong>.
              Click <strong className="text-slate-300">Borrow Book</strong> or{' '}
              <button
                onClick={() => navigate('/modules/library/catalog')}
                className="text-emerald-400 underline hover:text-emerald-300 transition-colors"
              >Full Catalog</button>{' '}
              to issue or reserve a copy.
            </span>
          </div>
        </section>
      )}
    </div>
  )
}

