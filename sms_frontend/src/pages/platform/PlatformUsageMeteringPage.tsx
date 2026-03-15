import { useState } from 'react'
import PageHero from '../../components/PageHero'

const TENANTS = [
  { id: 1, name: 'Greenfield Academy', students: 842, storage_mb: 4320, sms: 1240, api_calls: 38200, plan: 'Enterprise', limit_students: 1000 },
  { id: 2, name: 'Sunrise Primary School', students: 410, storage_mb: 1850, sms: 530, api_calls: 14700, plan: 'Professional', limit_students: 500 },
  { id: 3, name: 'Demo School', students: 187, storage_mb: 620, sms: 120, api_calls: 5800, plan: 'Starter', limit_students: 250 },
  { id: 4, name: 'Hillside Secondary', students: 970, storage_mb: 7100, sms: 2300, api_calls: 61000, plan: 'Enterprise', limit_students: 1000 },
  { id: 5, name: 'Lakewood Junior', students: 230, storage_mb: 980, sms: 310, api_calls: 9200, plan: 'Starter', limit_students: 250 },
]

function UsageBar({ value, max, color = '#10b981' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const warn = pct >= 90
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-white/10">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: warn ? '#ef4444' : color }} />
      </div>
      <span className={`min-w-[36px] text-right text-xs font-mono font-semibold ${warn ? 'text-red-400' : 'text-slate-300'}`}>{pct}%</span>
    </div>
  )
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

export default function PlatformUsageMeteringPage() {
  const [search, setSearch] = useState('')
  const filtered = TENANTS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  const totals = {
    students: TENANTS.reduce((s, t) => s + t.students, 0),
    storage: TENANTS.reduce((s, t) => s + t.storage_mb, 0),
    sms: TENANTS.reduce((s, t) => s + t.sms, 0),
    api: TENANTS.reduce((s, t) => s + t.api_calls, 0),
  }

  return (
    <div className="space-y-6">
      <PageHero title="Usage Metering" subtitle="Real-time resource consumption across all tenants" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Students', value: totals.students.toLocaleString(), icon: '👩‍🎓', color: '#10b981' },
          { label: 'Storage Used', value: `${(totals.storage / 1024).toFixed(1)} GB`, icon: '💾', color: '#3b82f6' },
          { label: 'SMS Sent (mo)', value: totals.sms.toLocaleString(), icon: '📱', color: '#f59e0b' },
          { label: 'API Calls (mo)', value: totals.api.toLocaleString(), icon: '⚡', color: '#a78bfa' },
        ].map(m => (
          <div key={m.label} className="rounded-2xl p-4" style={GLASS}>
            <p className="text-2xl">{m.icon}</p>
            <p className="mt-2 text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
            <p className="text-xs text-slate-400">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Per-Tenant Usage Breakdown</h2>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-60"
            placeholder="Search tenant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-500">
                <th className="pb-3 pr-4">School</th>
                <th className="pb-3 pr-6">Plan</th>
                <th className="pb-3 pr-4 min-w-[140px]">Students</th>
                <th className="pb-3 pr-4 min-w-[140px]">Storage</th>
                <th className="pb-3 pr-4 min-w-[140px]">SMS (mo)</th>
                <th className="pb-3 min-w-[100px]">API Calls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-medium text-slate-200">{t.name}</td>
                  <td className="py-3 pr-6">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">{t.plan}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="mb-1 text-xs text-slate-300">{t.students} / {t.limit_students}</p>
                    <UsageBar value={t.students} max={t.limit_students} />
                  </td>
                  <td className="py-3 pr-4">
                    <p className="mb-1 text-xs text-slate-300">{(t.storage_mb / 1024).toFixed(1)} GB</p>
                    <UsageBar value={t.storage_mb} max={10240} color="#3b82f6" />
                  </td>
                  <td className="py-3 pr-4">
                    <p className="mb-1 text-xs text-slate-300">{t.sms.toLocaleString()}</p>
                    <UsageBar value={t.sms} max={3000} color="#f59e0b" />
                  </td>
                  <td className="py-3">
                    <p className="font-mono text-xs text-slate-300">{t.api_calls.toLocaleString()}</p>
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
