import { useState } from 'react'
import { ClipboardList, Plus, CheckCircle, XCircle, Clock, Package } from 'lucide-react'
import PageHero from '../../components/PageHero'

type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled'

type StockRequest = {
  id: number
  requestId: string
  department: string
  requestedBy: string
  item: string
  quantity: number
  unit: string
  requestDate: string
  status: RequestStatus
  notes: string
}

const REQUESTS: StockRequest[] = [
  { id: 1, requestId: 'REQ-2026-001', department: 'Science', requestedBy: 'Mr. Kamau', item: 'Lab Gloves', quantity: 20, unit: 'pairs', requestDate: '2026-03-15', status: 'Pending', notes: 'For upcoming chemistry practicals' },
  { id: 2, requestId: 'REQ-2026-002', department: 'Administration', requestedBy: 'Ms. Wanjiku', item: 'A4 Printing Paper', quantity: 10, unit: 'reams', requestDate: '2026-03-14', status: 'Approved', notes: 'Urgent – term reports printing' },
  { id: 3, requestId: 'REQ-2026-003', department: 'Cafeteria', requestedBy: 'Chef Otieno', item: 'Cooking Oil (5L)', quantity: 6, unit: 'cans', requestDate: '2026-03-13', status: 'Fulfilled', notes: '' },
  { id: 4, requestId: 'REQ-2026-004', department: 'Maintenance', requestedBy: 'Mr. Mwangi', item: 'Paint (White)', quantity: 4, unit: 'buckets', requestDate: '2026-03-12', status: 'Rejected', notes: 'Budget not allocated this quarter' },
  { id: 5, requestId: 'REQ-2026-005', department: 'IT', requestedBy: 'Ms. Adhiambo', item: 'Ethernet Cable (Cat6)', quantity: 30, unit: 'metres', requestDate: '2026-03-11', status: 'Pending', notes: 'Computer lab rewiring' },
  { id: 6, requestId: 'REQ-2026-006', department: 'Academics', requestedBy: 'Mr. Ochieng', item: 'Exercise Books', quantity: 200, unit: 'pcs', requestDate: '2026-03-10', status: 'Approved', notes: 'Grade 7 students' },
]

const STATUS_CONFIG: Record<RequestStatus, { color: string; icon: React.ElementType }> = {
  Pending: { color: 'bg-amber-500/15 text-amber-300 border-amber-500/20', icon: Clock },
  Approved: { color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', icon: CheckCircle },
  Rejected: { color: 'bg-rose-500/15 text-rose-300 border-rose-500/20', icon: XCircle },
  Fulfilled: { color: 'bg-sky-500/15 text-sky-300 border-sky-500/20', icon: Package },
}

export default function StoreRequestsPage() {
  const [requests, setRequests] = useState<StockRequest[]>(REQUESTS)
  const [filter, setFilter] = useState<RequestStatus | 'All'>('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ department: '', requestedBy: '', item: '', quantity: '', unit: 'pcs', notes: '' })

  const pending = requests.filter(r => r.status === 'Pending').length
  const approved = requests.filter(r => r.status === 'Approved').length
  const fulfilled = requests.filter(r => r.status === 'Fulfilled').length

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter)

  function updateStatus(id: number, status: RequestStatus) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  function handleSubmit() {
    if (!form.department || !form.item || !form.quantity) return
    const newReq: StockRequest = {
      id: Date.now(),
      requestId: `REQ-2026-${String(requests.length + 1).padStart(3, '0')}`,
      department: form.department,
      requestedBy: form.requestedBy,
      item: form.item,
      quantity: Number(form.quantity),
      unit: form.unit,
      requestDate: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      notes: form.notes,
    }
    setRequests(prev => [newReq, ...prev])
    setForm({ department: '', requestedBy: '', item: '', quantity: '', unit: 'pcs', notes: '' })
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Stock Requests"
        subtitle="Department requests for inventory items — review and approve"
        icon={ClipboardList}
        theme="amber"
        stats={[
          { label: 'Pending', value: pending },
          { label: 'Approved', value: approved },
          { label: 'Fulfilled', value: fulfilled },
          { label: 'Total', value: requests.length },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['All', 'Pending', 'Approved', 'Fulfilled', 'Rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium transition ${filter === s ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'border border-white/[0.07] text-slate-400 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          <Plus size={16} /> New Request
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Request ID</th>
              <th className="px-5 py-3 text-left">Department</th>
              <th className="px-5 py-3 text-left">Item</th>
              <th className="px-5 py-3 text-left">Qty</th>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(r => {
              const cfg = STATUS_CONFIG[r.status]
              const Icon = cfg.icon
              return (
                <tr key={r.id} className="hover:bg-white/[0.025] transition">
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.requestId}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-white">{r.department}</div>
                    <div className="text-xs text-slate-500">{r.requestedBy}</div>
                  </td>
                  <td className="px-5 py-3 text-white">{r.item}</td>
                  <td className="px-5 py-3 text-slate-300">{r.quantity} {r.unit}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{r.requestDate}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${cfg.color}`}>
                      <Icon size={11} /> {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {r.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(r.id, 'Approved')} className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 transition">Approve</button>
                        <button onClick={() => updateStatus(r.id, 'Rejected')} className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/10 transition">Reject</button>
                      </div>
                    )}
                    {r.status === 'Approved' && (
                      <button onClick={() => updateStatus(r.id, 'Fulfilled')} className="rounded-lg border border-sky-500/30 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-500/10 transition">Mark Fulfilled</button>
                    )}
                    {(r.status === 'Fulfilled' || r.status === 'Rejected') && (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">No requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-5">
            <h3 className="text-lg font-display font-semibold">New Stock Request</h3>
            <div className="space-y-3">
              {[
                { label: 'Department *', key: 'department', placeholder: 'e.g. Science' },
                { label: 'Requested By', key: 'requestedBy', placeholder: 'e.g. Mr. Kamau' },
                { label: 'Item Name *', key: 'item', placeholder: 'e.g. Lab Gloves' },
                { label: 'Notes', key: 'notes', placeholder: 'Reason or urgency...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                  <input
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Quantity *</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                  <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    {['pcs', 'kg', 'litres', 'reams', 'pairs', 'boxes', 'metres', 'cans'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
