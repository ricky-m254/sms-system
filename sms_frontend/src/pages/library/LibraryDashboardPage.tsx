import { useState } from 'react'
import { BookOpen, Users, RotateCcw, AlertTriangle, Clock, TrendingUp, Star, ChevronRight } from 'lucide-react'

const TOP_BOOKS = [
  { title: 'KLB Mathematics Form 3', author: 'Kenya Literature Bureau', borrows: 28, from: '#1d4ed8', to: '#3b82f6', icon: '📐', available: 2, total: 5 },
  { title: 'Things Fall Apart', author: 'Chinua Achebe', borrows: 24, from: '#166534', to: '#22c55e', icon: '📖', available: 1, total: 4 },
  { title: 'KLB Biology Form 2', author: 'Kenya Literature Bureau', borrows: 22, from: '#581c87', to: '#a855f7', icon: '🧬', available: 3, total: 5 },
  { title: 'A Grain of Wheat', author: 'Ngũgĩ wa Thiong\'o', borrows: 19, from: '#7c2d12', to: '#f97316', icon: '🌾', available: 0, total: 3 },
  { title: 'KLB Chemistry Form 3', author: 'Kenya Literature Bureau', borrows: 18, from: '#065f46', to: '#10b981', icon: '⚗️', available: 2, total: 4 },
]

const RECENT_ACTIVITY = [
  { student: 'Mary Wanjiku', action: 'Borrowed', book: 'KLB Mathematics Form 3', time: '10 min ago', type: 'borrow' },
  { student: 'John Mwangi', action: 'Returned', book: 'Things Fall Apart', time: '25 min ago', type: 'return' },
  { student: 'Grace Murugi', action: 'Renewed', book: 'A Grain of Wheat', time: '1h ago', type: 'renew' },
  { student: 'David Njoroge', action: 'Borrowed', book: 'KLB Biology Form 2', time: '2h ago', type: 'borrow' },
  { student: 'Faith Achieng', action: 'Reserved', book: 'KLB Physics Form 3', time: '3h ago', type: 'reserve' },
  { student: 'James Wafula', action: 'Returned', book: 'The River Between', time: '4h ago', type: 'return' },
]

const OVERDUE = [
  { student: 'Peter Kamau', book: 'KLB Chemistry Form 3', due: '5 Mar 2025', days: 7, class: 'Form 3 East' },
  { student: 'Alice Nyambura', book: 'Oral Literature in Africa', due: '3 Mar 2025', days: 9, class: 'Form 4 West' },
  { student: 'Samuel Kiprotich', book: 'KLB Physics Form 2', due: '1 Mar 2025', days: 11, class: 'Form 2 North' },
  { student: 'Esther Chepkoech', book: 'Business Studies Form 4', due: '28 Feb 2025', days: 12, class: 'Form 4 East' },
]

const STATS = [
  { label: 'Total Resources', value: '1,240', sub: '4,180 copies', icon: BookOpen, color: '#10b981' },
  { label: 'Active Members', value: '486', sub: '442 students · 44 staff', icon: Users, color: '#6366f1' },
  { label: 'Currently Borrowed', value: '214', sub: '18 overdue', icon: RotateCcw, color: '#f59e0b' },
  { label: 'Due Today', value: '12', sub: 'Need return', icon: Clock, color: '#ef4444' },
]

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

export default function LibraryDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-10 md:px-10"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.4) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                ST. MARY'S LIBRARY
              </span>
              <span className="text-xs text-slate-400">Term 1 2025</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Knowledge Hub &<br />
              <span style={{ color: '#818cf8' }}>Resource Centre</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              1,240 titles · 4,180 copies · Open 7:00 AM – 6:00 PM
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#6366f1', color: '#fff' }}>
                <BookOpen size={15} /> Search Catalog
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}>
                <RotateCcw size={15} /> Return Book
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-56 flex-shrink-0">
            {[{ v: '1,240', l: 'Titles', c: '#818cf8' }, { v: '4,180', l: 'Copies', c: '#34d399' }, { v: '214', l: 'Borrowed', c: '#fcd34d' }, { v: '18', l: 'Overdue', c: '#f87171' }].map(x => (
              <div key={x.l} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-2xl font-bold" style={{ color: x.c }}>{x.v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => {
          const Icon = s.icon
          return (
            <GlassCard key={s.label} className="p-5 flex items-center gap-4">
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
        {/* Top Borrowed */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-400" /> Most Popular Books
            </h2>
            <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">Full Catalog <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-3">
            {TOP_BOOKS.map((b, i) => (
              <GlassCard key={b.title} className="p-4 hover:border-slate-600 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }}>
                    {b.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{b.title}</p>
                    <p className="text-xs text-slate-400">{b.author}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                        <div className="h-full rounded-full" style={{ width: `${(b.borrows / 30) * 100}%`, background: b.to }} />
                      </div>
                      <span className="text-xs font-bold text-slate-300">{b.borrows} borrows</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs font-bold" style={{ color: b.available > 0 ? '#34d399' : '#f87171' }}>
                      {b.available}/{b.total} avail
                    </span>
                    <span className="flex items-center gap-1 text-xs text-amber-400"><Star size={10} fill="#f59e0b" /> #{i + 1}</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Clock size={18} className="text-slate-400" /> Recent Activity
          </h2>
          <div className="space-y-2">
            {RECENT_ACTIVITY.map((a, i) => (
              <GlassCard key={i} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: a.type === 'borrow' ? '#10b981' : a.type === 'return' ? '#6366f1' : a.type === 'renew' ? '#f59e0b' : '#0ea5e9'
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.student}</p>
                    <p className="text-xs text-slate-400 truncate">{a.action}: <span className="text-slate-300">{a.book}</span></p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{a.time}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue */}
      <div>
        <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-400" /> Overdue Returns
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>{OVERDUE.length}</span>
        </h2>
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Student', 'Book', 'Class', 'Due Date', 'Days Overdue', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OVERDUE.map((o, i) => (
                <tr key={i} className="border-t transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-semibold text-white">{o.student}</td>
                  <td className="px-4 py-3 text-slate-300">{o.book}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{o.class}</td>
                  <td className="px-4 py-3 text-rose-400 text-xs">{o.due}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>{o.days} days</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1 rounded-lg text-xs font-semibold transition-all" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
