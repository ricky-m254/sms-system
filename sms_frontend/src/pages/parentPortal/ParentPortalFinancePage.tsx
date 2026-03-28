import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { DollarSign, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const fmt = (v: number | string | null | undefined) =>
  v != null ? `KES ${Number(v).toLocaleString()}` : 'KES 0'

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    PAID: 'bg-emerald-500/15 text-emerald-400',
    PARTIAL: 'bg-amber-500/15 text-amber-400',
    PENDING: 'bg-sky-500/15 text-sky-400',
    OVERDUE: 'bg-rose-500/15 text-rose-400',
  }
  return m[s?.toUpperCase()] ?? 'bg-slate-500/15 text-slate-400'
}

export default function ParentPortalFinancePage() {
  const [summary, setSummary] = useState<any>({})
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices')

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/finance/summary/'),
      apiClient.get('/parent-portal/finance/invoices/'),
      apiClient.get('/parent-portal/finance/payments/'),
    ])
      .then(([s, i, p]) => {
        setSummary(s.data ?? {})
        setInvoices(Array.isArray(i.data) ? i.data : [])
        setPayments(Array.isArray(p.data) ? p.data : [])
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const outstanding = Number(summary.outstanding_balance ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">FINANCE</p>
        <h1 className="text-2xl font-display font-bold text-white">Financial Information</h1>
        <p className="text-slate-500 text-sm mt-1">Fees, invoices, and payment history for your child</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Billed', value: fmt(summary.total_billed), icon: FileText, color: '#38bdf8', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Total Paid', value: fmt(summary.total_paid), icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Outstanding Balance', value: fmt(outstanding), icon: outstanding > 0 ? AlertCircle : CheckCircle2, color: outstanding > 0 ? '#f59e0b' : '#10b981', bg: outstanding > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5 flex items-center gap-4" style={GLASS}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
              <k.icon size={18} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k.label}</p>
              <p className="text-lg font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {outstanding > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">Your child has an outstanding balance of <strong>{fmt(outstanding)}</strong>. Please settle by the due date.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['invoices', 'payments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {t === 'invoices' ? `Invoices (${invoices.length})` : `Payments (${payments.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading financial records…</div>
      ) : tab === 'invoices' ? (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>No invoices found.</div>
          ) : invoices.map((inv: any) => (
            <div key={inv.id} className="rounded-2xl p-5" style={GLASS}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(inv.status)}`}>{inv.status}</span>
                    <span className="text-xs text-slate-500 font-mono">{inv.invoice_number}</span>
                  </div>
                  <p className="font-semibold text-slate-200 truncate">{inv.description || 'School Fees'}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                    {inv.term && <span>Term: {inv.term}</span>}
                    {inv.academic_year && <span>Year: {inv.academic_year}</span>}
                    {inv.due_date && <span className="flex items-center gap-1"><Clock size={10} />Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{fmt(inv.amount)}</p>
                  {inv.amount_paid > 0 && <p className="text-xs text-emerald-400">Paid: {fmt(inv.amount_paid)}</p>}
                  {Number(inv.balance) > 0 && <p className="text-xs text-amber-400">Due: {fmt(inv.balance)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          {payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No payments recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Date', 'Amount', 'Method', 'Reference'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {payments.map((p: any, i: number) => (
                  <tr key={p.id} className={`hover:bg-white/[0.015] ${i % 2 !== 0 ? 'bg-white/[0.008]' : ''}`}>
                    <td className="px-4 py-3 text-slate-400">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{p.payment_method?.replace('_', ' ') ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.reference_number || p.transaction_reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
