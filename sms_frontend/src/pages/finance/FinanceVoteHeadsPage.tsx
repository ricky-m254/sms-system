import { useEffect, useState } from 'react'
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

const blank: FormState = {
  name: '',
  description: '',
  allocation_percentage: '0.00',
  is_active: true,
  order: 0,
}

export default function FinanceVoteHeadsPage() {
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
    apiClient.get('/api/finance/vote-heads/').then(r => {
      setRows(r.data.results ?? r.data)
      setLoading(false)
    }).catch(() => {
      setError('Failed to load vote heads.')
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(blank)
    setSaveError('')
    setShowForm(true)
  }

  const openEdit = (vh: VoteHead) => {
    setEditing(vh)
    setForm({
      name: vh.name,
      description: vh.description,
      allocation_percentage: vh.allocation_percentage,
      is_active: vh.is_active,
      order: vh.order,
    })
    setSaveError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    const payload = {
      name: form.name,
      description: form.description,
      allocation_percentage: form.allocation_percentage,
      is_active: form.is_active,
      order: form.order,
    }
    try {
      if (editing) {
        await apiClient.patch(`/api/finance/vote-heads/${editing.id}/`, payload)
      } else {
        await apiClient.post('/api/finance/vote-heads/', payload)
      }
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data as Record<string, unknown>).flat()
        setSaveError(msgs.join(' '))
      } else {
        setSaveError('Failed to save vote head.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await apiClient.delete(`/api/finance/vote-heads/${deleteTarget.id}/`)
    setDeleteTarget(null)
    load()
  }

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg('')
    try {
      const r = await apiClient.post('/api/finance/vote-heads/seed-defaults/')
      setSeedMsg(r.data.message || 'Done.')
      load()
    } catch {
      setSeedMsg('Seeding failed.')
    } finally {
      setSeeding(false)
    }
  }

  const totalPct = rows.reduce((s, vh) => s + parseFloat(vh.allocation_percentage || '0'), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vote Heads</h1>
          <p className="text-gray-500 text-sm mt-1">
            Define allocation categories for payments (Tuition, Exam, Medical, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {seeding ? 'Seeding…' : 'Seed Defaults'}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            + Add Vote Head
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 text-sm">
          {seedMsg}
        </div>
      )}

      {totalPct > 0 && (
        <div className={`rounded-lg px-4 py-2 text-sm border ${Math.abs(totalPct - 100) < 0.01 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
          Total allocation: <strong>{totalPct.toFixed(2)}%</strong>
          {Math.abs(totalPct - 100) < 0.01 ? ' — fully allocated' : ' — allocations should sum to 100%'}
        </div>
      )}

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Allocation %</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Preloaded</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No vote heads yet. Click &quot;Seed Defaults&quot; to add the standard set.</td></tr>
              )}
              {rows.map(vh => (
                <tr key={vh.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{vh.order}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{vh.name}</td>
                  <td className="px-4 py-3 text-gray-500">{vh.description || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-blue-700">{parseFloat(vh.allocation_percentage).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${vh.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {vh.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {vh.is_preloaded ? <span className="text-blue-600 text-xs font-medium">System</span> : <span className="text-gray-400 text-xs">Custom</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(vh)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => setDeleteTarget(vh)} className="text-red-500 hover:underline text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editing ? 'Edit Vote Head' : 'Add Vote Head'}
            </h2>
            {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allocation % <span className="text-gray-400 font-normal">(0 = not auto-split)</span></label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.allocation_percentage}
                  onChange={e => setForm(f => ({ ...f, allocation_percentage: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <input
                    type="checkbox"
                    id="vh-active"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="vh-active" className="text-sm text-gray-700">Active</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Vote Head"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
