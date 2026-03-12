import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  Bed, Users, Building, ChevronRight, CheckCircle2,
  AlertCircle, Clock, Moon, Sun, TrendingUp, DoorOpen, Shield,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

interface DashboardStats {
  total_dormitories: number
  total_beds: number
  occupied_beds: number
  available_beds: number
  occupancy_rate: number
  today_attendance: { Present: number; Absent: number; 'On Leave': number }
}

const DORMS = [
  { name: 'Boys Wing A', gender: 'Male', total: 30, occupied: 20, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  { name: 'Boys Wing B', gender: 'Male', total: 30, occupied: 10, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  { name: 'Girls Wing A', gender: 'Female', total: 30, occupied: 8, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  { name: 'Girls Wing B', gender: 'Female', total: 30, occupied: 2, color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
]

function OccupancyRing({ pct, color }: { pct: number; color: string }) {
  const size = 100
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 50 50)" />
      <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">{pct.toFixed(0)}%</text>
      <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fill="#94a3b8">occupied</text>
    </svg>
  )
}

export default function HostelDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/hostel/dashboard/')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const occupied = stats?.occupied_beds ?? 40
  const total = stats?.total_beds ?? 120
  const occupancy = stats ? stats.occupancy_rate : Math.round((occupied / total) * 100)
  const attendance = stats?.today_attendance ?? { Present: 36, Absent: 2, 'On Leave': 2 }
  const totalAttendance = Object.values(attendance).reduce((a, b) => a + b, 0)

  const kpis = [
    { label: 'Dormitories', value: stats?.total_dormitories ?? 4, icon: Building, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: '2 Boys · 2 Girls' },
    { label: 'Total Beds', value: stats?.total_beds ?? 120, icon: Bed, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: '30 per wing' },
    { label: 'Occupied', value: occupied, icon: Users, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: `${occupancy.toFixed(0)}% occupancy rate` },
    { label: 'Available', value: stats?.available_beds ?? (total - occupied), icon: DoorOpen, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: 'Ready for allocation' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0b1120 0%, #111b2e 45%, #0a1a22 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(14,165,233,0.5) 0%, transparent 55%), radial-gradient(ellipse at 15% 75%, rgba(168,85,247,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(14,165,233,0.2)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.35)' }}>
                HOSTEL MANAGEMENT
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {occupancy.toFixed(0)}% Occupancy
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Boarding House &<br />
              <span style={{ color: '#7dd3fc' }}>Hostel Control</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              4 dormitory wings, 120 bed spaces, real-time attendance, and secure student boarding management.
            </p>
          </div>
          {/* Occupancy ring */}
          <div className="flex items-center gap-6 justify-center lg:justify-end">
            <OccupancyRing pct={occupancy} color="#0ea5e9" />
            <div className="space-y-3">
              {[
                { label: 'Present tonight', value: attendance.Present, color: '#10b981', icon: CheckCircle2 },
                { label: 'Absent', value: attendance.Absent, color: '#ef4444', icon: AlertCircle },
                { label: 'On Leave', value: attendance['On Leave'], color: '#f59e0b', icon: Moon },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={12} style={{ color }} />
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-xs font-bold text-white ml-auto">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={GLASS}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Dormitories + Attendance + Actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Dormitory status */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Building size={13} className="text-sky-400" /> Dormitory Status
            </p>
            <button onClick={() => navigate('/modules/hostel/dormitories')}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition">
              Manage →
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DORMS.map(dorm => {
              const pct = Math.round((dorm.occupied / dorm.total) * 100)
              return (
                <div key={dorm.name} className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{dorm.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{dorm.gender} · {dorm.total} beds</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: dorm.bg, color: dorm.color }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: dorm.color }} />
                    </div>
                    <span className="text-xs font-bold text-white">{dorm.occupied}/{dorm.total}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-500">
                    <span style={{ color: dorm.color }}>{dorm.occupied} occupied</span>
                    <span>·</span>
                    <span>{dorm.total - dorm.occupied} free</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Tonight's attendance */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Moon size={13} className="text-violet-400" /> Tonight's Roll Call
              </p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Present', value: attendance.Present, color: '#10b981', icon: CheckCircle2 },
                { label: 'Absent', value: attendance.Absent, color: '#ef4444', icon: AlertCircle },
                { label: 'On Leave', value: attendance['On Leave'], color: '#f59e0b', icon: Moon },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Icon size={11} style={{ color }} />{label}
                    </span>
                    <span className="text-xs font-bold text-white">{value}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${(value / (totalAttendance || 1)) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 text-center">
                <span className="text-[10px] text-slate-500">
                  {attendance.Present} / {totalAttendance} students accounted for
                </span>
              </div>
            </div>
          </div>

          {/* Service times */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-sky-400" />
              <p className="text-xs font-bold text-sky-300">Daily Hostel Schedule</p>
            </div>
            {[
              { label: 'Morning Roll Call', time: '5:45 AM', icon: Sun },
              { label: 'Breakfast', time: '6:30 AM', icon: Sun },
              { label: 'Evening Roll Call', time: '6:30 PM', icon: Moon },
              { label: 'Night Roll Call', time: '9:00 PM', icon: Moon },
              { label: 'Lights Out', time: '10:00 PM', icon: Moon },
            ].map(({ label, time, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><Icon size={10} />{label}</span>
                <span className="text-xs font-semibold text-white">{time}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Take Attendance', route: '/modules/hostel/attendance', color: '#10b981' },
                { label: 'New Allocation', route: '/modules/hostel/allocations', color: '#0ea5e9' },
                { label: 'Manage Dormitories', route: '/modules/hostel/dormitories', color: '#a855f7' },
                { label: 'Hostel Leave Requests', route: '/modules/hostel/leave', color: '#f59e0b' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.route)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{item.label}</span>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
