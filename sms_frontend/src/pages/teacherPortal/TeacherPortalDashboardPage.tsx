import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import {
  Users, ClipboardCheck, GraduationCap, BookOpen, Calendar,
  MessageCircle, TrendingUp, AlertCircle, ChevronRight, Bell,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const GLASS_MID = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }

type ClassItem = { id: number; name: string; stream?: string; student_count?: number }
type Announcement = { id: number; title: string; created_at: string; content: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v?.results ?? [])
}

const QUICK = [
  { label: 'My Classes', to: '/teacher-portal/classes', icon: Users, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { label: 'Take Attendance', to: '/teacher-portal/attendance', icon: ClipboardCheck, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { label: 'Enter Grades', to: '/teacher-portal/gradebook', icon: GraduationCap, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { label: 'Upload Resource', to: '/teacher-portal/resources', icon: BookOpen, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  { label: 'My Timetable', to: '/teacher-portal/timetable', icon: Calendar, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
]

export default function TeacherPortalDashboardPage() {
  const username = useAuthStore(s => s.username)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [cRes, aRes] = await Promise.allSettled([
        apiClient.get<ClassItem[] | { results: ClassItem[] }>('/school/classes/'),
        apiClient.get<Announcement[] | { results: Announcement[] }>('/communication/announcements/?limit=5'),
      ])
      if (cRes.status === 'fulfilled') setClasses(asArray(cRes.value.data).slice(0, 6))
      if (aRes.status === 'fulfilled') setAnnouncements(asArray(aRes.value.data).slice(0, 4))
      setLoading(false)
    }
    void load()
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-8"
        style={{ background: 'linear-gradient(135deg, #12082b 0%, #1a0d38 50%, #0d1221 100%)' }}>
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.7) 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(16,185,129,0.4) 0%, transparent 50%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' }}>
              TEACHER PORTAL
            </span>
            <span className="text-xs text-slate-400">{today}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
            {greeting()},<br />
            <span style={{ color: '#c4b5fd' }}>{username ?? 'Teacher'}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Your teaching workspace — classes, grades, attendance and more.</p>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'My Classes', value: loading ? '…' : classes.length, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: Users },
          { label: 'Attendance Pending', value: '0', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertCircle },
          { label: 'Unread Messages', value: '0', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', icon: MessageCircle },
          { label: 'Announcements', value: announcements.length, color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: Bell },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">{k.label}</p>
              <k.icon size={13} style={{ color: k.color }} />
            </div>
            <p className="text-2xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {QUICK.map(q => (
            <Link key={q.to} to={q.to}
              className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all hover:scale-[1.03]"
              style={{ background: q.bg, border: `1px solid ${q.color}25` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${q.color}20` }}>
                <q.icon size={18} style={{ color: q.color }} />
              </div>
              <p className="text-xs font-semibold text-slate-300 leading-tight">{q.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Classes + Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Classes */}
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <Users size={13} className="text-violet-400" />
              <p className="text-sm font-bold text-white">My Assigned Classes</p>
            </div>
            <Link to="/teacher-portal/classes" className="text-[11px] text-violet-400 hover:text-violet-300 font-medium">
              All classes →
            </Link>
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {loading ? (
              <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
            ) : classes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No classes assigned yet.</p>
            ) : classes.map(cls => (
              <div key={cls.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-sm font-semibold text-white">{cls.name}{cls.stream ? ` — ${cls.stream}` : ''}</p>
                  <p className="text-xs text-slate-500">{cls.student_count ?? '—'} students</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/teacher-portal/attendance" className="text-[10px] text-emerald-400 font-semibold hover:text-emerald-300">
                    Attendance
                  </Link>
                  <ChevronRight size={12} className="text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-emerald-400" />
              <p className="text-sm font-bold text-white">School Announcements</p>
            </div>
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {loading ? (
              <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
            ) : announcements.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No recent announcements.</p>
            ) : announcements.map(a => (
              <div key={a.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-sm font-semibold text-white">{a.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(a.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance tip */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={GLASS_MID}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(139,92,246,0.15)' }}>
          <TrendingUp size={18} className="text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Track Class Performance</p>
          <p className="text-xs text-slate-400 mt-0.5">Use the Gradebook to record and monitor your students' progress across all subjects and assessments.</p>
        </div>
        <Link to="/teacher-portal/gradebook"
          className="ml-auto shrink-0 rounded-xl px-4 py-2 text-xs font-semibold text-violet-300 transition hover:text-white"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
          Open →
        </Link>
      </div>
    </div>
  )
}
