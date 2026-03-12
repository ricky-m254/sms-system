import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import {
  Bus, MapPin, Users, AlertTriangle, Navigation, Phone,
  RefreshCw, RadioTower, Fuel, CheckCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Stats {
  total_vehicles: number
  active_routes: number
  students_enrolled: number
  incidents_open: number
}

const MOCK_BUSES = [
  { id: 'SMN-001', driver: 'John Kamau', phone: '+254 712 345 678', route: 'Westlands → School', students: 32, capacity: 40, eta: '6:58 AM', status: 'EN_ROUTE', fuel: 72 },
  { id: 'SMN-002', driver: 'Mary Wanjiku', phone: '+254 723 456 789', route: 'Kibera → School', students: 28, capacity: 40, eta: '7:02 AM', status: 'EN_ROUTE', fuel: 55 },
  { id: 'SMN-003', driver: 'Peter Mwangi', phone: '+254 734 567 890', route: 'Karen → School', students: 22, capacity: 35, eta: '7:15 AM', status: 'DELAYED', fuel: 40 },
  { id: 'SMN-004', driver: 'Grace Njeri', phone: '+254 745 678 901', route: 'Eastlands → School', students: 35, capacity: 40, eta: '6:45 AM', status: 'ARRIVED', fuel: 88 },
]

const MOCK_ROUTES = [
  { name: 'Westlands Route', stops: ['Westlands Rongi', 'ABC Place', 'Westgate', 'Chiromo', 'School'], duration: '45 min', distance: '14 km', students: 32, color: '#10b981' },
  { name: 'Karen Route', stops: ['Karen S/C', 'Hardy', "Lang'ata Rd", 'Carnivore', 'School'], duration: '55 min', distance: '18 km', students: 22, color: '#a78bfa' },
  { name: 'Kibera Route', stops: ['Olympic', 'Lindi', 'Laini Saba', "Lang'ata", 'School'], duration: '40 min', distance: '11 km', students: 28, color: '#38bdf8' },
  { name: 'Eastlands Route', stops: ['Umoja', 'Jogoo Rd', 'Milimani', 'Ngara', 'School'], duration: '50 min', distance: '16 km', students: 35, color: '#f59e0b' },
]

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  EN_ROUTE: { label: 'En Route',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  ARRIVED:  { label: 'Arrived',   color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
  DELAYED:  { label: 'Delayed',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  PARKED:   { label: 'Parked',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

export default function TransportDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedBus, setSelectedBus] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const navigate = useNavigate()

  useEffect(() => {
    apiClient.get('/transport/dashboard/')
      .then(res => setStats(res.data))
      .catch(() => {})
  }, [])

  const refresh = () => setLastRefresh(new Date())

  const totalStudents = MOCK_BUSES.reduce((s, b) => s + b.students, 0)
  const kpis = [
    { label: 'Fleet Size',         value: stats?.total_vehicles   ?? MOCK_BUSES.length,  icon: Bus,          color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   sub: `${MOCK_BUSES.filter(b => b.status !== 'PARKED').length} operational` },
    { label: 'Active Routes',      value: stats?.active_routes    ?? MOCK_ROUTES.length, icon: Navigation,   color: '#10b981', bg: 'rgba(16,185,129,0.1)',   sub: 'All routes live' },
    { label: 'Students in Transit',value: stats?.students_enrolled ?? totalStudents,      icon: Users,        color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  sub: '3 buses en route' },
    { label: 'Open Incidents',     value: stats?.incidents_open   ?? 1,                  icon: AlertTriangle,color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   sub: '1 delay — Karen' },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #050f1a 0%, #0b1b2e 45%, #0a1520 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 80% 40%, rgba(56,189,248,0.5) 0%, transparent 55%), radial-gradient(ellipse at 15% 70%, rgba(16,185,129,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(56,189,248,0.18)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.3)' }}>
                TRANSPORT & FLEET
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live · {lastRefresh.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Fleet Control &amp;<br />
              <span style={{ color: '#7dd3fc' }}>Live Tracking</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              4 vehicles, 4 active Nairobi routes, real-time GPS tracking, and parent notification portal.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-3 lg:min-w-[220px]">
              {[
                { label: 'En Route', value: `${MOCK_BUSES.filter(b => b.status === 'EN_ROUTE').length}`, color: '#10b981' },
                { label: 'Arrived', value: `${MOCK_BUSES.filter(b => b.status === 'ARRIVED').length}`, color: '#38bdf8' },
                { label: 'Students', value: `${totalStudents}`, color: '#a78bfa' },
                { label: 'Delayed', value: `${MOCK_BUSES.filter(b => b.status === 'DELAYED').length}`, color: '#f59e0b' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
            <button onClick={refresh} className="rounded-xl p-3 text-slate-400 hover:text-white transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label}
            className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
            style={{ background: `${k.color}10`, border: `1px solid ${k.color}25` }}>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-15"
              style={{ background: k.color, filter: 'blur(12px)' }} />
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums relative z-10">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium relative z-10">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium relative z-10" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Map + Fleet ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Map */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <RadioTower size={14} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">Live Fleet Map — Nairobi, Kenya</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[10px]">
              {Object.values(STATUS).map(v => (
                <div key={v.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                  <span className="text-slate-500">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative" style={{ height: 380 }}>
            {/* OpenStreetMap — Nairobi, centered on school vicinity */}
            <iframe
              title="Nairobi Transport Map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=36.700%2C-1.370%2C36.920%2C-1.220&layer=mapnik"
              className="w-full h-full"
              style={{ border: 'none', filter: 'invert(0.88) hue-rotate(185deg) saturate(0.6) brightness(0.7)' }}
              loading="lazy"
            />
            {/* Bus chips overlaid on map */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              {MOCK_BUSES.map(bus => {
                const cfg = STATUS[bus.status] ?? STATUS.PARKED
                return (
                  <div key={bus.id}
                    className="rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-2 backdrop-blur-md pointer-events-auto cursor-pointer hover:scale-105 transition-transform"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.color}50`, color: cfg.color }}
                    onClick={() => setSelectedBus(selectedBus === bus.id ? null : bus.id)}>
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                    <span className="font-mono">{bus.id}</span>
                    <span className="text-[10px] opacity-70">ETA {bus.eta}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Fleet Status */}
        <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Bus size={14} className="text-sky-400" /> Fleet Status
            </p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {MOCK_BUSES.map(bus => {
              const cfg = STATUS[bus.status] ?? STATUS.PARKED
              const pct = Math.round((bus.students / bus.capacity) * 100)
              const open = selectedBus === bus.id
              return (
                <div key={bus.id}
                  className="p-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onClick={() => setSelectedBus(open ? null : bus.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white font-mono">{bus.id}</span>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{bus.route}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{bus.driver}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-white">{bus.eta}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{bus.students}/{bus.capacity}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct > 90 ? '#f59e0b' : cfg.color }} />
                  </div>
                  {open && (
                    <div className="mt-3 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-xs font-bold text-white">{bus.fuel}%</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 flex items-center justify-center gap-0.5"><Fuel size={8} />Fuel</p>
                      </div>
                      <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-xs font-bold text-white">{bus.students}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 flex items-center justify-center gap-0.5"><Users size={8} />Pax</p>
                      </div>
                      <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-xs font-bold text-emerald-400">{pct}%</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Load</p>
                      </div>
                      <button className="col-span-3 rounded-xl py-1.5 text-[11px] font-bold transition hover:opacity-80 flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        <Phone size={10} /> Call {bus.driver.split(' ')[0]}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Routes + Parent Portal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Routes table */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2"><Navigation size={13} className="text-violet-400" /> Route Schedules</p>
            <button onClick={() => navigate('/modules/transport/routes')} className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition">Manage →</button>
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {MOCK_ROUTES.map((r, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: r.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{r.name}</p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {r.stops.map((s, j) => (
                      <span key={j} className="flex items-center gap-0.5 text-[10px] text-slate-500">
                        {j > 0 && <span className="text-slate-700 mx-0.5">›</span>}
                        <MapPin size={7} className="opacity-50" />{s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right space-y-0.5">
                  <p className="text-xs font-bold text-white">{r.distance}</p>
                  <p className="text-[10px] text-slate-500">{r.duration}</p>
                  <p className="text-[10px] font-bold" style={{ color: r.color }}>{r.students} students</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">

          {/* Parent Portal CTA */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,233,0.06))', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-emerald-400" />
              <p className="text-sm font-bold text-white">Parent Tracking Portal</p>
            </div>
            <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
              Parents can track their child's bus live, set home pin, and receive ETA push notifications.
            </p>
            <button onClick={() => navigate('/modules/parent-portal/dashboard')}
              className="w-full rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #10b981, #0ea5e9)' }}>
              Open Parent Portal
            </button>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Manage Vehicles', icon: Bus, route: '/modules/transport/vehicles' },
                { label: 'Route Management', icon: Navigation, route: '/modules/transport/routes' },
                { label: 'Student Assignments', icon: Users, route: '/modules/transport/students' },
                { label: 'Incident Reports', icon: AlertTriangle, route: '/modules/transport/incidents' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.route)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <item.icon size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Arrived indicator */}
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
            <CheckCircle2 size={18} className="text-sky-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-sky-300">SMN-004 Arrived</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Eastlands route — 6:45 AM · 35 students dropped off</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
