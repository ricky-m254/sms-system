import { useState } from 'react'
import PageHero from '../../components/PageHero'
import { Building2, Phone, Mail, MapPin, Package, Plus, Pencil, X, Check } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const GLASS_MID = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }

type Supplier = {
  id: number
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  product_types: string
  is_active: boolean
}

const INITIAL: Supplier[] = [
  { id: 1, name: 'Nairobi General Supplies', contact_person: 'James Mwangi', phone: '+254 701 234 567', email: 'james@ngsupplies.co.ke', address: 'Industrial Area, Nairobi', product_types: 'Food, Office Supplies', is_active: true },
  { id: 2, name: 'Unga Group PLC', contact_person: 'Sarah Wanjiku', phone: '+254 722 345 678', email: 'sarah@ungagroup.com', address: 'Ruaraka, Nairobi', product_types: 'Food (Flour, Cereals)', is_active: true },
  { id: 3, name: 'Kenya Office Mart', contact_person: 'Peter Kamau', phone: '+254 733 456 789', email: 'peter@keoffice.co.ke', address: 'Tom Mboya Street, Nairobi', product_types: 'Office Supplies, Stationery', is_active: true },
  { id: 4, name: 'Lab & Science Supplies EA', contact_person: 'Fatuma Ali', phone: '+254 712 567 890', email: 'fatuma@labsciea.com', address: 'Westlands, Nairobi', product_types: 'Laboratory Equipment', is_active: false },
]

const EMPTY: Omit<Supplier, 'id'> = { name: '', contact_person: '', phone: '', email: '', address: '', product_types: '', is_active: true }

let nextId = INITIAL.length + 1

export default function StoreSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<Supplier, 'id'>>(EMPTY)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.contact_person.toLowerCase().includes(q) || s.product_types.toLowerCase().includes(q)
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? s.is_active : !s.is_active)
    return matchSearch && matchActive
  })

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (s: Supplier) => { setForm({ name: s.name, contact_person: s.contact_person, phone: s.phone, email: s.email, address: s.address, product_types: s.product_types, is_active: s.is_active }); setEditId(s.id); setShowForm(true) }

  const save = () => {
    if (!form.name.trim()) return
    if (editId !== null) {
      setSuppliers(prev => prev.map(s => s.id === editId ? { ...s, ...form } : s))
      setNotice('Supplier updated.')
    } else {
      setSuppliers(prev => [...prev, { ...form, id: nextId++ }])
      setNotice('Supplier added.')
    }
    setShowForm(false); setEditId(null); setForm(EMPTY)
    setTimeout(() => setNotice(null), 3000)
  }

  const toggleActive = (id: number) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))
  }

  const activeCount = suppliers.filter(s => s.is_active).length

  return (
    <div className="space-y-6">
      <PageHero
        badge="STORE"
        badgeColor="orange"
        title="Supplier Management"
        subtitle="Manage vendor contacts, product types and procurement sources"
        icon="🏭"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: suppliers.length, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Active', value: activeCount, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Inactive', value: suppliers.length - activeCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Product Categories', value: new Set(suppliers.flatMap(s => s.product_types.split(',').map(p => p.trim()))).size, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <p className="text-2xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Check size={14} />{notice}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilterActive(f)}
              className="rounded-xl px-4 py-2 text-xs font-semibold capitalize transition"
              style={{
                background: filterActive === f ? '#10b981' : 'rgba(255,255,255,0.04)',
                color: filterActive === f ? '#fff' : '#94a3b8',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…"
            className="w-full max-w-xs rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
          <button onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition whitespace-nowrap">
            <Plus size={14} /> Add Supplier
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white">{editId !== null ? 'Edit Supplier' : 'New Supplier'}</p>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition"><X size={16} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Supplier name *"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2" />
            <input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} placeholder="Contact person"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (e.g. +254 7xx xxx xxx)"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" type="email"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Physical address"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={form.product_types} onChange={e => setForm(p => ({ ...p, product_types: e.target.value }))} placeholder="Product types (e.g. Food, Office Supplies)"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2" />
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="rounded" />
              Active supplier
            </label>
          </div>
          <button onClick={save} disabled={!form.name.trim()}
            className="mt-4 rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50 hover:bg-emerald-400 transition">
            {editId !== null ? 'Update Supplier' : 'Add Supplier'}
          </button>
        </div>
      )}

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-sm col-span-2 py-8 text-center">No suppliers found.</p>
        ) : filtered.map(s => (
          <div key={s.id} className="rounded-2xl p-5 transition-all hover:scale-[1.01]" style={GLASS_MID}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: s.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }}>
                  <Building2 size={18} style={{ color: s.is_active ? '#10b981' : '#64748b' }} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{s.name}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5 inline-block"
                    style={{
                      background: s.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                      color: s.is_active ? '#10b981' : '#64748b',
                    }}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-slate-500 hover:text-sky-400 transition"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => toggleActive(s.id)} className="rounded-lg p-1.5 text-slate-500 hover:text-amber-400 transition"
                  style={{ background: 'rgba(255,255,255,0.04)' }} title={s.is_active ? 'Deactivate' : 'Activate'}>
                  {s.is_active ? <X size={13} /> : <Check size={13} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {s.contact_person && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-4 h-4 flex items-center justify-center">👤</div>
                  {s.contact_person}
                </div>
              )}
              {s.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Phone size={12} className="text-slate-500 shrink-0" />
                  <a href={`tel:${s.phone}`} className="hover:text-emerald-400 transition">{s.phone}</a>
                </div>
              )}
              {s.email && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Mail size={12} className="text-slate-500 shrink-0" />
                  <a href={`mailto:${s.email}`} className="hover:text-emerald-400 transition truncate">{s.email}</a>
                </div>
              )}
              {s.address && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin size={12} className="text-slate-500 shrink-0" />
                  {s.address}
                </div>
              )}
            </div>
            {s.product_types && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Package size={11} className="text-slate-500" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Products Supplied</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.product_types.split(',').map(p => p.trim()).filter(Boolean).map(p => (
                    <span key={p} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
