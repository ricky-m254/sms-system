import { useState } from 'react'
import { BookOpen, Play, Users, Monitor, ChevronRight, Clock, Star, TrendingUp, Award, Zap } from 'lucide-react'

const SUBJECTS = [
  { code: 'MTH', name: 'Mathematics', icon: '∑', from: '#1d4ed8', to: '#3b82f6', students: 156, courses: 8, progress: 72 },
  { code: 'ENG', name: 'English Language', icon: 'A', from: '#065f46', to: '#10b981', students: 148, courses: 6, progress: 65 },
  { code: 'KSW', name: 'Kiswahili', icon: 'K', from: '#92400e', to: '#f59e0b', students: 150, courses: 5, progress: 58 },
  { code: 'BIO', name: 'Biology', icon: '🧬', from: '#166534', to: '#22c55e', students: 102, courses: 7, progress: 80 },
  { code: 'CHE', name: 'Chemistry', icon: '⚗', from: '#581c87', to: '#a855f7', students: 98, courses: 6, progress: 61 },
  { code: 'PHY', name: 'Physics', icon: '⚡', from: '#0c4a6e', to: '#0ea5e9', students: 94, courses: 6, progress: 55 },
  { code: 'HIS', name: 'History & Govt', icon: '🏛', from: '#7c2d12', to: '#f97316', students: 128, courses: 4, progress: 48 },
  { code: 'GEO', name: 'Geography', icon: '🌍', from: '#14532d', to: '#84cc16', students: 124, courses: 4, progress: 53 },
  { code: 'CRE', name: 'Christian R.E.', icon: '✝', from: '#713f12', to: '#eab308', students: 90, courses: 3, progress: 42 },
  { code: 'BST', name: 'Business Studies', icon: '💼', from: '#1e3a5f', to: '#64748b', students: 76, courses: 4, progress: 38 },
  { code: 'COM', name: 'Computer Studies', icon: '💻', from: '#1e1b4b', to: '#6366f1', students: 88, courses: 5, progress: 70 },
  { code: 'AGR', name: 'Agriculture', icon: '🌱', from: '#052e16', to: '#16a34a', students: 68, courses: 3, progress: 35 },
]

const FEATURED = [
  { subject: 'Mathematics', topic: 'Form 3: Quadratic Equations & Graphs', teacher: 'Mr. David Mwangi', from: '#1d4ed8', to: '#3b82f6', pct: 72, lessons: 12, done: 9, rating: 4.8 },
  { subject: 'Biology', topic: 'Form 2: Cell Biology & Genetics', teacher: 'Ms. Grace Wanjiku', from: '#166534', to: '#22c55e', pct: 80, lessons: 10, done: 8, rating: 4.9 },
  { subject: 'Chemistry', topic: 'Form 3: Organic Chemistry', teacher: 'Mr. Daniel Otieno', from: '#581c87', to: '#a855f7', pct: 61, lessons: 14, done: 9, rating: 4.7 },
]

const UPCOMING = [
  { subject: 'Physics', topic: 'Electromagnetism & Waves', teacher: 'Mr. Samuel Kiprotich', time: 'Today, 2:00 PM', duration: '1h 30m', live: true },
  { subject: 'Mathematics', topic: 'Matrices & Transformations', teacher: 'Mr. David Mwangi', time: 'Tomorrow, 10:00 AM', duration: '1h 00m', live: false },
  { subject: 'English', topic: 'Essay Writing & Composition', teacher: 'Ms. Faith Achieng', time: 'Wed, 11:00 AM', duration: '1h 00m', live: false },
  { subject: 'Chemistry', topic: 'Redox Reactions Lab Session', teacher: 'Mr. Daniel Otieno', time: 'Thu, 3:00 PM', duration: '2h 00m', live: false },
]

const RECENT_RESOURCES = [
  { title: 'Form 3 Mathematics — Calculus Notes', type: 'PDF', icon: '📄', size: '2.4 MB', added: '2h ago' },
  { title: 'KCSE Chemistry Past Papers 2024', type: 'PDF', icon: '📄', size: '5.1 MB', added: '1d ago' },
  { title: 'Biology Diagrams & Illustrations', type: 'Images', icon: '🖼️', size: '8.7 MB', added: '2d ago' },
  { title: 'Kiswahili Fasihi — Shairi na Riwaya', type: 'E-Book', icon: '📚', size: '3.2 MB', added: '3d ago' },
  { title: 'Physics Practical Lab Manual', type: 'PDF', icon: '📄', size: '4.5 MB', added: '4d ago' },
]

const STATS = [
  { label: 'Active Courses', value: '84', sub: '+6 this term', icon: BookOpen, color: '#10b981' },
  { label: 'Study Materials', value: '1,240', sub: '320 videos · 920 docs', icon: Play, color: '#6366f1' },
  { label: 'Active Learners', value: '1,308', sub: '42 classes enrolled', icon: Users, color: '#f59e0b' },
  { label: 'Live Sessions', value: '18', sub: 'This week', icon: Monitor, color: '#0ea5e9' },
]

function GlassCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function ProgressRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  )
}

export default function ELearningDashboardPage() {
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-10 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #0a3d2e 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(16,185,129,0.4) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.3) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                CBC KENYA · TERM 1 2025
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                1 Live Session Now
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              St. Mary's Digital<br />
              <span style={{ color: '#34d399' }}>Learning Platform</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm md:text-base">
              Kenya CBC-aligned courses, KCSE revision materials, e-books, and live virtual sessions — all in one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90" style={{ background: '#10b981', color: '#fff' }}>
                <Play size={15} /> Start Learning
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Monitor size={15} /> Join Live Class
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-60 flex-shrink-0">
            {[{ v: '84', l: 'Courses', c: '#10b981' }, { v: '1,240', l: 'Materials', c: '#6366f1' }, { v: '42', l: 'Classes', c: '#f59e0b' }, { v: '18', l: 'Sessions', c: '#0ea5e9' }].map(x => (
              <div key={x.l} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-2xl font-bold" style={{ color: x.c }}>{x.v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => {
          const Icon = s.icon
          return (
            <GlassCard key={s.label} className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                <Icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-white">{s.value}</p>
                <p className="text-xs font-medium text-slate-400">{s.label}</p>
                <p className="text-xs text-slate-500">{s.sub}</p>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Featured Courses */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Continue Learning
            </h2>
            <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">All Courses <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-3">
            {FEATURED.map(c => (
              <GlassCard key={c.subject} className="hover:border-emerald-500/30 transition-all" onClick={() => {}}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
                    {c.subject.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: c.to }}>{c.subject}</p>
                    <p className="text-sm font-bold text-white mt-0.5 truncate">{c.topic}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.teacher}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                        <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, background: c.to }} />
                      </div>
                      <span className="text-xs font-bold text-slate-300">{c.done}/{c.lessons}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <ProgressRing pct={c.pct} color={c.to} />
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      <Star size={10} fill="#f59e0b" /> {c.rating}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-amber-400" /> Virtual Sessions
          </h2>
          <div className="space-y-3">
            {UPCOMING.map((s, i) => (
              <GlassCard key={i} className={s.live ? 'border-emerald-500/40' : ''}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {s.live ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>Soon</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{s.topic}</p>
                    <p className="text-xs text-slate-400 truncate">{s.subject} · {s.teacher}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11} /> {s.time}</span>
                      <span className="text-xs text-slate-500">{s.duration}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* CBC Subject Grid */}
      <div>
        <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <Award size={18} className="text-emerald-400" /> CBC Subject Library
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {SUBJECTS.map(sub => (
            <button key={sub.code}
              onClick={() => setActiveSubject(activeSubject === sub.code ? null : sub.code)}
              className="rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95"
              style={{
                background: activeSubject === sub.code
                  ? `linear-gradient(135deg, ${sub.from}, ${sub.to})`
                  : `linear-gradient(135deg, ${sub.from}30, ${sub.to}20)`,
                border: `1px solid ${activeSubject === sub.code ? sub.to : sub.to + '30'}`,
              }}>
              <span className="text-2xl block mb-2">{sub.icon}</span>
              <p className="text-xs font-bold text-white leading-tight">{sub.name}</p>
              <p className="text-xs mt-1" style={{ color: sub.to }}>{sub.courses} courses</p>
              <div className="mt-2 h-1 rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${sub.progress}%`, background: sub.to }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Resources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-400" /> Latest Resources
          </h2>
          <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">View All <ChevronRight size={14} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {RECENT_RESOURCES.map((r, i) => (
            <GlassCard key={i} className="hover:border-slate-600 transition-all group" onClick={() => {}}>
              <div className="text-3xl mb-3">{r.icon}</div>
              <p className="text-sm font-semibold text-white leading-tight group-hover:text-emerald-300 transition-colors">{r.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>{r.type}</span>
                <span className="text-xs text-slate-500">{r.size}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{r.added}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
