import { useState } from 'react'
import { Video, Clock, Users, Calendar, Link2, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHero from '../../components/PageHero'

type TabId = 'upcoming' | 'live' | 'past'

const SESSIONS = [
  { id: 1, subject: 'Physics', title: 'Electromagnetism & Waves — Form 3', teacher: 'Mr. Samuel Kiprotich', date: '2025-03-12', time: '14:00', duration: 90, students: 34, status: 'live', from: '#0c4a6e', to: '#0ea5e9', meeting: 'https://meet.google.com/demo' },
  { id: 2, subject: 'Mathematics', title: 'Matrices & Transformations — Form 4', teacher: 'Mr. David Mwangi', date: '2025-03-13', time: '10:00', duration: 60, students: 38, status: 'upcoming', from: '#1d4ed8', to: '#3b82f6', meeting: 'https://meet.google.com/demo' },
  { id: 3, subject: 'English', title: 'Essay Writing & Composition — Form 3', teacher: 'Ms. Faith Achieng', date: '2025-03-13', time: '11:00', duration: 60, students: 46, status: 'upcoming', from: '#065f46', to: '#10b981', meeting: 'https://meet.google.com/demo' },
  { id: 4, subject: 'Chemistry', title: 'Redox Reactions Lab Demonstration', teacher: 'Mr. Daniel Otieno', date: '2025-03-14', time: '15:00', duration: 120, students: 38, status: 'upcoming', from: '#581c87', to: '#a855f7', meeting: 'https://meet.google.com/demo' },
  { id: 5, subject: 'Biology', title: 'Genetics & DNA — Form 3 Revision', teacher: 'Ms. Grace Wanjiku', date: '2025-03-14', time: '09:00', duration: 60, students: 42, status: 'upcoming', from: '#166534', to: '#22c55e', meeting: 'https://meet.google.com/demo' },
  { id: 6, subject: 'Computer Studies', title: 'Python Basics — Form 2', teacher: 'Mr. Brian Ndegwa', date: '2025-03-17', time: '13:00', duration: 90, students: 32, status: 'upcoming', from: '#1e1b4b', to: '#6366f1', meeting: 'https://meet.google.com/demo' },
  { id: 7, subject: 'Geography', title: 'Map Reading & Physical Features', teacher: 'Mr. George Abuya', date: '2025-02-28', time: '10:00', duration: 60, students: 38, status: 'past', from: '#14532d', to: '#84cc16', recording: true },
  { id: 8, subject: 'History', title: 'The Scramble for Africa', teacher: 'Mr. James Wafula', date: '2025-02-26', time: '11:00', duration: 60, students: 40, status: 'past', from: '#7c2d12', to: '#f97316', recording: true },
  { id: 9, subject: 'Mathematics', title: 'Calculus Introduction — Differentiation', teacher: 'Mr. David Mwangi', date: '2025-02-25', time: '10:00', duration: 75, students: 38, status: 'past', from: '#1d4ed8', to: '#3b82f6', recording: true },
  { id: 10, subject: 'Biology', title: 'Cell Biology: Mitosis vs Meiosis', teacher: 'Ms. Grace Wanjiku', date: '2025-02-24', time: '14:00', duration: 60, students: 44, status: 'past', from: '#166534', to: '#22c55e', recording: false },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

function SessionCard({ s }: { s: typeof SESSIONS[0] }) {
  const durationText = s.duration >= 60 ? `${Math.floor(s.duration / 60)}h${s.duration % 60 > 0 ? ` ${s.duration % 60}m` : ''}` : `${s.duration}m`
  return (
    <GlassCard className={`p-5 hover:border-slate-600 transition-all ${s.status === 'live' ? 'border-emerald-500/40' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold"
          style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
          {s.subject.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{s.title}</p>
            {s.status === 'live' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE NOW
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{s.subject} · {s.teacher}</p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={12} /> {s.date}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {s.time} · {durationText}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400"><Users size={12} /> {s.students} students</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {s.status === 'live' ? (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90" style={{ background: '#10b981', color: '#fff' }}>
              <Video size={13} /> Join Now
            </button>
          ) : s.status === 'upcoming' ? (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Link2 size={13} /> Get Link
            </button>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={(s as any).recording
                ? { background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }
                : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
              <Play size={13} /> {(s as any).recording ? 'Watch Recording' : 'No Recording'}
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

export default function ELearningVirtualSessionsPage() {
  const [tab, setTab] = useState<TabId>('upcoming')
  const [weekOffset, setWeekOffset] = useState(0)

  const liveSessions = SESSIONS.filter(s => s.status === 'live')
  const upcomingSessions = SESSIONS.filter(s => s.status === 'upcoming')
  const pastSessions = SESSIONS.filter(s => s.status === 'past')

  const shown = tab === 'live' ? liveSessions : tab === 'upcoming' ? upcomingSessions : pastSessions

  const today = new Date(2025, 2, 12)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7)

  return (
    <div className="space-y-6">
      <PageHero
        badge="E-LEARNING"
        badgeColor="violet"
        title="Virtual Sessions"
        subtitle="Live classes, recordings and upcoming schedules"
        icon="🎓"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Virtual Sessions</h1>
          <p className="text-slate-400 text-sm mt-1">Live and recorded online classes with your teachers</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold self-start" style={{ background: '#10b981', color: '#fff' }}>
          <Video size={15} /> Schedule Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Live Now', value: liveSessions.length, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Upcoming', value: upcomingSessions.length, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { label: 'Recordings', value: pastSessions.filter(s => (s as any).recording).length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(s => (
          <GlassCard key={s.label} className="p-5 text-center">
            <p className="text-3xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Week Calendar Strip */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Week of {weekStart.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-all" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <ChevronLeft size={16} className="text-slate-400" />
            </button>
            <button onClick={() => setWeekOffset(0)} className="px-3 py-1 rounded-lg text-xs font-semibold transition-all" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>Today</button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-all" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const d = new Date(weekStart)
            d.setDate(weekStart.getDate() + i)
            const isToday = d.toDateString() === today.toDateString()
            const hasSessions = SESSIONS.some(s => s.date === d.toISOString().slice(0, 10))
            return (
              <div key={day} className={`rounded-xl p-2 text-center transition-all ${isToday ? 'border' : ''}`}
                style={isToday ? { background: 'rgba(16,185,129,0.15)', borderColor: '#10b981' } : { background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-slate-500">{day}</p>
                <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-emerald-400' : 'text-white'}`}>{d.getDate()}</p>
                {hasSessions && <div className="w-1.5 h-1.5 rounded-full mx-auto mt-1" style={{ background: isToday ? '#10b981' : '#6366f1' }} />}
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Tab Bar */}
      <div className="flex gap-2">
        {(['upcoming', 'live', 'past'] as TabId[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
            style={tab === t
              ? { background: '#10b981', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
            {t} {t === 'live' && liveSessions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-400 text-black font-bold">{liveSessions.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {shown.length === 0 ? (
          <GlassCard className="p-10 text-center">
            <Video size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No {tab} sessions</p>
          </GlassCard>
        ) : shown.map(s => <SessionCard key={s.id} s={s} />)}
      </div>
    </div>
  )
}
