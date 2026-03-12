import { useState } from 'react'
import { ExternalLink, BookOpen, Search, ChevronRight, Download, Play, FileText, Globe } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface CBCResource {
  type: 'video' | 'ebook' | 'past-paper' | 'platform' | 'curriculum'
  title: string
  url: string
  alt?: string
  badge?: string
  note?: string
}

interface SubjectMaterials {
  subject: string
  grade: string
  icon: string
  from: string
  to: string
  strand: string
  resources: CBCResource[]
}

const CBC_SUBJECTS: SubjectMaterials[] = [
  {
    subject: 'Mathematics',
    grade: 'Grade 7–9 / Form 1–4',
    icon: '📐',
    from: '#1d4ed8',
    to: '#3b82f6',
    strand: 'Numbers, Algebra, Geometry & Statistics',
    resources: [
      { type: 'video',      title: 'Quadratic Equations — Step by Step',           url: 'https://www.youtube.com/results?search_query=KCSE+Mathematics+Quadratic+Equations+Kenya', badge: 'Video' },
      { type: 'video',      title: 'Matrices & Transformations KCSE',              url: 'https://www.youtube.com/results?search_query=KCSE+Mathematics+Matrices+Transformations+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Mathematics — OpenStax College Algebra',   url: 'https://openstax.org/books/college-algebra-2e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'past-paper', title: 'KCSE 2023 Mathematics Paper 1 & 2',            url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'past-paper', title: 'KCSE 2022 Mathematics Paper 1 & 2',            url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'platform',   title: 'Khan Academy — Maths Practice',                url: 'https://www.khanacademy.org/math', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Mathematics Curriculum Designs',      url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'English',
    grade: 'Grade 7–9 / Form 1–4',
    icon: '📖',
    from: '#065f46',
    to: '#10b981',
    strand: 'Language, Communication & Literature',
    resources: [
      { type: 'video',      title: 'Essay Writing: Structure & Technique for KCSE', url: 'https://www.youtube.com/results?search_query=KCSE+English+Essay+Writing+Kenya', badge: 'Video' },
      { type: 'video',      title: 'KCSE Set Books — Analysis & Themes',            url: 'https://www.youtube.com/results?search_query=KCSE+English+Set+Books+Analysis', badge: 'Video' },
      { type: 'ebook',      title: 'Longman English — OpenStax Writing Guide',       url: 'https://openstax.org/books/writing-guide/pages/1-unit-introduction', badge: 'Free PDF' },
      { type: 'past-paper', title: 'KCSE 2023 English Paper 1, 2 & 3',             url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'platform',   title: 'British Council — Free English Resources',       url: 'https://learnenglish.britishcouncil.org/', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC English Curriculum Designs',            url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Kiswahili',
    grade: 'Grade 7–9 / Form 1–4',
    icon: '🗣️',
    from: '#92400e',
    to: '#f59e0b',
    strand: 'Lugha, Fasihi & Mawasiliano',
    resources: [
      { type: 'video',      title: 'Fasihi: Uchambuzi wa Shairi la KCSE',    url: 'https://www.youtube.com/results?search_query=KCSE+Kiswahili+Fasihi+Uchambuzi+Shairi', badge: 'Video' },
      { type: 'video',      title: 'Kiswahili Insha na Uandishi — Kidato 4', url: 'https://www.youtube.com/results?search_query=KCSE+Kiswahili+Insha+Uandishi', badge: 'Video' },
      { type: 'ebook',      title: 'Kiswahili Sanifu — Kenya Education Cloud', url: 'https://kec.ac.ke/', badge: 'Free' },
      { type: 'past-paper', title: 'KCSE 2023 Kiswahili Karatasi 1, 2 & 3',  url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'platform',   title: 'KICD OER — Kiswahili Resources',         url: 'https://oer.kec.ac.ke/', badge: 'Official' },
      { type: 'curriculum', title: 'KICD CBC Kiswahili Curriculum Designs',   url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Biology',
    grade: 'Form 1–4',
    icon: '🧬',
    from: '#166534',
    to: '#22c55e',
    strand: 'Cell Biology, Genetics, Ecology & Health',
    resources: [
      { type: 'video',      title: 'Cell Division: Mitosis & Meiosis Explained',  url: 'https://www.youtube.com/results?search_query=KCSE+Biology+Cell+Division+Mitosis+Meiosis+Kenya', badge: 'Video' },
      { type: 'video',      title: 'Genetics & Heredity Explained (KCSE)',         url: 'https://www.youtube.com/results?search_query=KCSE+Biology+Genetics+Heredity+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Biology — OpenStax Biology 2e',           url: 'https://openstax.org/books/biology-2e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'past-paper', title: 'KCSE 2023 Biology Paper 1, 2 & 3',            url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'platform',   title: 'Khan Academy — Biology',                       url: 'https://www.khanacademy.org/science/biology', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Science & Technology Curriculum',     url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Chemistry',
    grade: 'Form 1–4',
    icon: '⚗️',
    from: '#581c87',
    to: '#a855f7',
    strand: 'Organic Chemistry, Electrochemistry & Reactions',
    resources: [
      { type: 'video',      title: 'Organic Compounds & Reactions Simplified',      url: 'https://www.youtube.com/results?search_query=KCSE+Chemistry+Organic+Compounds+Kenya', badge: 'Video' },
      { type: 'video',      title: 'Electrochemistry & Electrolysis — KCSE',        url: 'https://www.youtube.com/results?search_query=KCSE+Chemistry+Electrochemistry+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Chemistry — OpenStax Chemistry 2e',         url: 'https://openstax.org/books/chemistry-2e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'past-paper', title: 'KCSE 2023 Chemistry Paper 1, 2 & 3',            url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'platform',   title: 'Khan Academy — Chemistry',                      url: 'https://www.khanacademy.org/science/chemistry', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Science & Technology Curriculum',      url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Physics',
    grade: 'Form 1–4',
    icon: '⚡',
    from: '#0c4a6e',
    to: '#0ea5e9',
    strand: 'Mechanics, Electromagnetism & Optics',
    resources: [
      { type: 'video',      title: 'Electromagnetism & Faraday\'s Law',         url: 'https://www.youtube.com/results?search_query=KCSE+Physics+Electromagnetism+Faraday+Law+Kenya', badge: 'Video' },
      { type: 'video',      title: 'Mechanics: Newton\'s Laws & Motion',        url: 'https://www.youtube.com/results?search_query=KCSE+Physics+Mechanics+Newtons+Laws+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Physics — OpenStax University Physics', url: 'https://openstax.org/books/university-physics-volume-1/pages/1-introduction', badge: 'Free PDF' },
      { type: 'past-paper', title: 'KCSE 2023 Physics Paper 1, 2 & 3',         url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'platform',   title: 'Khan Academy — Physics',                    url: 'https://www.khanacademy.org/science/physics', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Science & Technology Curriculum',  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'History & Government',
    grade: 'Form 1–4',
    icon: '🏛️',
    from: '#7c2d12',
    to: '#f97316',
    strand: 'African History, Government & Civics',
    resources: [
      { type: 'video',      title: 'Colonial Kenya & The Freedom Struggle',     url: 'https://www.youtube.com/results?search_query=KCSE+History+Colonial+Kenya+Freedom+Struggle', badge: 'Video' },
      { type: 'video',      title: 'History of Kenya — Government & Politics',  url: 'https://www.youtube.com/results?search_query=KCSE+History+Government+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Longman History — CK-12 Social Studies',   url: 'https://www.ck12.org/browse/#c/social-studies', badge: 'Free' },
      { type: 'past-paper', title: 'KCSE 2023 History & Government Paper 1 & 2', url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'curriculum', title: 'KICD CBC Social Studies Curriculum',        url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Geography',
    grade: 'Form 1–4',
    icon: '🌍',
    from: '#14532d',
    to: '#84cc16',
    strand: 'Physical & Human Geography, Maps & Statistics',
    resources: [
      { type: 'video',      title: 'Plate Tectonics & Earthquakes (Kenya)',    url: 'https://www.youtube.com/results?search_query=KCSE+Geography+Plate+Tectonics+Kenya', badge: 'Video' },
      { type: 'video',      title: 'Population & Settlement — Kenya KCSE',     url: 'https://www.youtube.com/results?search_query=KCSE+Geography+Population+Settlement+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Oxford Geography — CK-12 Earth Science',  url: 'https://www.ck12.org/earth-science/', badge: 'Free' },
      { type: 'past-paper', title: 'KCSE 2023 Geography Paper 1 & 2',         url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'curriculum', title: 'KICD CBC Social Studies Curriculum',       url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Computer Studies',
    grade: 'Form 1–4',
    icon: '💻',
    from: '#1e1b4b',
    to: '#6366f1',
    strand: 'Programming, Hardware, Networks & Databases',
    resources: [
      { type: 'video',      title: 'Python Programming Basics for Beginners', url: 'https://www.youtube.com/results?search_query=Python+Programming+Basics+Kenya+Computer+Studies', badge: 'Video' },
      { type: 'video',      title: 'Database Design & SQL — KCSE Level',     url: 'https://www.youtube.com/results?search_query=KCSE+Computer+Studies+Database+SQL+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'CS50 Harvard — Free Full Course',        url: 'https://cs50.harvard.edu/x/2024/', badge: 'Free' },
      { type: 'past-paper', title: 'KCSE 2023 Computer Studies Paper 1 & 2', url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'platform',   title: 'freeCodeCamp — Web & Programming',       url: 'https://www.freecodecamp.org/', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC ICT Curriculum Designs',        url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Business Studies',
    grade: 'Form 1–4',
    icon: '💼',
    from: '#1e3a5f',
    to: '#64748b',
    strand: 'Commerce, Finance, Accounting & Management',
    resources: [
      { type: 'video',      title: 'Financial Statements & Analysis',          url: 'https://www.youtube.com/results?search_query=KCSE+Business+Studies+Financial+Statements+Kenya', badge: 'Video' },
      { type: 'video',      title: 'Business Organisations & Management',      url: 'https://www.youtube.com/results?search_query=KCSE+Business+Studies+Organisations+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Business Studies — OpenStax Economics',   url: 'https://openstax.org/books/principles-of-economics-3e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'past-paper', title: 'KCSE 2023 Business Studies Paper 1 & 2', url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'curriculum', title: 'KICD CBC Business Curriculum Designs',   url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Agriculture',
    grade: 'Form 1–4',
    icon: '🌱',
    from: '#052e16',
    to: '#16a34a',
    strand: 'Crop Production, Animal Husbandry & Agribusiness',
    resources: [
      { type: 'video',      title: 'Crop Production & Soil Management Kenya',  url: 'https://www.youtube.com/results?search_query=KCSE+Agriculture+Crop+Production+Kenya', badge: 'Video' },
      { type: 'video',      title: 'Animal Husbandry & Livestock — KCSE',      url: 'https://www.youtube.com/results?search_query=KCSE+Agriculture+Animal+Husbandry+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Agriculture & Nutrition — Kenya Edu Cloud', url: 'https://kec.ac.ke/', badge: 'Free' },
      { type: 'past-paper', title: 'KCSE 2023 Agriculture Paper 1 & 2',        url: 'https://knec.ac.ke', alt: 'https://learner.co.ke/past-papers', badge: 'Past Paper' },
      { type: 'curriculum', title: 'KICD CBC Agriculture Curriculum Designs',  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'CBC Pre-Primary (PP1–PP2)',
    grade: 'Pre-Primary',
    icon: '🎨',
    from: '#701a75',
    to: '#d946ef',
    strand: 'Language, Numeracy, Environmental, Psychomotor',
    resources: [
      { type: 'platform',   title: 'Kenya Education Cloud — Pre-Primary',     url: 'https://kec.ac.ke/', badge: 'Official' },
      { type: 'video',      title: 'Pre-Primary Numeracy Activities CBC',      url: 'https://www.youtube.com/results?search_query=CBC+Pre+Primary+Numeracy+Activities+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'CBC Pre-Primary Curriculum Guide — KICD',  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
      { type: 'curriculum', title: 'KICD CBC Pre-Primary Curriculum Designs',  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'CBC Grade 1–6 (Lower Primary)',
    grade: 'Grade 1–6',
    icon: '🏫',
    from: '#164e63',
    to: '#22d3ee',
    strand: 'Literacy, Numeracy, Environmental Activities',
    resources: [
      { type: 'platform',   title: 'Kenya Education Cloud — Grade 1–6',        url: 'https://kec.ac.ke/', badge: 'Official' },
      { type: 'platform',   title: 'KICD OER — Lower Primary Resources',       url: 'https://oer.kec.ac.ke/', badge: 'Official' },
      { type: 'video',      title: 'CBC Grade 4 Mathematical Activities',       url: 'https://www.youtube.com/results?search_query=CBC+Grade+4+Mathematics+Activities+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'CBC Grade 6 Science & Technology Guide',    url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
      { type: 'curriculum', title: 'KICD CBC Lower Primary Curriculum Designs', url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
]

const TYPE_ICON: Record<CBCResource['type'], React.ReactNode> = {
  'video':      <Play size={11} className="text-rose-400" />,
  'ebook':      <BookOpen size={11} className="text-blue-400" />,
  'past-paper': <FileText size={11} className="text-amber-400" />,
  'platform':   <Globe size={11} className="text-emerald-400" />,
  'curriculum': <FileText size={11} className="text-violet-400" />,
}
const TYPE_BADGE_STYLE: Record<CBCResource['type'], { bg: string; color: string }> = {
  'video':      { bg: 'rgba(239,68,68,0.12)',  color: '#fca5a5' },
  'ebook':      { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd' },
  'past-paper': { bg: 'rgba(245,158,11,0.12)', color: '#fcd34d' },
  'platform':   { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
  'curriculum': { bg: 'rgba(167,139,250,0.12)',color: '#c4b5fd' },
}

const ALL_SUBJECTS = ['All Subjects', ...CBC_SUBJECTS.map(s => s.subject)]

export default function ELearningCBCMaterialsPage() {
  const [selSubject, setSelSubject] = useState('All Subjects')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CBCResource['type'] | 'all'>('all')
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const filtered = CBC_SUBJECTS.filter(s => {
    const matchSubject = selSubject === 'All Subjects' || s.subject === selSubject
    const matchSearch = search === '' ||
      s.subject.toLowerCase().includes(search.toLowerCase()) ||
      s.strand.toLowerCase().includes(search.toLowerCase()) ||
      s.resources.some(r => r.title.toLowerCase().includes(search.toLowerCase()))
    return matchSubject && matchSearch
  })

  const types: Array<{ key: CBCResource['type'] | 'all'; label: string }> = [
    { key: 'all',         label: 'All Types' },
    { key: 'video',       label: 'Videos' },
    { key: 'ebook',       label: 'E-Books' },
    { key: 'past-paper',  label: 'Past Papers' },
    { key: 'platform',    label: 'Platforms' },
    { key: 'curriculum',  label: 'Curriculum' },
  ]

  const totalResources = filtered.reduce((n, s) => n + s.resources.filter(r => typeFilter === 'all' || r.type === typeFilter).length, 0)

  return (
    <div className="space-y-6">
      <PageHero
        badge="CBC KENYA"
        badgeColor="emerald"
        title="CBC Subject Materials"
        subtitle="Curated resources per subject — videos, e-books, past papers, platforms and KICD curriculum guides"
        icon="📚"
      />

      <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subjects, topics or resource titles…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <select
          value={selSubject}
          onChange={e => setSelSubject(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1 flex-wrap">
          {types.map(t => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={typeFilter === t.key
                ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BookOpen size={12} className="text-emerald-400" />
        <span>{filtered.length} subjects · {totalResources} resources shown</span>
      </div>

      <div className="space-y-4">
        {filtered.map(subject => {
          const isExpanded = expandedSubject === subject.subject || selSubject === subject.subject || search !== ''
          const visibleResources = subject.resources.filter(r => typeFilter === 'all' || r.type === typeFilter)

          return (
            <div key={subject.subject} className="rounded-2xl overflow-hidden transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>

              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all"
                onClick={() => setExpandedSubject(isExpanded && selSubject === 'All Subjects' && search === '' ? null : subject.subject)}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${subject.from}, ${subject.to})` }}>
                  {subject.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{subject.subject}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: `${subject.from}25`, color: subject.to }}>
                      {subject.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{subject.strand}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-600">{visibleResources.length} resource{visibleResources.length !== 1 ? 's' : ''}</span>
                  <ChevronRight size={14} className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isExpanded && visibleResources.length > 0 && (
                <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {visibleResources.map((r, i) => {
                      const badgeStyle = TYPE_BADGE_STYLE[r.type]
                      return (
                        <div key={i} className="rounded-xl p-3 flex flex-col gap-2 group hover:border-slate-500 transition-all"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: badgeStyle.bg }}>
                              {TYPE_ICON[r.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2">{r.title}</p>
                              <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
                                {r.badge ?? r.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-auto">
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="flex-1 py-1.5 rounded-lg text-center text-[10px] font-bold flex items-center justify-center gap-1 transition-all hover:opacity-90"
                              style={{ background: `${subject.from}25`, color: subject.to, border: `1px solid ${subject.from}40` }}>
                              <ExternalLink size={9} />
                              {r.type === 'video' ? 'Watch' : r.type === 'ebook' ? 'Read Free' : r.type === 'past-paper' ? 'KNEC Official' : 'Open'}
                            </a>
                            {r.alt && (
                              <a href={r.alt} target="_blank" rel="noopener noreferrer"
                                className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all hover:opacity-90"
                                style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                                title="Download free PDF">
                                <Download size={9} /> PDF
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {isExpanded && visibleResources.length === 0 && (
                <div className="px-5 pb-5 pt-4 text-center text-xs text-slate-600 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  No resources match the current filter
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Globe size={12} className="text-emerald-400 flex-shrink-0" />
        <span>
          All resources are <strong className="text-slate-300">100% free</strong> and available to every school on the RSM platform.
          Official curriculum guides link to <strong className="text-slate-300">KICD</strong> — Kenya Institute of Curriculum Development.
          Past papers link to <strong className="text-slate-300">KNEC</strong> (official) and <strong className="text-slate-300">learner.co.ke</strong> (free PDF download).
        </span>
      </div>
    </div>
  )
}
