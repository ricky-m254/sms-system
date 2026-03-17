import { useState } from 'react'
import { Users, Plus, Building2, Package } from 'lucide-react'
import PageHero from '../../components/PageHero'

type Allocation = {
  id: number
  allocationId: string
  department: string
  item: string
  quantity: number
  unit: string
  allocationDate: string
  allocatedBy: string
  purpose: string
}

const ALLOCATIONS: Allocation[] = [
  { id: 1, allocationId: 'ALLOC-001', department: 'Science', item: 'Microscopes', quantity: 10, unit: 'pcs', allocationDate: '2026-03-15', allocatedBy: 'Store Manager', purpose: 'Biology lab — Term 2' },
  { id: 2, allocationId: 'ALLOC-002', department: 'Science', item: 'Lab Gloves', quantity: 50, unit: 'pairs', allocationDate: '2026-03-14', allocatedBy: 'Store Manager', purpose: 'Chemistry practicals' },
  { id: 3, allocationId: 'ALLOC-003', department: 'Administration', item: 'A4 Paper', quantity: 20, unit: 'reams', allocationDate: '2026-03-12', allocatedBy: 'Store Clerk', purpose: 'Term reports printing' },
  { id: 4, allocationId: 'ALLOC-004', department: 'Cafeteria', item: 'Rice Bags (50kg)', quantity: 8, unit: 'bags', allocationDate: '2026-03-11', allocatedBy: 'Store Manager', purpose: 'Weekly food supply' },
  { id: 5, allocationId: 'ALLOC-005', department: 'IT', item: 'HDMI Cables', quantity: 15, unit: 'pcs', allocationDate: '2026-03-10', allocatedBy: 'Store Clerk', purpose: 'Computer lab projectors' },
  { id: 6, allocationId: 'ALLOC-006', department: 'Maintenance', item: 'Paint (White)', quantity: 6, unit: 'buckets', allocationDate: '2026-03-08', allocatedBy: 'Store Manager', purpose: 'Block B renovation' },
  { id: 7, allocationId: 'ALLOC-007', department: 'Academics', item: 'Exercise Books', quantity: 300, unit: 'pcs', allocationDate: '2026-03-05', allocatedBy: 'Store Clerk', purpose: 'Grade 7 & 8 students' },
]

const DEPARTMENTS = ['Science', 'Administration', 'Cafeteria', 'IT', 'Maintenance', 'Academics', 'HR', 'Library', 'Sports']

export default function StoreAllocationPage() {
  const [allocations, setAllocations] = useState<Allocation[]>(ALLOCATIONS)
  const [filterDept, setFilterDept] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ department: '', item: '', quantity: '', unit: 'pcs', purpose: '', allocatedBy: '' })

  const departments = ['All', ...DEPARTMENTS]
  const filtered = filterDept === 'All' ? allocations : allocations.filter(a => a.department === filterDept)

  const deptSummary = DEPARTMENTS.map(d => ({
    name: d,
    count: allocations.filter(a => a.department === d).length,
    total: allocations.filter(a => a.department === d).reduce((s, a) => s + a.quantity, 0),
  })).filter(d => d.count > 0)

  function handleSubmit() {
    if (!form.department || !form.item || !form.quantity) return
    const newAlloc: Allocation = {
      id: Date.now(),
      allocationId: `ALLOC-${String(allocations.length + 1).padStart(3, '0')}`,
      department: form.department,
      item: form.item,
      quantity: Number(form.quantity),
      unit: form.unit,
      allocationDate: new Date().toISOString().slice(0, 10),
      allocatedBy: form.allocatedBy || 'Store Manager',
      purpose: form.purpose,
    }
    setAllocations(prev => [newAlloc, ...prev])
    setForm({ department: '', item: '', quantity: '', unit: 'pcs', purpose: '', allocatedBy: '' })
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Department Allocation"
        subtitle="Track and manage inventory distributed to each department"
        icon={Users}
        theme="violet"
        stats={[
          { label: 'Allocations', value: allocations.length },
          { label: 'Departments', value: deptSummary.length },
          { label: 'This Month', value: allocations.filter(a => a.allocationDate.startsWith('2026-03')).length },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {deptSummary.map(d => (
          <button
            key={d.name}
            onClick={() => setFilterDept(filterDept === d.name ? 'All' : d.name)}
            className={`rounded-2xl p-4 text-left transition border ${filterDept === d.name ? 'bg-violet-500/15 border-violet-500/30 text-violet-200' : 'glass-panel border-transparent text-slate-300 hover:border-white/10'}`}
          >
            <Building2 size={16} className="mb-2 opacity-60" />
            <p className="text-xs font-semibold">{d.name}</p>
            <p className="text-lg font-bold mt-1">{d.count}</p>
            <p className="text-xs text-slate-500">allocations</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {departments.slice(0, 6).map(d => (
            <button
              key={d}
              onClick={() => setFilterDept(d)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${filterDept === d ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'border border-white/[0.07] text-slate-400 hover:text-white'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          <Plus size={16} /> Allocate Items
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Allocation ID</th>
              <th className="px-5 py-3 text-left">Department</th>
              <th className="px-5 py-3 text-left">Item</th>
              <th className="px-5 py-3 text-left">Quantity</th>
              <th className="px-5 py-3 text-left">Purpose</th>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-left">Allocated By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.025] transition">
                <td className="px-5 py-3 font-mono text-xs text-slate-400">{a.allocationId}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-300">
                    <Building2 size={10} /> {a.department}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-slate-500" />
                    <span className="text-white">{a.item}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-300">{a.quantity} {a.unit}</td>
                <td className="px-5 py-3 text-slate-400 max-w-[180px] truncate">{a.purpose || '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{a.allocationDate}</td>
                <td className="px-5 py-3 text-xs text-slate-400">{a.allocatedBy}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">No allocations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-5">
            <h3 className="text-lg font-display font-semibold">Allocate Inventory</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Department *</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {[
                { label: 'Item Name *', key: 'item', placeholder: 'e.g. Lab Gloves' },
                { label: 'Purpose / Notes', key: 'purpose', placeholder: 'e.g. Term 2 biology practicals' },
                { label: 'Allocated By', key: 'allocatedBy', placeholder: 'e.g. Store Manager' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                  <input value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
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
                    {['pcs', 'kg', 'litres', 'reams', 'pairs', 'boxes', 'metres', 'bags', 'cans', 'sets'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">Allocate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
