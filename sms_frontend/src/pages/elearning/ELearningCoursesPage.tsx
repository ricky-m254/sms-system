import { useState } from 'react'
import { Search, Users, BookOpen, Clock, Star, Play, Filter, ChevronRight } from 'lucide-react'
import PageHero from '../../components/PageHero'

const SUBJECT_FILTERS = ['All', 'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Computer Studies', 'Business', 'Agriculture']

const COURSES = [
  { id: 1, subject: 'Mathematics', title: 'Form 1: Numbers & Algebra Foundations', teacher: 'Mr. David Mwangi', level: 'Form 1', students: 48, lessons: 10, duration: '8h 30m', rating: 4.7, progress: 100, from: '#1d4ed8', to: '#3b82f6', tags: ['CBC', 'Core', 'Compulsory'] },
  { id: 2, subject: 'Mathematics', title: 'Form 2: Geometry & Trigonometry', teacher: 'Mr. David Mwangi', level: 'Form 2', students: 44, lessons: 12, duration: '10h 00m', rating: 4.8, progress: 100, from: '#1d4ed8', to: '#3b82f6', tags: ['CBC', 'Core'] },
  { id: 3, subject: 'Mathematics', title: 'Form 3: Quadratic Equations & Graphs', teacher: 'Mr. David Mwangi', level: 'Form 3', students: 42, lessons: 12, duration: '10h 30m', rating: 4.8, progress: 72, from: '#1d4ed8', to: '#3b82f6', tags: ['CBC', 'KCSE Prep'] },
  { id: 4, subject: 'Mathematics', title: 'Form 4: Calculus & Probability', teacher: 'Mr. David Mwangi', level: 'Form 4', students: 38, lessons: 14, duration: '12h 00m', rating: 4.9, progress: 45, from: '#1d4ed8', to: '#3b82f6', tags: ['KCSE', 'Advanced'] },
  { id: 5, subject: 'Biology', title: 'Form 1: Introduction to Living Things', teacher: 'Ms. Grace Wanjiku', level: 'Form 1', students: 48, lessons: 8, duration: '6h 00m', rating: 4.6, progress: 100, from: '#166534', to: '#22c55e', tags: ['CBC', 'Core'] },
  { id: 6, subject: 'Biology', title: 'Form 2: Cell Biology & Genetics', teacher: 'Ms. Grace Wanjiku', level: 'Form 2', students: 44, lessons: 10, duration: '8h 30m', rating: 4.9, progress: 80, from: '#166534', to: '#22c55e', tags: ['CBC', 'Core'] },
  { id: 7, subject: 'Biology', title: 'Form 3: Ecology & Evolution', teacher: 'Ms. Grace Wanjiku', level: 'Form 3', students: 42, lessons: 11, duration: '9h 00m', rating: 4.7, progress: 30, from: '#166534', to: '#22c55e', tags: ['CBC', 'KCSE Prep'] },
  { id: 8, subject: 'Chemistry', title: 'Form 2: Chemical Bonding & Reactions', teacher: 'Mr. Daniel Otieno', level: 'Form 2', students: 40, lessons: 10, duration: '8h 00m', rating: 4.7, progress: 100, from: '#581c87', to: '#a855f7', tags: ['CBC', 'Core'] },
  { id: 9, subject: 'Chemistry', title: 'Form 3: Organic Chemistry', teacher: 'Mr. Daniel Otieno', level: 'Form 3', students: 38, lessons: 14, duration: '11h 30m', rating: 4.7, progress: 61, from: '#581c87', to: '#a855f7', tags: ['CBC', 'KCSE Prep'] },
  { id: 10, subject: 'Physics', title: 'Form 2: Motion & Forces', teacher: 'Mr. Samuel Kiprotich', level: 'Form 2', students: 36, lessons: 10, duration: '8h 00m', rating: 4.6, progress: 100, from: '#0c4a6e', to: '#0ea5e9', tags: ['CBC', 'Core'] },
  { id: 11, subject: 'Physics', title: 'Form 3: Electromagnetism & Waves', teacher: 'Mr. Samuel Kiprotich', level: 'Form 3', students: 34, lessons: 12, duration: '10h 00m', rating: 4.8, progress: 55, from: '#0c4a6e', to: '#0ea5e9', tags: ['CBC', 'KCSE Prep'] },
  { id: 12, subject: 'English', title: 'Form 3: Advanced Composition & Grammar', teacher: 'Ms. Faith Achieng', level: 'Form 3', students: 46, lessons: 9, duration: '7h 30m', rating: 4.5, progress: 65, from: '#065f46', to: '#10b981', tags: ['CBC', 'Core'] },
  { id: 13, subject: 'Kiswahili', title: 'Form 2: Fasihi & Sarufi', teacher: 'Mr. Francis Mutua', level: 'Form 2', students: 44, lessons: 8, duration: '6h 00m', rating: 4.4, progress: 58, from: '#92400e', to: '#f59e0b', tags: ['CBC', 'Core'] },
  { id: 14, subject: 'History', title: 'Form 3: Kenya & East African History', teacher: 'Mr. James Wafula', level: 'Form 3', students: 40, lessons: 9, duration: '7h 00m', rating: 4.6, progress: 48, from: '#7c2d12', to: '#f97316', tags: ['CBC', 'Humanities'] },
  { id: 15, subject: 'Geography', title: 'Form 3: Physical Geography', teacher: 'Mr. George Abuya', level: 'Form 3', students: 38, lessons: 9, duration: '7h 30m', rating: 4.5, progress: 53, from: '#14532d', to: '#84cc16', tags: ['CBC', 'Humanities'] },
  { id: 16, subject: 'Computer Studies', title: 'Form 2: Programming & Data Management', teacher: 'Mr. Brian Ndegwa', level: 'Form 2', students: 32, lessons: 10, duration: '8h 00m', rating: 4.8, progress: 70, from: '#1e1b4b', to: '#6366f1', tags: ['CBC', 'Technical'] },
  { id: 17, subject: 'Business', title: 'Form 3: Entrepreneurship & Trade', teacher: 'Ms. Mercy Atieno', level: 'Form 3', students: 28, lessons: 8, duration: '6h 30m', rating: 4.4, progress: 38, from: '#1e3a5f', to: '#64748b', tags: ['CBC', 'Business'] },
  { id: 18, subject: 'Agriculture', title: 'Form 2: Crop Production & Soils', teacher: 'Mr. Patrick Njiru', level: 'Form 2', students: 26, lessons: 7, duration: '5h 30m', rating: 4.3, progress: 35, from: '#052e16', to: '#16a34a', tags: ['CBC', 'Technical'] },
]

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border p-5 transition-all ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

export default function ELearningCoursesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = COURSES.filter(c => {
    const matchSubject = filter === 'All' || c.subject.toLowerCase().includes(filter.toLowerCase())
    const matchSearch = search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.teacher.toLowerCase().includes(search.toLowerCase())
    return matchSubject && matchSearch
  })

  return (
    <div className="space-y-6">
      <PageHero
        badge="E-LEARNING"
        badgeColor="violet"
        title="Course Library"
        subtitle="Browse and manage CBC subject courses"
        icon="🎓"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Courses</h1>
          <p className="text-slate-400 text-sm mt-1">Kenya CBC-aligned courses for Forms 1–4</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
            {filtered.length} Courses
          </span>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses, teachers…"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === f
                ? { background: '#10b981', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="rounded-2xl border overflow-hidden transition-all hover:scale-[1.01] hover:border-slate-600 cursor-pointer group"
            style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
            {/* Subject Header */}
            <div className="h-24 relative flex items-end px-5 pb-4"
              style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'2\' fill=\'white\' opacity=\'0.3\'/%3E%3C/svg%3E")' }} />
              <div className="flex items-end justify-between w-full">
                <div>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-wider">{c.subject}</p>
                  <p className="text-sm font-bold text-white leading-tight">{c.level}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play size={16} className="text-white" />
                </div>
              </div>
            </div>
            {/* Content */}
            <div className="p-5">
              <p className="text-sm font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors">{c.title}</p>
              <p className="text-xs text-slate-400 mt-1">{c.teacher}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><BookOpen size={12} /> {c.lessons} lessons</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {c.duration}</span>
                <span className="flex items-center gap-1"><Users size={12} /> {c.students}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {c.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>{t}</span>
                ))}
              </div>
              {/* Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-bold text-white">{c.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700">
                  <div className="h-full rounded-full" style={{ width: `${c.progress}%`, background: c.to }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Star size={12} fill="#f59e0b" /> <span>{c.rating}</span>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-emerald-300" style={{ color: '#10b981' }}>
                  {c.progress === 100 ? 'Review' : c.progress > 0 ? 'Continue' : 'Start'} <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
