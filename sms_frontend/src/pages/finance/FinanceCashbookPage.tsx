import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

type Entry = {
  id: number
  book_type: string
  entry_date: string
  entry_type: string
  reference: string
  description: string
  amount_in: string
  amount_out: string
  running_balance: string
  is_auto: boolean
}

type Summary = {
  cash: { total_in: number; total_out: number; closing_balance: number; opening_balance: number; entry_count: number }
  bank: { total_in: number; total_out: number; closing_balance: number; opening_balance: number; entry_count: number }
}

type FormState = {
  book_type: string
  entry_date: string
  entry_type: string
  reference: string
  description: string
  amount_in: string
  amount_out: string
}

const blankForm: FormState = {
  book_type: 'CASH',
  entry_date: new Date().toISOString().slice(0, 10),
  entry_type: 'RECEIPT',
  reference: '',
  description: '',
  amount_in: '',
  amount_out: '',
}

const fmt = (v: number | string) => parseFloat(String(v) || '0').toLocaleString('en-KE', { minimumFractionDigits: 2 })

export default function FinanceCashbookPage() {
  const [activeBook, setActiveBook] = useState<'CASH' | 'BANK'>('CASH')
  const [entries, setEntries] = useState<Entry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = async () => {
    setLoading(true)
    const params: Record<string, string> = { book_type: activeBook }
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    const [entriesRes, summaryRes] = await Promise.all([
      apiClient.get('/api/finance/cashbook/', { params }),
      apiClient.get('/api/finance/cashbook/summary/'),
    ])
    setEntries(entriesRes.data.results ?? entriesRes.data)
    setSummary(summaryRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [activeBook, dateFrom, dateTo])

  const openCreate = () => {
    setForm({ ...blankForm, book_type: activeBook })
    setSaveError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    const payload: Record<string, unknown> = {
      book_type: form.book_type,
      entry_date: form.entry_date,
      entry_type: form.entry_type,
      reference: form.reference,
      description: form.description,
      amount_in: form.amount_in || '0',
      amount_out: form.amount_out || '0',
    }
    try {
      await apiClient.post('/api/finance/cashbook/', payload)
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data as Record<string, unknown>).flat()
        setSaveError(msgs.join(' '))
      } else {
        setSaveError('Failed to save entry.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await apiClient.delete(`/api/finance/cashbook/${deleteTarget.id}/`)
    setDeleteTarget(null)
    load()
  }

  const activeSummary = summary?.[activeBook.toLowerCase() as 'cash' | 'bank']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cashbook & Bankbook</h1>
          <p className="text-gray-500 text-sm mt-1">Daily transaction ledger with running balances</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Add Entry
        </button>
      </div>

      <div className="flex gap-2">
        {(['CASH', 'BANK'] as const).map(bt => (
          <button
            key={bt}
            onClick={() => setActiveBook(bt)}
            className={`px-5 py-2 rounded-lg text-sm font-medium border transition ${activeBook === bt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            {bt === 'CASH' ? 'Cashbook' : 'Bankbook'}
          </button>
        ))}
      </div>

      {activeSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Opening Balance', value: activeSummary.opening_balance, color: 'text-gray-700' },
            { label: 'Total Receipts', value: activeSummary.total_in, color: 'text-green-700' },
            { label: 'Total Payments', value: activeSummary.total_out, color: 'text-red-600' },
            { label: 'Closing Balance', value: activeSummary.closing_balance, color: 'text-blue-700' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-xl font-bold mt-1 ${card.color}`}>KES {fmt(card.value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-sm text-gray-500 hover:text-gray-700 underline">Clear</button>
        )}
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">In (KES)</th>
                <th className="px-4 py-3 text-right font-medium">Out (KES)</th>
                <th className="px-4 py-3 text-right font-medium">Balance (KES)</th>
                <th className="px-4 py-3 text-center font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No entries yet for this period.</td></tr>
              )}
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{e.entry_date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      e.entry_type === 'RECEIPT' ? 'bg-green-100 text-green-700' :
                      e.entry_type === 'EXPENSE' ? 'bg-red-100 text-red-600' :
                      e.entry_type === 'OPENING' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {e.entry_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{e.reference || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{e.description}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-mono">{parseFloat(e.amount_in) > 0 ? fmt(e.amount_in) : ''}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-mono">{parseFloat(e.amount_out) > 0 ? fmt(e.amount_out) : ''}</td>
                  <td className="px-4 py-3 text-right text-blue-700 font-mono font-semibold">{fmt(e.running_balance)}</td>
                  <td className="px-4 py-3 text-center">
                    {e.is_auto ? <span className="text-xs text-gray-400">Auto</span> : <span className="text-xs text-blue-600">Manual</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!e.is_auto && (
                      <button onClick={() => setDeleteTarget(e)} className="text-red-500 hover:underline text-xs">Delete</button>
                    )}
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
            <h2 className="text-lg font-semibold text-gray-900">Add Cashbook Entry</h2>
            {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.book_type} onChange={e => setForm(f => ({ ...f, book_type: e.target.value }))}>
                    <option value="CASH">Cashbook</option>
                    <option value="BANK">Bankbook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.entry_type} onChange={e => setForm(f => ({ ...f, entry_type: e.target.value }))}>
                    <option value="OPENING">Opening Balance</option>
                    <option value="RECEIPT">Receipt</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount In (KES)</label>
                  <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.amount_in} onChange={e => setForm(f => ({ ...f, amount_in: e.target.value, amount_out: '' }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Out (KES)</label>
                  <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.amount_out} onChange={e => setForm(f => ({ ...f, amount_out: e.target.value, amount_in: '' }))} />
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
        title="Delete Entry"
        message={`Delete the entry "${deleteTarget?.description}"? This will recompute all running balances.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
