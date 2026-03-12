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
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Meal Plans"
        subtitle="Configure different meal plans and pricing."
        icon="🍽️"
      />
        ))}
        {!loading && plans.length === 0 ? <p className="col-span-3 text-sm text-slate-500">No meal plans yet.</p> : null}
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Delete Meal Plan" description={`Delete "${deleteTarget?.name}"? All associated menus and enrollments will be affected.`} confirmLabel="Delete" isProcessing={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
