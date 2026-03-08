import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/client'

type Student = { id: number; first_name: string; last_name: string; admission_number: string }

type LedgerEntry = {
  date: string
  type: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT' | 'CARRY_FORWARD'
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  status?: string
  term?: string
}

type LedgerResponse = {
  student: { id: number; name: string; admission_number: string; class_name: string; current_term: string }
  entry_count: number
  closing_balance: number
  entries: LedgerEntry[]
}

const fmt = (v: number) => v.toLocaleString('en-KE', { minimumFractionDigits: 2 })

const typeTag = (t: string) => {
  if (t === 'INVOICE') return 'bg-blue-500/20 text-blue-300'
  if (t === 'PAYMENT') return 'bg-emerald-500/20 text-emerald-300'
  if (t === 'ADJUSTMENT') return 'bg-amber-500/20 text-amber-300'
  if (t === 'CARRY_FORWARD') return 'bg-purple-500/20 text-purple-300'
  return 'bg-slate-700 text-slate-300'
}

export default function FinanceStudentLedgerPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [students, setStudents] = useState<Student[]>([])
  const [terms, setTerms] = useState<{ id: number; name: string }[]>([])
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('student') || '')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    apiClient.get('/finance/ref/students/').then(r => setStudents(r.data.results ?? r.data))
    apiClient.get('/finance/terms/').then(r => setTerms(r.data.results ?? r.data))
  }, [])

  useEffect(() => {
    if (selectedStudent) loadLedger()
    else setLedger(null)
  }, [selectedStudent, selectedTerm, dateFrom, dateTo])

  const loadLedger = async () => {
    if (!selectedStudent) return
    setLoading(true); setError('')
    try {
      const params: Record<string, string> = {}
      if (selectedTerm) params.term = selectedTerm
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const r = await apiClient.get(`/finance/students/${selectedStudent}/ledger/`, { params })
      setLedger(r.data)
    } catch {
      setError('Failed to load ledger.')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentChange = (id: string) => {
    setSelectedStudent(id)
    setSearchParams(id ? { student: id } : {})
  }

  const filteredStudents = students.filter(s =>
    !query || `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(query.toLowerCase())
  )

  const printLedger = () => window.print()

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <button onClick={() => navigate('/modules/finance')} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition">
          ← Back to Finance
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Student Account Ledger</h1>
            <p className="mt-1 text-sm text-slate-400">Full financial statement per student — invoices, payments, adjustments, carry-forwards</p>
          </div>
          {ledger && (
            <button onClick={printLedger} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
              🖨 Print Statement
            </button>
          )}
        </div>
      </header>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <label className="mb-1 block text-xs text-slate-400">Search Student</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Name or admission number…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="mb-1 block text-xs text-slate-400">Student</label>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={selectedStudent}
              onChange={e => handleStudentChange(e.target.value)}
            >
              <option value="">— Select student —</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Term</label>
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
            >
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">From Date</label>
            <input type="date" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">To Date</label>
            <input type="date" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      {!selectedStudent && (
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 py-14 text-center text-slate-500">
          Select a student above to view their account ledger.
        </div>
      )}

      {loading && (
        <p className="col-span-12 text-slate-400 text-sm">Loading ledger…</p>
      )}

      {ledger && !loading && (
        <>
          <section className="col-span-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase text-slate-500">Student</p>
              <p className="mt-1 font-semibold text-white">{ledger.student.name}</p>
              <p className="text-xs text-slate-500">{ledger.student.admission_number}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase text-slate-500">Class</p>
              <p className="mt-1 font-semibold text-white">{ledger.student.class_name}</p>
              <p className="text-xs text-slate-500">{ledger.student.current_term}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase text-slate-500">Transactions</p>
              <p className="mt-1 text-xl font-bold text-white">{ledger.entry_count}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${ledger.closing_balance > 0 ? 'border-red-500/40 bg-red-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
              <p className="text-xs uppercase text-slate-400">Balance</p>
              <p className={`mt-1 text-xl font-bold font-mono ${ledger.closing_balance > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                KES {fmt(Math.abs(ledger.closing_balance))}
              </p>
              <p className="text-xs text-slate-500">{ledger.closing_balance > 0 ? 'Amount owing' : ledger.closing_balance < 0 ? 'Overpayment' : 'Settled'}</p>
            </div>
          </section>

          <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-white">Account Statement</h2>
            </div>
            {ledger.entries.length === 0 ? (
              <p className="py-10 text-center text-slate-500">No transactions found for the selected filters.</p>
            ) : (
              <table className="w-full text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-left">Reference</th>
                    <th className="px-5 py-3 text-left">Description</th>
                    <th className="px-5 py-3 text-right">Debit (KES)</th>
                    <th className="px-5 py-3 text-right">Credit (KES)</th>
                    <th className="px-5 py-3 text-right">Balance (KES)</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ledger.entries.map((entry, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3 text-slate-400">{entry.date}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeTag(entry.type)}`}>{entry.type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{entry.reference}</td>
                      <td className="px-5 py-3 text-slate-300">{entry.description}</td>
                      <td className="px-5 py-3 text-right font-mono text-red-400">{entry.debit > 0 ? fmt(entry.debit) : ''}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-400">{entry.credit > 0 ? fmt(entry.credit) : ''}</td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold ${entry.balance > 0 ? 'text-red-300' : entry.balance < 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {fmt(Math.abs(entry.balance))}{entry.balance < 0 ? ' CR' : entry.balance > 0 ? ' DR' : ''}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs text-slate-500">{entry.status || ''}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600 bg-slate-900/80">
                    <td colSpan={4} className="px-5 py-3 text-right text-xs text-slate-400 font-semibold">Closing Balance</td>
                    <td colSpan={4} className={`px-5 py-3 text-right font-mono font-bold text-base ${ledger.closing_balance > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                      KES {fmt(Math.abs(ledger.closing_balance))} {ledger.closing_balance > 0 ? 'DR' : ledger.closing_balance < 0 ? 'CR' : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        </>
      )}
    </section>
  )
}
