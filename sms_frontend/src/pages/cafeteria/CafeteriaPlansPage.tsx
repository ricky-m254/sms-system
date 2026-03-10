import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

type MealPlan = { id: number; name: string; description: string; price_per_day: string; is_active: boolean }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const fmt = (v: string | number) =>
  `Ksh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

export default function CafeteriaPlansPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pricePerDay, setPricePerDay] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<MealPlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<MealPlan[] | { results: MealPlan[] }>('/cafeteria/meal-plans/')
      setPlans(asArray(res.data))
    } catch { setError('Unable to load meal plans.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!name.trim() || !pricePerDay) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/cafeteria/meal-plans/', { name: name.trim(), description, price_per_day: Number(pricePerDay), is_active: isActive })
      setName(''); setDescription(''); setPricePerDay(''); setIsActive(true)
      setShowForm(false); setNotice('Meal plan created.')
      await load()
    } catch { setError('Unable to create meal plan.') }
    finally { setSaving(false) }
  }

  const toggleActive = async (plan: MealPlan) => {
    try {
      await apiClient.patch(`/cafeteria/meal-plans/${plan.id}/`, { is_active: !plan.is_active })
      await load()
    } catch { setError('Unable to update meal plan.') }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try { await apiClient.delete(`/cafeteria/meal-plans/${deleteTarget.id}/`); setDeleteTarget(null); await load() }
    catch { setDeleteError('Unable to delete meal plan.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Meal Plans</h1>
          <p className="mt-1 text-sm text-slate-400">Configure different meal plans and pricing.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition">
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {showForm ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">New Meal Plan</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Plan name *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} placeholder="Price per day (Ksh) *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-emerald-500" />
              Active
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
          </div>
          <button onClick={save} disabled={saving || !name.trim() || !pricePerDay} className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Create Plan'}</button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <p className="col-span-3 text-sm text-slate-400">Loading…</p> : plans.map(p => (
          <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-100">{p.name}</p>
                {p.description ? <p className="mt-1 text-xs text-slate-400 line-clamp-2">{p.description}</p> : null}
                <p className="mt-2 text-lg font-bold text-emerald-400">{fmt(p.price_per_day)}<span className="text-xs font-normal text-slate-500">/day</span></p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/40 text-slate-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="mt-4 flex gap-3 text-xs">
              <button onClick={() => toggleActive(p)} className="font-semibold text-sky-400 hover:text-sky-300">{p.is_active ? 'Deactivate' : 'Activate'}</button>
              <button onClick={() => setDeleteTarget(p)} className="font-semibold text-rose-400 hover:text-rose-300">Delete</button>
            </div>
          </div>
        ))}
        {!loading && plans.length === 0 ? <p className="col-span-3 text-sm text-slate-500">No meal plans yet.</p> : null}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Meal Plan" description={`Delete "${deleteTarget?.name}"? All associated menus and enrollments will be affected.`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
