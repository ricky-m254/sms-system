import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalLibraryProfilePage() {
  const [borrowings, setBorrowings] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/library/borrowings/'),
      apiClient.get('/parent-portal/library/history/'),
      apiClient.get('/parent-portal/profile/'),
    ])
      .then(([b, h, p]) => {
        setBorrowings(b.data ?? [])
        setHistory(h.data ?? [])
        setProfile(p.data ?? null)
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Library & Profile</h1>
      </header>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        Borrowings: {borrowings.length} | Borrowing History: {history.length}
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        Parent: {profile?.first_name ?? ''} {profile?.last_name ?? ''} ({profile?.email ?? 'no email'})
      </section>
    </div>
  )
}

