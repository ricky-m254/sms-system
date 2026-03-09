import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import BackButton from '../../components/BackButton'
import PrintButton from '../../components/PrintButton'

type OptionalCharge = {
  id: number
  name: string
  description: string
  category: string
  amount: string
  academic_year: number | null
  term: number | null
  academic_year_name?: string
  term_name?: string
  is_active: boolean
  created_at: string
}

type StudentOptionalCharge = {
  id: number
  student: number
  student_name?: string
  student_admission_number?: string
  optional_charge: number
  is_paid: boolean
  assigned_at: string
}

type AcademicYear = { id: number; name: string }
type Term = { id: number; name: string }
type Student = { id: number; first_name: string; last_name: string; admission_number: string }

const CATEGORIES = [
  { value: 'UNIFORM', label: 'Uniform', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'TRIP', label: 'Trip', color: 'bg-purple-500/20 text-purple-300' },
  { value: 'BOOKS', label: 'Books', color: 'bg-amber-500/20 text-amber-300' },
  { value: 'ACTIVITY', label: 'Activity', color: 'bg-pink-500/20 text-pink-300' },
  { value: 'TRANSPORT', label: 'Transport', color: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'MEALS', label: 'Meals', color: 'bg-orange-500/20 text-orange-300' },
  { value: 'OTHER', label: 'Other', color: 'bg-slate-500/20 text-slate-300' },
]

export default function FinanceOptionalChargesPage() {
  const [charges, setCharges] = useState<OptionalCharge[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCharge, setEditingCharge] = useState<OptionalCharge | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignTarget, setAssignTarget] = useState<OptionalCharge | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [assigning, setAssigning] = useState(false)

  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [assignedStudents, setAssignedStudents] = useState<StudentOptionalCharge[]>([])
  const [loadingAssigned, setLoadingAssigned] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    amount: '',
    academic_year: '',
    term: '',
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [chargesRes, yearsRes, termsRes, studentsRes] = await Promise.all([
        apiClient.get('/finance/optional-charges/'),
        apiClient.get('/academics/years/'),
        apiClient.get('/finance/terms/'),
        apiClient.get('/students/?page_size=1000'),
      ])
      setCharges(chargesRes.data.results || chargesRes.data)
      setYears(yearsRes.data.results || yearsRes.data)
      setTerms(termsRes.data.results || termsRes.data)
      setStudents(studentsRes.data.results || studentsRes.data)
    } catch (error) {
      console.error('Failed to load optional charges data', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        academic_year: form.academic_year || null,
        term: form.term || null,
        amount: parseFloat(form.amount),
      }
      if (editingCharge) {
        await apiClient.patch(`/finance/optional-charges/${editingCharge.id}/`, payload)
      } else {
        await apiClient.post('/finance/optional-charges/', payload)
      }
      setShowForm(false)
      setEditingCharge(null)
      loadData()
    } catch (error) {
      console.error('Failed to save optional charge', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (charge: OptionalCharge) => {
    setEditingCharge(charge)
    setForm({
      name: charge.name,
      description: charge.description,
      category: charge.category,
      amount: charge.amount.toString(),
      academic_year: charge.academic_year?.toString() || '',
      term: charge.term?.toString() || '',
      is_active: charge.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this optional charge?')) return
    try {
      await apiClient.delete(`/finance/optional-charges/${id}/`)
      loadData()
    } catch (error) {
      console.error('Failed to delete charge', error)
    }
  }

  const handleAssign = async () => {
    if (!assignTarget || selectedStudents.length === 0) return
    setAssigning(true)
    try {
      await Promise.all(
        selectedStudents.map((studentId) =>
          apiClient.post('/finance/student-optional-charges/', {
            student: studentId,
            optional_charge: assignTarget.id,
          })
        )
      )
      setShowAssignForm(false)
      setAssignTarget(null)
      setSelectedStudents([])
      if (expandedRow === assignTarget.id) {
          fetchAssignedStudents(assignTarget.id)
      }
    } catch (error) {
      console.error('Failed to assign students', error)
      alert('Some assignments may have failed (possibly already assigned).')
    } finally {
      setAssigning(false)
    }
  }

  const fetchAssignedStudents = async (chargeId: number) => {
      setLoadingAssigned(true)
      try {
          const res = await apiClient.get(`/finance/student-optional-charges/?optional_charge=${chargeId}`)
          setAssignedStudents(res.data.results || res.data)
      } catch (error) {
          console.error('Failed to fetch assigned students', error)
      } finally {
          setLoadingAssigned(false)
      }
  }

  const toggleRow = (chargeId: number) => {
      if (expandedRow === chargeId) {
          setExpandedRow(null)
          setAssignedStudents([])
      } else {
          setExpandedRow(chargeId)
          fetchAssignedStudents(chargeId)
      }
  }

  const formatCurrency = (amount: string | number) => {
    return `Ksh ${parseFloat(amount.toString()).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <BackButton to="/modules/finance" label="Back to Finance" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Optional Charges</h1>
            <p className="text-sm text-slate-400 text-print-black">Manage school uniforms, trips, books and other optional fees</p>
          </div>
          <div className="flex gap-3 no-print">
            <PrintButton />
            <button
              onClick={() => {
                setEditingCharge(null)
                setForm({
                  name: '',
                  description: '',
                  category: 'OTHER',
                  amount: '',
                  academic_year: '',
                  term: '',
                  is_active: true,
                })
                setShowForm(true)
              }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition"
            >
              + Create Charge
            </button>
          </div>
        </div>
      </header>

      <main className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden print:border-none print:bg-transparent">
        <table className="w-full text-sm text-slate-300 print:text-black">
          <thead className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 print:bg-gray-100 print:text-gray-700">
            <tr>
              <th className="px-6 py-4 text-left font-medium">Name & Category</th>
              <th className="px-6 py-4 text-right font-medium">Amount</th>
              <th className="px-6 py-4 text-left font-medium">Academic Period</th>
              <th className="px-6 py-4 text-center font-medium">Status</th>
              <th className="px-6 py-4 text-right font-medium no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 print:divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading optional charges...</td></tr>
            ) : charges.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No optional charges found.</td></tr>
            ) : (
              charges.map((charge) => (
                <React.Fragment key={charge.id}>
                  <tr className="group hover:bg-slate-800/30 transition cursor-pointer" onClick={() => toggleRow(charge.id)}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white print:text-black">{charge.name}</div>
                      <div className="mt-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${CATEGORIES.find(c => c.value === charge.category)?.color}`}>
                          {charge.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400 print:text-black">
                      {formatCurrency(charge.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {charge.academic_year_name || 'All Years'}
                      {charge.term_name && <span className="block text-xs italic">{charge.term_name}</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs ${charge.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {charge.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right no-print">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setAssignTarget(charge)
                            setShowAssignForm(true)
                          }}
                          className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => handleEdit(charge)}
                          className="text-slate-400 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(charge.id)}
                          className="text-red-400/60 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === charge.id && (
                    <tr className="bg-slate-950/40 no-print">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="rounded-xl border border-slate-800 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-slate-200">Students Assigned to {charge.name}</h3>
                                <button 
                                    onClick={() => { setAssignTarget(charge); setShowAssignForm(true); }}
                                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition"
                                >
                                    + Assign More
                                </button>
                            </div>
                            {loadingAssigned ? (
                                <p className="text-xs text-slate-500">Loading assigned students...</p>
                            ) : assignedStudents.length === 0 ? (
                                <p className="text-xs text-slate-500 italic text-center py-4">No students assigned to this charge yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {assignedStudents.map((assignment) => (
                                        <div key={assignment.id} className="flex items-center justify-between rounded-lg bg-slate-900 p-2 text-xs border border-slate-800">
                                            <div>
                                                <p className="font-medium text-slate-200">{assignment.student_name}</p>
                                                <p className="text-[10px] text-slate-500">{assignment.student_admission_number}</p>
                                            </div>
                                            {assignment.is_paid ? (
                                                <span className="text-[10px] text-emerald-400">Paid</span>
                                            ) : (
                                                <span className="text-[10px] text-slate-500 italic">Unpaid</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </main>

      {/* Charge Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-display font-bold text-white mb-6">
              {editingCharge ? 'Edit Optional Charge' : 'Create Optional Charge'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Charge Name</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="e.g. School Uniform Set"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Amount (Ksh)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Academic Year</label>
                  <select
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">All Years</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Term</label>
                  <select
                    value={form.term}
                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">All Terms</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                />
                <span className="text-sm text-slate-300">Is Active</span>
              </label>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCharge ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign to Students Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-display font-bold text-white mb-2">Assign "{assignTarget?.name}"</h2>
            <p className="text-sm text-slate-400 mb-6">Select students to assign this charge to.</p>
            
            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {students.map((student) => (
                        <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded-lg cursor-pointer transition">
                            <input
                                type="checkbox"
                                checked={selectedStudents.includes(student.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedStudents([...selectedStudents, student.id])
                                    } else {
                                        setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                                    }
                                }}
                                className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                            />
                            <div className="text-xs">
                                <p className="font-medium text-slate-200">{student.first_name} {student.last_name}</p>
                                <p className="text-slate-500">{student.admission_number}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{selectedStudents.length} students selected</p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => { setShowAssignForm(false); setSelectedStudents([]); }}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={assigning || selectedStudents.length === 0}
                        className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition disabled:opacity-50"
                    >
                        {assigning ? 'Assigning...' : 'Assign Now'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
