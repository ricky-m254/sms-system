import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Calendar, User, UserPlus, Pencil, Trash2, X } from 'lucide-react'

interface Allocation {
  id: number
  student: number
  student_name: string
  bed: number | null
  dormitory_name: string
  bed_number: string
  term: number | null
  term_name: string
  check_in_date: string
  check_out_date: string | null
  status: 'Active' | 'Checked Out'
  notes: string
}

interface Student { id: number; first_name: string; last_name: string; admission_number: string }
interface BedSpace { id: number; dormitory_name: string; bed_number: string; is_occupied: boolean; is_active: boolean; dormitory: number }
interface Term { id: number; name: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const emptyForm = () => ({
  student: '', bed: '', term: '',
  check_in_date: new Date().toISOString().split('T')[0],
  check_out_date: '', status: 'Active', notes: ''
})

export default function HostelAllocationsPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [beds, setBeds] = useState<BedSpace[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Allocation | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [ra, rs, rb, rt] = await Promise.all([
        apiClient.get('/hostel/allocations/'),
        apiClient.get('/students/'),
        apiClient.get('/hostel/beds/'),
        apiClient.get('/academics/terms/'),
      ])
      setAllocations(asArray(ra.data))
      setStudents(asArray(rs.data))
      setBeds(asArray(rb.data))
      setTerms(asArray(rt.data))
    } catch { setError('Unable to load allocations.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filtered = filterStatus ? allocations.filter(a => a.status === filterStatus) : allocations

  const openCreate = () => {
    setEditing(null); setForm(emptyForm()); setError(null); setModal(true)
  }

  const openEdit = (a: Allocation) => {
    setEditing(a)
    setForm({
      student: String(a.student),
      bed: a.bed ? String(a.bed) : '',
      term: a.term ? String(a.term) : '',
      check_in_date: a.check_in_date,
      check_out_date: a.check_out_date || '',
      status: a.status,
      notes: a.notes || '',
    })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!form.student || !form.check_in_date) { setError('Student and check-in date are required.'); return }
    setSaving(true); setError(null)
    try {
      const payload: any = {
        student: Number(form.student),
        bed: form.bed ? Number(form.bed) : null,
        term: form.term ? Number(form.term) : null,
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date || null,
        status: form.status,
        notes: form.notes.trim(),
      }
      if (editing) {
        await apiClient.put(`/hostel/allocations/${editing.id}/`, payload)
        setNotice('Allocation updated.')
      } else {
        await apiClient.post('/hostel/allocations/', payload)
        setNotice('Allocation created.')
      }
      setModal(false)
      await load()
    } catch { setError('Unable to save allocation.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this allocation?')) return
    try { await apiClient.delete(`/hostel/allocations/${id}/`); setNotice('Allocation deleted.'); await load() }
    catch { setError('Unable to delete allocation.') }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const availableBeds = beds.filter(b => b.is_active && (!b.is_occupied || (editing && String(editing.bed) === String(b.id))))

  return (
    <div className="space-y-6">
      <PageHero
        badge="HOSTEL"
        badgeColor="sky"
        title="Hostel Allocations"
        subtitle="Track which students are assigned to which beds."
        icon="🏠"
      />

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Status</label>
              <select value={form.status} onChange={e => setF('status', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="Active">Active</option>
                <option value="Checked Out">Checked Out</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
