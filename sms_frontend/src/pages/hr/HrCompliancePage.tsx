import { Shield, FileCheck, AlertTriangle, Clock, User, Search } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { useState } from 'react'

type AuditAction = 'Updated Record' | 'Created Record' | 'Deleted Record' | 'Approved Leave' | 'Rejected Leave' | 'Modified Payroll' | 'Added Employee' | 'Changed Role'

type AuditEntry = {
  id: number
  logId: string
  user: string
  role: string
  action: AuditAction
  target: string
  module: string
  timestamp: string
  ipAddress: string
}

const AUDIT_LOGS: AuditEntry[] = [
  { id: 1, logId: 'LOG-2026-001', user: 'HR Manager', role: 'HR Manager', action: 'Updated Record', target: 'Jane Smith (Teacher)', module: 'Employee Records', timestamp: '2026-03-17 09:14:22', ipAddress: '192.168.1.10' },
  { id: 2, logId: 'LOG-2026-002', user: 'Admin', role: 'School Admin', action: 'Added Employee', target: 'Kevin Mwangi (New Hire)', module: 'Employee Directory', timestamp: '2026-03-17 08:55:01', ipAddress: '192.168.1.5' },
  { id: 3, logId: 'LOG-2026-003', user: 'HR Officer', role: 'HR Officer', action: 'Approved Leave', target: 'Peter Ochieng — Sick Leave', module: 'Leave Management', timestamp: '2026-03-16 15:30:44', ipAddress: '192.168.1.12' },
  { id: 4, logId: 'LOG-2026-004', user: 'Payroll Officer', role: 'Finance Staff', action: 'Modified Payroll', target: 'March 2026 Payroll Batch', module: 'Payroll', timestamp: '2026-03-16 11:02:17', ipAddress: '192.168.1.8' },
  { id: 5, logId: 'LOG-2026-005', user: 'HR Manager', role: 'HR Manager', action: 'Rejected Leave', target: 'Mary Akinyi — Annual Leave', module: 'Leave Management', timestamp: '2026-03-15 14:48:00', ipAddress: '192.168.1.10' },
  { id: 6, logId: 'LOG-2026-006', user: 'Admin', role: 'School Admin', action: 'Changed Role', target: 'Samuel Otieno → Department Head', module: 'Roles & Access', timestamp: '2026-03-15 10:21:33', ipAddress: '192.168.1.5' },
  { id: 7, logId: 'LOG-2026-007', user: 'HR Officer', role: 'HR Officer', action: 'Created Record', target: 'Staff Contract — Grace Adhiambo', module: 'Contract Management', timestamp: '2026-03-14 16:05:10', ipAddress: '192.168.1.12' },
  { id: 8, logId: 'LOG-2026-008', user: 'HR Manager', role: 'HR Manager', action: 'Updated Record', target: 'Qualifications — Michael Adams', module: 'Employee Records', timestamp: '2026-03-13 09:33:45', ipAddress: '192.168.1.10' },
]

const ACTION_COLOR: Record<AuditAction, string> = {
  'Updated Record': 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  'Created Record': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Deleted Record': 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  'Approved Leave': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Rejected Leave': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Modified Payroll': 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  'Added Employee': 'bg-teal-500/15 text-teal-300 border-teal-500/20',
  'Changed Role': 'bg-orange-500/15 text-orange-300 border-orange-500/20',
}

const COMPLIANCE_ITEMS = [
  { label: 'Employment Contracts Expiring (30 days)', value: 3, alert: true },
  { label: 'Pending Performance Reviews', value: 7, alert: true },
  { label: 'Leave Balance Anomalies Detected', value: 1, alert: true },
  { label: 'Staff Without Valid TSC Numbers', value: 0, alert: false },
  { label: 'Payroll Records Unverified', value: 2, alert: true },
  { label: 'Incomplete Onboarding Tasks', value: 4, alert: true },
]

export default function HrCompliancePage() {
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('All')

  const modules = ['All', ...Array.from(new Set(AUDIT_LOGS.map(l => l.module)))]

  const filtered = AUDIT_LOGS.filter(l => {
    const matchSearch = l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.target.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
    const matchModule = filterModule === 'All' || l.module === filterModule
    return matchSearch && matchModule
  })

  return (
    <div className="space-y-6">
      <PageHero
        title="Compliance & Audit Logs"
        subtitle="Complete audit trail of all HR actions — role-based access enforcement and regulatory compliance"
        icon={Shield}
        theme="violet"
        stats={[
          { label: 'Audit Entries', value: AUDIT_LOGS.length },
          { label: 'Compliance Alerts', value: COMPLIANCE_ITEMS.filter(c => c.alert).length },
          { label: 'Staff Records', value: 120 },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {COMPLIANCE_ITEMS.map(item => (
          <div key={item.label} className={`flex items-start gap-3 rounded-2xl border p-4 ${item.alert && item.value > 0 ? 'border-amber-500/20 bg-amber-500/[0.06]' : 'border-emerald-500/20 bg-emerald-500/[0.05]'}`}>
            {item.alert && item.value > 0
              ? <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              : <FileCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />}
            <div>
              <p className={`text-sm font-semibold ${item.alert && item.value > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{item.value} {item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-violet-400" />
            <h3 className="font-display font-semibold text-sm">HR Audit Trail</h3>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="rounded-xl border border-white/[0.09] bg-white/[0.04] pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 w-44" />
            </div>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
              className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none">
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-300 hover:text-white transition">Export CSV</button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Log ID</th>
              <th className="px-4 py-2.5 text-left">User</th>
              <th className="px-4 py-2.5 text-left">Action</th>
              <th className="px-4 py-2.5 text-left">Target / Employee</th>
              <th className="px-4 py-2.5 text-left">Module</th>
              <th className="px-4 py-2.5 text-left">Timestamp</th>
              <th className="px-4 py-2.5 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-white/[0.025] transition">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.logId}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-slate-600" />
                    <div>
                      <div className="text-white text-xs font-medium">{log.user}</div>
                      <div className="text-slate-600 text-[10px]">{log.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${ACTION_COLOR[log.action]}`}>{log.action}</span>
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs max-w-[180px] truncate">{log.target}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{log.module}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-600">{log.ipAddress}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">No audit logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
