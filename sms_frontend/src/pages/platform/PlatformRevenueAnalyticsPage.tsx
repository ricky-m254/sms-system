import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const MRR_DATA = [
  { month: 'Oct', value: 18400 },
  { month: 'Nov', value: 21200 },
  { month: 'Dec', value: 24800 },
  { month: 'Jan', value: 27300 },
  { month: 'Feb', value: 29900 },
  { month: 'Mar', value: 33500 },
]

const TENANTS = [
  { name: 'Greenfield Academy', plan: 'Enterprise', mrr: 8400, ltv: 100800, status: 'active', months: 12 },
  { name: 'Hillside Secondary', plan: 'Enterprise', mrr: 8400, ltv: 67200, status: 'active', months: 8 },
  { name: 'Sunrise Primary', plan: 'Professional', mrr: 4200, ltv: 25200, status: 'active', months: 6 },
  { name: 'Lakewood Junior', plan: 'Professional', mrr: 4200, ltv: 12600, status: 'active', months: 3 },
  { name: 'Demo School', plan: 'Starter', mrr: 1200, ltv: 2400, status: 'trial', months: 2 },
  { name: 'Eastgate Academy', plan: 'Starter', mrr: 1100, ltv: 1100, status: 'churned', months: 1 },
]

function MiniBarChart({ data }: { data: { month: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[9px] text-slate-500 font-mono">${(d.value / 1000).toFixed(0)}k</span>
          <div className="w-full rounded-t-sm" style={{ height: `${Math.round((d.value / max) * 80)}px`, background: i === data.length - 1 ? '#10b981' : 'rgba(16,185,129,0.3)' }} />
          <span className="text-[9px] text-slate-600">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function PlatformRevenueAnalyticsPage() {
  const mrr = 33500
  const arr = mrr * 12
  const prevMrr = 29900
  const growth = (((mrr - prevMrr) / prevMrr) * 100).toFixed(1)
  const activeTenants = TENANTS.filter(t => t.status === 'active')
  const churnedTenants = TENANTS.filter(t => t.status === 'churned')
  const churnRate = ((churnedTenants.length / TENANTS.length) * 100).toFixed(1)
  const avgLtv = Math.round(activeTenants.reduce((s, t) => s + t.ltv, 0) / activeTenants.length)

  const planGroups = ['Enterprise', 'Professional', 'Starter'].map(plan => ({
    plan,
    count: TENANTS.filter(t => t.plan === plan && t.status !== 'churned').length,
    mrr: TENANTS.filter(t => t.plan === plan && t.status !== 'churned').reduce((s, t) => s + t.mrr, 0),
  }))

  const STATUS_COLOR: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-300',
    trial: 'bg-blue-500/15 text-blue-300',
    churned: 'bg-red-500/15 text-red-400',
  }

  return (
    <div className="space-y-6">
      <PageHero title="Revenue Analytics" subtitle="SaaS health metrics — MRR, ARR, churn, and lifetime value" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'MRR', value: `$${mrr.toLocaleString()}`, sub: `↑ ${growth}% vs last mo`, color: '#10b981' },
          { label: 'ARR', value: `$${(arr / 1000).toFixed(0)}k`, sub: 'Annualised run rate', color: '#3b82f6' },
          { label: 'Churn Rate', value: `${churnRate}%`, sub: `${churnedTenants.length} tenant(s) lost`, color: '#ef4444' },
          { label: 'Avg LTV', value: `$${avgLtv.toLocaleString()}`, sub: 'Active tenants', color: '#a78bfa' },
        ].map(m => (
          <div key={m.label} className="rounded-2xl p-4" style={GLASS}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{m.label}</p>
            <p className="mt-1 text-2xl font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl p-5 lg:col-span-3" style={GLASS}>
          <h2 className="mb-4 text-sm font-semibold text-slate-200">MRR Growth (6 Months)</h2>
          <MiniBarChart data={MRR_DATA} />
        </div>

        <div className="rounded-2xl p-5 lg:col-span-2" style={GLASS}>
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Revenue by Plan</h2>
          <div className="space-y-3">
            {planGroups.map(p => {
              const pct = Math.round((p.mrr / mrr) * 100)
              return (
                <div key={p.plan}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{p.plan} <span className="text-slate-500">({p.count})</span></span>
                    <span className="font-mono text-slate-200">${p.mrr.toLocaleString()} <span className="text-slate-500">({pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={GLASS}>
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Tenant Revenue Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-500">
                <th className="pb-3 pr-4">School</th>
                <th className="pb-3 pr-4">Plan</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">MRR</th>
                <th className="pb-3 pr-4">Months</th>
                <th className="pb-3">LTV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TENANTS.map(t => (
                <tr key={t.name} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-medium text-slate-200">{t.name}</td>
                  <td className="py-3 pr-4 text-slate-400">{t.plan}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-200">${t.mrr.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-slate-400">{t.months}</td>
                  <td className="py-3 font-mono text-slate-300">${t.ltv.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
