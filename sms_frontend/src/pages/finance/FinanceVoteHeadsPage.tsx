import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

type VoteHead = {
  id: number
  name: string
  description: string
  allocation_percentage: string
  is_preloaded: boolean
  is_active: boolean
  order: number
}

type FormState = {
  name: string
  description: string
  allocation_percentage: string
  is_active: boolean
  order: number
}

const blank: FormState = { name: '', description: '', allocation_percentage: '0.00', is_active: true, order: 0 }

const extractApiError = (err: unknown, fallback: string) => {
  const res = err as { response?: { status?: number; data?: unknown } }
  const status = res?.response?.status
  const data = res?.response?.data
  if (status === 500) return 'A server error occurred. Please try again or contact support.'
  if (typeof data === 'string' && data.trim() && !data.trimStart().startsWith('<')) return data
  if (data && typeof data === 'object') {
    const msgs = Object.values(data as Record<string, unknown>).flat()
    if (msgs.length) return (msgs as string[]).join(' ')
  }
  return fallback
}

export default function FinanceVoteHeadsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<VoteHead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<VoteHead | null>(null)
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<VoteHead | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  const load = () => {
    setLoading(true)
    apiClient.get('/finance/vote-heads/').then(r => {
      setRows(r.data.results ?? r.data)
      setLoading(false)
    }).catch(() => { setError('Failed to load vote heads.'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(blank); setSaveError(''); setShowForm(true) }
  const openEdit = (vh: VoteHead) => {
    setEditing(vh)
    setForm({ name: vh.name, description: vh.description, allocation_percentage: vh.allocation_percentage, is_active: vh.is_active, order: vh.order })
    setSaveError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true); setSaveError('')
    try {
      if (editing) await apiClient.patch(`/finance/vote-heads/${editing.id}/`, form)
      else await apiClient.post('/finance/vote-heads/', form)
      setShowForm(false); load()
    } catch (err) { setSaveError(extractApiError(err, 'Failed to save.')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await apiClient.delete(`/finance/vote-heads/${deleteTarget.id}/`)
    setDeleteTarget(null); load()
  }

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg('')
    try {
      const r = await apiClient.post('/finance/vote-heads/seed-defaults/')
      setSeedMsg(r.data.message || 'Done.'); load()
    } catch { setSeedMsg('Seeding failed.') }
    finally { setSeeding(false) }
  }

  const totalPct = rows.reduce((s, vh) => s + parseFloat(vh.allocation_percentage || '0'), 0)

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <button
          onClick={() => navigate('/modules/finance')}
          className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition"
        >
          ← Back to Finance
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Vote Heads</h1>
            <p className="mt-1 text-sm text-slate-400">
              Define allocation categories — Tuition, Exam, Medical, Activity, Boarding/Meals, Development, Arrears
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {seeding ? 'Seeding…' : 'Seed Defaults'}
            </button>
            <button
              onClick={openCreate}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              + Add Vote Head
            </button>
          </div>
        </div>
        {seedMsg && (
          <p className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
            {seedMsg}
          </p>
        )}
        {totalPct > 0 && (
          <p className={`mt-3 rounded-xl border px-4 py-2 text-xs ${Math.abs(totalPct - 100) < 0.01 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`}>
            Total allocation: <strong>{totalPct.toFixed(2)}%</strong>
            {Math.abs(totalPct - 100) < 0.01 ? ' — fully allocated ✓' : ' — allocations should sum to 100%'}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </header>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4 text-left">Order</th>
                  <th className="pb-3 pr-4 text-left">Name</th>
                  <th className="pb-3 pr-4 text-left">Description</th>
                  <th className="pb-3 pr-4 text-right">Allocation %</th>
                  <th className="pb-3 pr-4 text-center">Status</th>
                  <th className="pb-3 pr-4 text-center">Type</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">No vote heads yet. Click &quot;Seed Defaults&quot; to add the standard set.</td></tr>
                )}
                {rows.map(vh => (
                  <tr key={vh.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 pr-4 text-slate-400">{vh.order}</td>
                    <td className="py-3 pr-4 font-medium text-white">{vh.name}</td>
                    <td className="py-3 pr-4 text-slate-400">{vh.description || '—'}</td>
                    <td className="py-3 pr-4 text-right font-mono text-emerald-400">{parseFloat(vh.allocation_percentage).toFixed(2)}%</td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${vh.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                        {vh.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {vh.is_preloaded
                        ? <span className="text-xs text-blue-400">System</span>
                        : <span className="text-xs text-slate-500">Custom</span>}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(vh)} className="text-xs text-slate-400 hover:text-white transition">Edit</button>
                        <button onClick={() => setDeleteTarget(vh)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {editing ? 'Edit Vote Head' : 'Add Vote Head'}
            </h2>
            {saveError && <p className="mb-3 text-sm text-red-400">{saveError}</p>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Name</label>
                <input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Description</label>
                <input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Allocation % <span className="text-slate-600">(0 = not auto-split)</span></label>
                <input type="number" min="0" max="100" step="0.01" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.allocation_percentage} onChange={e => setForm(f => ({ ...f, allocation_percentage: e.target.value }))} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-400">Display Order</label>
                  <input type="number" min="0" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input type="checkbox" id="vh-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-emerald-500" />
                  <label htmlFor="vh-active" className="text-sm text-slate-300">Active</label>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Vote Head"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
