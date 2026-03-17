import { BarChart3, TrendingDown, TrendingUp, Package, DollarSign, FileText } from 'lucide-react'
import PageHero from '../../components/PageHero'

const TOP_CONSUMED = [
  { item: 'Rice (50kg bags)', department: 'Cafeteria', consumed: 150, unit: 'bags', value: 225000 },
  { item: 'A4 Printing Paper', department: 'Administration', consumed: 80, unit: 'reams', value: 32000 },
  { item: 'Beans (90kg bags)', department: 'Cafeteria', consumed: 60, unit: 'bags', value: 72000 },
  { item: 'Lab Gloves', department: 'Science', consumed: 200, unit: 'pairs', value: 12000 },
  { item: 'Exercise Books (200pg)', department: 'Academics', consumed: 1200, unit: 'pcs', value: 60000 },
  { item: 'Cooking Oil (5L)', department: 'Cafeteria', consumed: 45, unit: 'cans', value: 31500 },
  { item: 'Chalk (Boxes)', department: 'Academics', consumed: 30, unit: 'boxes', value: 4500 },
]

const DEPT_USAGE = [
  { dept: 'Cafeteria', value: 328500, pct: 52 },
  { dept: 'Administration', value: 85000, pct: 13 },
  { dept: 'Academics', value: 74500, pct: 12 },
  { dept: 'Science', value: 52000, pct: 8 },
  { dept: 'Maintenance', value: 48000, pct: 8 },
  { dept: 'IT', value: 29000, pct: 5 },
  { dept: 'Other', value: 13000, pct: 2 },
]

const MONTHLY_PROCUREMENT = [
  { month: 'Oct', value: 120000 },
  { month: 'Nov', value: 145000 },
  { month: 'Dec', value: 98000 },
  { month: 'Jan', value: 162000 },
  { month: 'Feb', value: 138000 },
  { month: 'Mar', value: 175000 },
]

const maxProcurement = Math.max(...MONTHLY_PROCUREMENT.map(m => m.value))

export default function StoreReportsPage() {
  const totalInventoryValue = 4820000
  const totalConsumedValue = DEPT_USAGE.reduce((s, d) => s + d.value, 0)
  const lowStockItems = 14

  return (
    <div className="space-y-6">
      <PageHero
        title="Inventory Reports & Analytics"
        subtitle="Stock consumption trends, department usage, and procurement spending"
        icon={BarChart3}
        theme="sky"
        stats={[
          { label: 'Inventory Value', value: `Ksh ${(totalInventoryValue / 1000).toFixed(0)}k` },
          { label: 'Monthly Spend', value: `Ksh ${(totalConsumedValue / 1000).toFixed(0)}k` },
          { label: 'Low Stock Items', value: lowStockItems },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { label: 'Total Inventory Value', value: `Ksh ${totalInventoryValue.toLocaleString()}`, icon: Package, color: 'text-emerald-400', sub: '1,240 items tracked' },
          { label: 'Monthly Procurement', value: `Ksh ${(175000).toLocaleString()}`, icon: DollarSign, color: 'text-sky-400', sub: '+26% vs last month', trend: true },
          { label: 'Consumption (Month)', value: `Ksh ${totalConsumedValue.toLocaleString()}`, icon: TrendingDown, color: 'text-amber-400', sub: '7 departments' },
        ].map(card => (
          <div key={card.label} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="mt-2 text-2xl font-bold font-display">{card.value}</p>
                <p className={`mt-1 text-xs ${card.trend ? 'text-emerald-400' : 'text-slate-500'}`}>{card.sub}</p>
              </div>
              <card.icon className={`mt-1 ${card.color}`} size={22} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-sky-400" />
            <h3 className="font-display font-semibold text-sm">Monthly Procurement Spend (Ksh)</h3>
          </div>
          <div className="flex items-end gap-3 h-40">
            {MONTHLY_PROCUREMENT.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{Math.round(m.value / 1000)}k</span>
                <div
                  className="w-full rounded-t-lg bg-sky-500/40 border border-sky-500/30 transition-all"
                  style={{ height: `${(m.value / maxProcurement) * 100}%` }}
                />
                <span className="text-xs text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} className="text-violet-400" />
            <h3 className="font-display font-semibold text-sm">Department Usage (Ksh)</h3>
          </div>
          <div className="space-y-3">
            {DEPT_USAGE.map(d => (
              <div key={d.dept}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{d.dept}</span>
                  <span className="text-slate-400">Ksh {d.value.toLocaleString()} ({d.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06]">
                  <div className="h-2 rounded-full bg-violet-500/60" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-amber-400" />
            <h3 className="font-display font-semibold text-sm">Top Consumed Items — March 2026</h3>
          </div>
          <button className="text-xs text-emerald-400 hover:text-emerald-300 transition">Export CSV</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Item</th>
              <th className="px-4 py-2.5 text-left">Department</th>
              <th className="px-4 py-2.5 text-right">Consumed</th>
              <th className="px-4 py-2.5 text-right">Value (Ksh)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {TOP_CONSUMED.map((item, i) => (
              <tr key={i} className="hover:bg-white/[0.025] transition">
                <td className="px-4 py-3 text-white">{item.item}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{item.department}</td>
                <td className="px-4 py-3 text-right text-slate-300">{item.consumed} {item.unit}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{item.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
