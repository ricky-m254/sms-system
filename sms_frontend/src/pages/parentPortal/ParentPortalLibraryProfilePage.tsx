import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Borrowing = {
  id: number; book_title?: string; isbn?: string; due_date: string | null; borrowed_date?: string; status?: string
}
type HistoryItem = {
  id: number; book_title?: string; borrowed_date?: string; returned_date?: string
}
type Profile = { id: number; first_name: string; last_name: string; email: string; username: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function ParentPortalLibraryProfilePage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [bRes, hRes, pRes] = await Promise.all([
          apiClient.get<Borrowing[] | { results: Borrowing[] }>('/parent-portal/library/borrowings/'),
          apiClient.get<HistoryItem[] | { results: HistoryItem[] }>('/parent-portal/library/history/'),
          apiClient.get<Profile>('/parent-portal/profile/'),
        ])
        setBorrowings(asArray(bRes.data)); setHistory(asArray(hRes.data))
        setProfile(pRes.data ?? null)
      } catch { setError('Unable to load library profile.') }
      finally { setLoading(false) }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl glass-panel p-6">
        <h1 className="text-xl font-display font-semibold">Library & Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your child's library borrowings and your account profile.</p>
      </header>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Parent Profile</h2>
          {loading ? <p className="text-xs text-slate-400">Loading…</p> : profile ? (
            <div className="space-y-2 text-xs text-slate-300">
              <p><span className="text-slate-500">Name:</span> {profile.first_name} {profile.last_name}</p>
              <p><span className="text-slate-500">Email:</span> {profile.email || 'N/A'}</p>
              <p><span className="text-slate-500">Username:</span> {profile.username}</p>
            </div>
          ) : <p className="text-xs text-slate-500">No profile data.</p>}
        </section>

        <section className="lg:col-span-2 rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Active Borrowings ({borrowings.length})</h2>
          {loading ? <p className="text-xs text-slate-400">Loading…</p> : borrowings.length === 0 ? <p className="text-xs text-slate-500">No active borrowings.</p> : (
            <div className="space-y-2">
              {borrowings.map(b => {
                const days = daysUntil(b.due_date)
                const isOverdue = days !== null && days < 0
                return (
                  <div key={b.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{b.book_title || `Borrowing #${b.id}`}</p>
                      {b.due_date ? <p className="text-xs text-slate-400">Due: {new Date(b.due_date).toLocaleDateString()}</p> : null}
                    </div>
                    {days !== null ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isOverdue ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Borrowing History ({history.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-white/[0.07] text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Book</th>
                <th className="px-3 py-2 font-medium">Borrowed</th>
                <th className="px-3 py-2 font-medium">Returned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400">Loading…</td></tr> : history.map(h => (
                <tr key={h.id} className="hover:bg-slate-800/20">
                  <td className="px-3 py-2 text-slate-200">{h.book_title || `Item #${h.id}`}</td>
                  <td className="px-3 py-2 text-slate-400">{h.borrowed_date ? new Date(h.borrowed_date).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-2 text-emerald-400">{h.returned_date ? new Date(h.returned_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {!loading && history.length === 0 ? <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">No borrowing history.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

