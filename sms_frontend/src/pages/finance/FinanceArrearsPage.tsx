import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type ArrearRow = {
  invoice_id: number
  invoice_number: string
  student_id: number
  student_name: string
  admission_number: string
  class_name: string
  term: string
  total_amount: number
  balance_due: number
  due_date: string
  status: string
}

type ClassGroup = {
  class_name: string
  student_count: number
  total_balance: number
  invoices: ArrearRow[]
}

type Term = { id: number; name: string }

type CarryForward = {
  id: number
  student_name: string
  student_admission_number: string
  from_term_name: string
  to_term_name: string
  amount: string
  notes: string
  created_at: string
}

type CFForm = {
  student: string
  from_term: string
  to_term: string
  amount: string
  notes: string
}

const fmt = (v: number) => v.toLocaleString('en-KE', { minimumFractionDigits: 2 })

export default function FinanceArrearsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [groupBy, setGroupBy] = useState<'student' | 'class'>('student')
  const [rows, setRows] = useState<ArrearRow[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [totalBalance, setTotalBalance] = useState(0)
  const [tab, setTab] = useState<'arrears' | 'carry-forward'>('arrears')
  const [carryForwards, setCarryForwards] = useState<CarryForward[]>([])
  const [cfLoading, setCfLoading] = useState(false)
  const [showCfForm, setShowCfForm] = useState(false)
  const [cfForm, setCfForm] = useState<CFForm>({ student: '', from_term: '', to_term: '', amount: '', notes: '' })
  const [cfSaving, setCfSaving] = useState(false)
  const [cfError, setCfError] = useState('')
  const [students, setStudents] = useState<{ id: number; name: string; admission_number: string }[]>([])

  useEffect(() => {
    apiClient.get('/api/finance/terms/').then(r => setTerms(r.data.results ?? r.data))
    apiClient.get('/api/finance/ref/students/').then(r => setStudents((r.data.results ?? r.data).map((s: { id: number; first_name: string; last_name: string; admission_number: string }) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      admission_number: s.admission_number,
    })))
    )
  }, [])

  const loadArrears = async () => {
    setLoading(true)
    const params: Record<string, string> = { group_by: groupBy }
    if (selectedTerm) params.term = selectedTerm
    const r = await apiClient.get('/api/finance/reports/arrears/', { params })
    if (groupBy === 'class') {
      setClassGroups(r.data.data || [])
      setRows([])
      setTotalBalance((r.data.data || []).reduce((s: number, g: ClassGroup) => s + g.total_balance, 0))
    } else {
      setRows(r.data.results || [])
      setClassGroups([])
      setTotalBalance((r.data.results || []).reduce((s: number, row: ArrearRow) => s + row.balance_due, 0))
    }
    setLoading(false)
  }

  const loadCarryForwards = async () => {
    setCfLoading(true)
    const r = await apiClient.get('/api/finance/carry-forwards/')
    setCarryForwards(r.data.results ?? r.data)
    setCfLoading(false)
  }

  useEffect(() => {
    if (tab === 'arrears') loadArrears()
    else loadCarryForwards()
  }, [tab, selectedTerm, groupBy])

  const handleCfSave = async () => {
    setCfSaving(true)
    setCfError('')
    try {
      await apiClient.post('/api/finance/carry-forwards/', {
        student: parseInt(cfForm.student),
        from_term: parseInt(cfForm.from_term),
        to_term: parseInt(cfForm.to_term),
        amount: cfForm.amount,
        notes: cfForm.notes,
      })
      setShowCfForm(false)
      loadCarryForwards()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data as Record<string, unknown>).flat()
        setCfError(msgs.join(' '))
      } else {
        setCfError('Failed to save carry forward.')
      }
    } finally {
      setCfSaving(false)
    }
  }

  const statusColor = (s: string) => {
    if (s === 'OVERDUE') return 'bg-red-100 text-red-700'
    if (s === 'PARTIALLY_PAID') return 'bg-yellow-100 text-yellow-700'
    return 'bg-orange-100 text-orange-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Arrears Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track outstanding balances and carry forwards between terms</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(['arrears', 'carry-forward'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'arrears' ? 'Arrears List' : 'Carry Forwards'}
          </button>
        ))}
      </div>

      {tab === 'arrears' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Term:</span>
              <select className="border border-gray-300 rounded px-2 py-1 text-sm" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                <option value="">All Terms</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Group by:</span>
              <select className="border border-gray-300 rounded px-2 py-1 text-sm" value={groupBy} onChange={e => setGroupBy(e.target.value as 'student' | 'class')}>
                <option value="student">Student</option>
                <option value="class">Class</option>
              </select>
            </div>
            {totalBalance > 0 && (
              <div className="ml-auto bg-red-50 border border-red-200 rounded-lg px-4 py-1.5 text-sm">
                <span className="text-red-600 font-medium">Total Outstanding: KES {fmt(totalBalance)}</span>
              </div>
            )}
          </div>

          {loading && <p className="text-gray-500">Loading…</p>}

          {!loading && groupBy === 'student' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Invoice</th>
                    <th className="px-4 py-3 text-left font-medium">Student</th>
                    <th className="px-4 py-3 text-left font-medium">Adm. No.</th>
                    <th className="px-4 py-3 text-left font-medium">Class</th>
                    <th className="px-4 py-3 text-left font-medium">Term</th>
                    <th className="px-4 py-3 text-right font-medium">Billed</th>
                    <th className="px-4 py-3 text-right font-medium">Balance Due</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">No outstanding arrears found.</td></tr>
                  )}
                  {rows.map(row => (
                    <tr key={row.invoice_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.invoice_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.student_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.admission_number}</td>
                      <td className="px-4 py-3 text-gray-600">{row.class_name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.term}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(row.total_amount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">{fmt(row.balance_due)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(row.status)}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && groupBy === 'class' && (
            <div className="space-y-4">
              {classGroups.length === 0 && <p className="text-gray-400 text-center py-8">No outstanding arrears found.</p>}
              {classGroups.map(group => (
                <div key={group.class_name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div>
                      <span className="font-semibold text-gray-800">{group.class_name}</span>
                      <span className="text-gray-500 text-sm ml-3">{group.student_count} student{group.student_count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-red-600 font-semibold">KES {fmt(group.total_balance)}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Student</th>
                        <th className="px-4 py-2 text-left font-medium">Term</th>
                        <th className="px-4 py-2 text-right font-medium">Balance Due</th>
                        <th className="px-4 py-2 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.invoices.map(row => (
                        <tr key={row.invoice_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-800">{row.student_name} <span className="text-gray-400 text-xs">({row.admission_number})</span></td>
                          <td className="px-4 py-2 text-gray-600">{row.term}</td>
                          <td className="px-4 py-2 text-right text-red-600 font-mono font-semibold">{fmt(row.balance_due)}</td>
                          <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(row.status)}`}>{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'carry-forward' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Record arrear balances carried forward from one term to the next.</p>
            <button onClick={() => { setCfForm({ student: '', from_term: '', to_term: '', amount: '', notes: '' }); setCfError(''); setShowCfForm(true) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              + Add Carry Forward
            </button>
          </div>

          {cfLoading && <p className="text-gray-500">Loading…</p>}

          {!cfLoading && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Student</th>
                    <th className="px-4 py-3 text-left font-medium">Adm. No.</th>
                    <th className="px-4 py-3 text-left font-medium">From Term</th>
                    <th className="px-4 py-3 text-left font-medium">To Term</th>
                    <th className="px-4 py-3 text-right font-medium">Amount (KES)</th>
                    <th className="px-4 py-3 text-left font-medium">Notes</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carryForwards.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No carry forwards recorded yet.</td></tr>
                  )}
                  {carryForwards.map(cf => (
                    <tr key={cf.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{cf.student_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{cf.student_admission_number}</td>
                      <td className="px-4 py-3 text-gray-600">{cf.from_term_name}</td>
                      <td className="px-4 py-3 text-gray-600">{cf.to_term_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">{fmt(parseFloat(cf.amount))}</td>
                      <td className="px-4 py-3 text-gray-500">{cf.notes || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(cf.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showCfForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Add Balance Carry Forward</h2>
                {cfError && <p className="text-red-500 text-sm">{cfError}</p>}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={cfForm.student} onChange={e => setCfForm(f => ({ ...f, student: e.target.value }))}>
                      <option value="">Select student…</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admission_number})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Term</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={cfForm.from_term} onChange={e => setCfForm(f => ({ ...f, from_term: e.target.value }))}>
                        <option value="">Select…</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To Term</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={cfForm.to_term} onChange={e => setCfForm(f => ({ ...f, to_term: e.target.value }))}>
                        <option value="">Select…</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
                    <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={cfForm.amount} onChange={e => setCfForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={cfForm.notes} onChange={e => setCfForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCfForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleCfSave} disabled={cfSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {cfSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
