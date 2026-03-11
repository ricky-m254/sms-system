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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Hostel Allocations</h1>
          <p className="mt-1 text-sm text-slate-400">Track which students are assigned to which beds.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <UserPlus className="h-4 w-4" />
          New Allocation
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="flex items-center gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-300">
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Checked Out">Checked Out</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40">
              <th className="px-6 py-4 font-semibold text-slate-300">Student</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Dorm & Bed</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Term</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">Check-In</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading allocations...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No allocations found.</td></tr>
            ) : filtered.map(alloc => (
              <tr key={alloc.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 border border-slate-700">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-slate-200">{alloc.student_name || `Student #${alloc.student}`}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">{alloc.dormitory_name || '—'}</span>
                    <span className="text-xs text-slate-500">Bed: {alloc.bed_number || '—'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{alloc.term_name || '—'}</td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2 py-1 text-xs font-mono text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {alloc.check_in_date}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    alloc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {alloc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(alloc)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(alloc.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Allocation' : 'New Allocation'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Student *</label>
              <select value={form.student} onChange={e => setF('student', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{`${s.first_name} ${s.last_name}`.trim()} ({s.admission_number})</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Bed Space</label>
              <select value={form.bed} onChange={e => setF('bed', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <option value="">No bed assigned</option>
                {availableBeds.map(b => <option key={b.id} value={b.id}>{b.dormitory_name} — {b.bed_number}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Term</label>
              <select value={form.term} onChange={e => setF('term', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <option value="">No term</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Check-in Date *</label>
                <input type="date" value={form.check_in_date} onChange={e => setF('check_in_date', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Check-out Date</label>
                <input type="date" value={form.check_out_date} onChange={e => setF('check_out_date', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Status</label>
              <select value={form.status} onChange={e => setF('status', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <option value="Active">Active</option>
                <option value="Checked Out">Checked Out</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
