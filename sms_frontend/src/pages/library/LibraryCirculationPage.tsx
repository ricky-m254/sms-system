import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search, RotateCcw, BookOpen, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import PageHero from '../../components/PageHero'

const TRANSACTIONS = [
  { id: 1, student: 'Mary Wanjiku', class: 'Form 3 East', book: 'KLB Mathematics Form 3', isbn: '9789966102', borrowed: '2025-03-10', due: '2025-03-24', returned: null, status: 'Active', renewals: 0 },
  { id: 2, student: 'John Mwangi', class: 'Form 2 West', book: 'Things Fall Apart', isbn: '9780385474542', borrowed: '2025-03-08', due: '2025-03-22', returned: '2025-03-12', status: 'Returned', renewals: 0 },
  { id: 3, student: 'Grace Murugi', class: 'Form 4 East', book: 'A Grain of Wheat', isbn: '9780435906856', borrowed: '2025-02-24', due: '2025-03-10', returned: null, status: 'Overdue', renewals: 1 },
  { id: 4, student: 'David Njoroge', class: 'Form 2 North', book: 'KLB Biology Form 2', isbn: '9789966201', borrowed: '2025-03-11', due: '2025-03-25', returned: null, status: 'Active', renewals: 0 },
  { id: 5, student: 'Faith Achieng', class: 'Form 3 South', book: 'Oxford Geography Form 3', isbn: '9780195476804', borrowed: '2025-03-05', due: '2025-03-19', returned: null, status: 'Active', renewals: 0 },
  { id: 6, student: 'James Wafula', class: 'Form 2 East', book: 'The River Between', isbn: '9780435908843', borrowed: '2025-03-07', due: '2025-03-21', returned: '2025-03-12', status: 'Returned', renewals: 0 },
  { id: 7, student: 'Peter Kamau', class: 'Form 3 East', book: 'KLB Chemistry Form 3', isbn: '9789966301', borrowed: '2025-02-25', due: '2025-03-05', returned: null, status: 'Overdue', renewals: 0 },
  { id: 8, student: 'Alice Nyambura', class: 'Form 4 West', book: 'Oral Literature in Africa', isbn: '9780198121497', borrowed: '2025-02-23', due: '2025-03-03', returned: null, status: 'Overdue', renewals: 0 },
  { id: 9, student: 'Samuel Kiprotich', class: 'Form 2 South', book: 'KLB Physics Form 2', isbn: '9789966400', borrowed: '2025-02-19', due: '2025-03-01', returned: null, status: 'Overdue', renewals: 0 },
  { id: 10, student: 'Esther Chepkoech', class: 'Form 4 East', book: 'Business Studies Form 4', isbn: '9789966100789', borrowed: '2025-02-18', due: '2025-02-28', returned: null, status: 'Overdue', renewals: 0 },
  { id: 11, student: 'Ruth Adhiambo', class: 'Form 1 East', book: 'KLB Mathematics Form 1', isbn: '9789966100', borrowed: '2025-03-09', due: '2025-03-23', returned: null, status: 'Active', renewals: 0 },
  { id: 12, student: 'Michael Ochieng', class: 'Form 3 North', book: 'Blossoms of the Savannah', isbn: '9789966254313', borrowed: '2025-03-06', due: '2025-03-20', returned: null, status: 'Active', renewals: 1 },
  { id: 13, student: 'Caroline Kiptoo', class: 'Form 2 West', book: 'KLB Chemistry Form 2', isbn: '9789966300', borrowed: '2025-03-01', due: '2025-03-15', returned: '2025-03-11', status: 'Returned', renewals: 0 },
  { id: 14, student: 'Brian Ndegwa', class: 'Form 3 South', book: 'Computer Studies for Secondary', isbn: '9789966451001', borrowed: '2025-03-10', due: '2025-03-24', returned: null, status: 'Active', renewals: 0 },
  { id: 15, student: 'Mercy Atieno', class: 'Form 4 North', book: 'Longman English Form 4', isbn: '9789966451414', borrowed: '2025-03-08', due: '2025-03-22', returned: null, status: 'Active', renewals: 0 },
]

type StatusFilter = 'all' | 'Active' | 'Overdue' | 'Returned'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
  Overdue: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5' },
  Returned: { bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc' },
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

export default function LibraryCirculationPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const handleSearch = (e: FormEvent) => e.preventDefault()

  const filtered = TRANSACTIONS.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchSearch = search === '' ||
      t.student.toLowerCase().includes(search.toLowerCase()) ||
      t.book.toLowerCase().includes(search.toLowerCase()) ||
      t.isbn.includes(search)
    return matchStatus && matchSearch
  })

  const active = TRANSACTIONS.filter(t => t.status === 'Active').length
  const overdue = TRANSACTIONS.filter(t => t.status === 'Overdue').length
  const returned = TRANSACTIONS.filter(t => t.status === 'Returned').length

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="teal"
        title="Circulation"
        subtitle="Track borrowing, returns and renewals"
        icon="🔄"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Currently Borrowed', value: active, icon: BookOpen, color: '#10b981' },
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Returned Today', value: returned, icon: CheckCircle, color: '#6366f1' },
        ].map(s => {
          const Icon = s.icon
          return (
            <GlassCard key={s.label} className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                <Icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student, book, or ISBN…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </form>
        <div className="flex gap-2">
          {(['all', 'Active', 'Overdue', 'Returned'] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
              style={statusFilter === f
                ? { background: '#6366f1', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <GlassCard className="overflow-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['#', 'Student', 'Class', 'Book Title', 'Borrowed', 'Due Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const sc = STATUS_COLORS[t.status]
              return (
                <tr key={t.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-slate-500 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-white">{t.student}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{t.class}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{t.book}</p>
                    <p className="text-xs text-slate-500">{t.isbn}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{t.borrowed}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs flex items-center gap-1">
                    <Clock size={11} /> {t.due}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: sc.bg, color: sc.text }}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.status !== 'Returned' && (
                        <button className="px-3 py-1 rounded-lg text-xs font-semibold transition-all" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                          Return
                        </button>
                      )}
                      {t.status === 'Active' && t.renewals < 2 && (
                        <button className="px-3 py-1 rounded-lg text-xs font-semibold transition-all" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                          <RotateCcw size={11} className="inline mr-1" />Renew
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}
