import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'

type Tx = {
  id: number
  member_member_id: string
  copy_accession_number: string
  resource_title: string
  due_date: string | null
  return_date: string | null
}

export default function LibraryCirculationPage() {
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [memberId, setMemberId] = useState('')
  const [copyId, setCopyId] = useState('')
  const [txId, setTxId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<Tx[]>('/library/circulation/transactions/')
      setTransactions(response.data ?? [])
      setError(null)
    } catch {
      setError('Circulation API unavailable.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const issue = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await apiClient.post('/library/circulation/issue/', { member: Number(memberId), copy: Number(copyId) })
      setMemberId('')
      setCopyId('')
      await load()
    } catch {
      setError('Issue request failed.')
    }
  }

  const returnTx = async () => {
    if (!txId) return
    try {
      await apiClient.post('/library/circulation/return/', { transaction: Number(txId) })
      setTxId('')
      await load()
    } catch {
      setError('Return request failed.')
    }
  }

  const renewTx = async () => {
    if (!txId) return
    try {
      await apiClient.post('/library/circulation/renew/', { transaction: Number(txId) })
      setTxId('')
      await load()
    } catch {
      setError('Renew request failed.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Circulation Management</h1>
        <p className="mt-2 text-sm text-slate-400">Issue, return, and renew workflows.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <form onSubmit={issue} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-sm font-semibold text-slate-200">Issue Resource</h2>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              placeholder="Member ID (numeric)"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              placeholder="Copy ID (numeric)"
              value={copyId}
              onChange={(e) => setCopyId(e.target.value)}
            />
            <button type="submit" className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200">
              Issue
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-sm font-semibold text-slate-200">Return / Renew</h2>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
              placeholder="Transaction ID"
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={returnTx} className="rounded-xl border border-sky-500/60 bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-200">
                Return
              </button>
              <button onClick={renewTx} className="rounded-xl border border-amber-500/60 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-200">
                Renew
              </button>
            </div>
          </div>
          {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Transactions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Member</th>
                <th className="px-2 py-2">Copy</th>
                <th className="px-2 py-2">Resource</th>
                <th className="px-2 py-2">Due</th>
                <th className="px-2 py-2">Returned</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.member_member_id || '-'}</td>
                  <td className="px-2 py-2">{row.copy_accession_number || '-'}</td>
                  <td className="px-2 py-2">{row.resource_title || '-'}</td>
                  <td className="px-2 py-2">{row.due_date || '-'}</td>
                  <td className="px-2 py-2">{row.return_date ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {!transactions.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={6}>
                    No transactions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
