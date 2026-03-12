import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  Package, Wrench, Tag, TrendingDown, CheckCircle2,
  AlertTriangle, ChevronRight, BarChart2, DollarSign, Settings,
  Archive, ShieldCheck,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type DashboardData = {
  total_assets: number; active: number; in_repair: number; retired: number; disposed: number
  total_value: number; total_cost: number; total_accumulated_depreciation: number
  categories_count: number; assignments_active: number; maintenance_pending: number
}

const ASSET_CATEGORIES = [
  { name: 'Electronics', count: 4, value: 2380000, color: '#0ea5e9', icon: '💻' },
  { name: 'Furniture', count: 2, value: 130000, color: '#10b981', icon: '🪑' },
  { name: 'Laboratory', count: 3, value: 330000, color: '#a855f7', icon: '🔬' },
  { name: 'Sports Equipment', count: 2, value: 44000, color: '#f59e0b', icon: '⚽' },
  { name: 'Library', count: 1, value: 96000, color: '#6366f1', icon: '📚' },
  { name: 'Transport', count: 1, value: 4500000, color: '#ec4899', icon: '🚌' },
  { name: 'Kitchen', count: 1, value: 380000, color: '#f97316', icon: '🍳' },
  { name: 'Office', count: 1, value: 180000, color: '#14b8a6', icon: '🖨️' },
]

const RECENT_ASSETS = [
  { code: 'AST-002', name: 'HP ProBook Laptops (15 units)', category: 'Electronics', cost: 750000, value: 637500, status: 'Active', year: 2023 },
  { code: 'AST-010', name: 'Isuzu School Bus', category: 'Transport', cost: 4500000, value: 3375000, status: 'Active', year: 2022 },
  { code: 'AST-014', name: 'Desktop Computers (20 units)', category: 'Electronics', cost: 1200000, value: 864000, status: 'Active', year: 2022 },
  { code: 'AST-011', name: 'Office Photocopier', category: 'Office', cost: 180000, value: 158400, status: 'Active', year: 2023 },
  { code: 'AST-004', name: 'Science Lab Microscopes (10)', category: 'Laboratory', cost: 250000, value: 162500, status: 'Active', year: 2021 },
]

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Active: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  'In Repair': { label: 'In Repair', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Wrench },
  Retired: { label: 'Retired', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: Archive },
  Disposed: { label: 'Disposed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: AlertTriangle },
}

const fmtKsh = (n: number) => 'Ksh ' + n.toLocaleString('en-KE', { minimumFractionDigits: 0 })

export default function AssetsDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData>({
    total_assets: 15, active: 15, in_repair: 0, retired: 0, disposed: 0,
    total_value: 8040900, total_cost: 9860000, total_accumulated_depreciation: 1819100,
    categories_count: 8, assignments_active: 0, maintenance_pending: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<DashboardData>('/assets/dashboard/')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const deprecPct = data.total_cost > 0 ? (data.total_accumulated_depreciation / data.total_cost * 100) : 0

  const kpis = [
    { label: 'Total Assets', value: data.total_assets, icon: Package, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: `${data.active} active · ${data.in_repair} in repair` },
    { label: 'Gross Asset Value', value: fmtKsh(data.total_cost), icon: DollarSign, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: 'At purchase cost' },
    { label: 'Net Book Value', value: fmtKsh(data.total_value), icon: BarChart2, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: `After ${deprecPct.toFixed(1)}% depreciation` },
    { label: 'Pending Maintenance', value: data.maintenance_pending, icon: Wrench, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: 'Scheduled service requests' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1a30 0%, #1a0e2e 45%, #0e1a18 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(168,85,247,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(16,185,129,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.35)' }}>
                ASSET MANAGEMENT · IPSAS-COMPLIANT
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <ShieldCheck size={11} />
                {data.active} assets active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              School Assets &<br />
              <span style={{ color: '#d8b4fe' }}>Property Register</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              IPSAS-compliant tracking of all school assets — from buses to microscopes — with depreciation scheduling and maintenance records.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[260px]">
            {[
              { label: 'Total Assets', value: String(data.total_assets), color: '#10b981' },
              { label: 'Categories', value: String(data.categories_count), color: '#0ea5e9' },
              { label: 'Net Value', value: 'Ksh ' + (data.total_value / 1e6).toFixed(1) + 'M', color: '#a855f7' },
              { label: 'Deprec.', value: deprecPct.toFixed(0) + '%', color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-xl font-bold text-white leading-tight">{item.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
            style={{ background: `${k.color}10`, border: `1px solid ${k.color}25` }}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-xl font-bold text-white tabular-nums leading-tight">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Asset Registry + Categories ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent assets table */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Package size={13} className="text-violet-400" /> Asset Register
            </p>
            <button onClick={() => navigate('/modules/assets/registry')}
              className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition">
              Full registry →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Code', 'Asset Name', 'Category', 'Cost', 'Net Value', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_ASSETS.map((asset, i) => {
                  const cfg = STATUS_CFG[asset.status] ?? STATUS_CFG.Active
                  return (
                    <tr key={asset.code} className="hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: i < RECENT_ASSETS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{asset.code}</td>
                      <td className="px-4 py-3 text-xs font-medium text-white">{asset.name}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-400">{asset.category}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-300 font-medium">{fmtKsh(asset.cost)}</td>
                      <td className="px-4 py-3 text-[11px] font-bold" style={{ color: '#10b981' }}>{fmtKsh(asset.value)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Categories breakdown */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Tag size={13} className="text-emerald-400" /> By Category
              </p>
            </div>
            <div className="p-4 space-y-2.5">
              {ASSET_CATEGORIES.slice(0, 6).map(cat => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-300">
                      <span>{cat.icon}</span>{cat.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{cat.count} items</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(cat.value / 4500000) * 100}%`, background: cat.color }} />
                    </div>
                    <span className="text-[9px] font-medium flex-shrink-0" style={{ color: cat.color }}>
                      {fmtKsh(cat.value).replace('Ksh ', '')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Depreciation summary */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={13} className="text-amber-400" />
              <p className="text-xs font-bold text-amber-300">Depreciation Summary</p>
            </div>
            {[
              { label: 'Gross Cost', value: fmtKsh(data.total_cost) },
              { label: 'Accumulated Deprec.', value: fmtKsh(data.total_accumulated_depreciation) },
              { label: 'Net Book Value', value: fmtKsh(data.total_value) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Asset Registry', route: '/modules/assets/registry' },
                { label: 'Depreciation Schedule', route: '/modules/assets/depreciation' },
                { label: 'Maintenance Records', route: '/modules/assets/maintenance' },
                { label: 'Asset Assignments', route: '/modules/assets/assignments' },
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
