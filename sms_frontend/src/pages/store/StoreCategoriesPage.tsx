import { useState } from 'react'
import { Tag, Plus, Edit2, Trash2, Package, ChevronRight } from 'lucide-react'
import PageHero from '../../components/PageHero'

type Category = {
  id: number
  name: string
  description: string
  itemCount: number
  color: string
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: 'Food Store', description: 'Kitchen ingredients, food supplies, beverages', itemCount: 312, color: 'emerald' },
  { id: 2, name: 'Office Supplies', description: 'Stationery, printer consumables, paper, pens', itemCount: 178, color: 'sky' },
  { id: 3, name: 'Laboratory Equipment', description: 'Scientific apparatus, chemicals, lab gloves', itemCount: 94, color: 'violet' },
  { id: 4, name: 'Cleaning Supplies', description: 'Detergents, mops, disinfectants, trash bags', itemCount: 57, color: 'amber' },
  { id: 5, name: 'Uniforms', description: 'Student uniforms, sports kits, staff attire', itemCount: 210, color: 'rose' },
  { id: 6, name: 'Maintenance Tools', description: 'Repair tools, electrical supplies, plumbing', itemCount: 83, color: 'orange' },
  { id: 7, name: 'IT Equipment', description: 'Computers, cables, peripherals, accessories', itemCount: 46, color: 'blue' },
  { id: 8, name: 'Books & Academic', description: 'Textbooks, exercise books, reference materials', itemCount: 260, color: 'teal' },
]

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  teal: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
}

const COLORS = ['emerald', 'sky', 'violet', 'amber', 'rose', 'orange', 'blue', 'teal']

export default function StoreCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: 'emerald' })
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  function openAdd() {
    setEditTarget(null)
    setForm({ name: '', description: '', color: 'emerald' })
    setShowModal(true)
  }

  function openEdit(cat: Category) {
    setEditTarget(cat)
    setForm({ name: cat.name, description: cat.description, color: cat.color })
    setShowModal(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (editTarget) {
      setCategories(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...form } : c))
    } else {
      const newCat: Category = {
        id: Date.now(),
        name: form.name.trim(),
        description: form.description.trim(),
        itemCount: 0,
        color: form.color,
      }
      setCategories(prev => [...prev, newCat])
    }
    setShowModal(false)
  }

  function handleDelete(cat: Category) {
    setCategories(prev => prev.filter(c => c.id !== cat.id))
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Stock Categories"
        subtitle="Classify and organise inventory items by category"
        icon={Tag}
        theme="emerald"
        stats={[
          { label: 'Total Categories', value: categories.length },
          { label: 'Total Items', value: categories.reduce((s, c) => s + c.itemCount, 0).toLocaleString() },
          { label: 'Active', value: categories.length },
        ]}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{categories.length} categories configured</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map(cat => (
          <div key={cat.id} className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`rounded-xl border px-3 py-1 text-xs font-semibold ${COLOR_MAP[cat.color] ?? COLOR_MAP.emerald}`}>
                  {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(cat)} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteTarget(cat)} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{cat.description || 'No description'}</p>
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/[0.06]">
              <Package size={14} className="text-slate-500" />
              <span className="text-sm text-slate-300">{cat.itemCount.toLocaleString()} items</span>
              <ChevronRight size={14} className="text-slate-600 ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-5">
            <h3 className="text-lg font-display font-semibold">{editTarget ? 'Edit Category' : 'Add Category'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. Food Store"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Brief description of this category"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Color Label</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${COLOR_MAP[c]} ${form.color === c ? 'ring-2 ring-white/30' : 'opacity-60 hover:opacity-100'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
                {editTarget ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-4">
            <h3 className="text-lg font-display font-semibold text-rose-400">Delete Category?</h3>
            <p className="text-sm text-slate-400">Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
