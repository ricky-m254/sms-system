import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'

type Member = {
  id: number
  member_id: string
  member_type: string
  status: string
  total_fines: string
}

export default function LibraryMembersPage() {
  const [rows, setRows] = useState<Member[]>([])
  const [memberCode, setMemberCode] = useState('')
  const [memberType, setMemberType] = useState('Student')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get<Member[]>('/library/members/')
      setRows(response.data ?? [])
      setError(null)
    } catch {
      setError('Members API unavailable.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createMember = async (event: FormEvent) => {
    event.preventDefault()
    if (!memberCode.trim()) return
    try {
      await apiClient.post('/library/members/', {
        member_id: memberCode.trim(),
        member_type: memberType,
      })
      setMemberCode('')
      await load()
    } catch {
      setError('Unable to create member.')
    }
  }

  const suspend = async (id: number) => {
    try {
      await apiClient.post(`/library/members/${id}/suspend/`)
      await load()
    } catch {
      setError('Unable to suspend member.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Member Management</h1>
        <p className="mt-2 text-sm text-slate-400">Register and manage borrowing privileges.</p>
      </header>

      <form onSubmit={createMember} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Register Member</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Member ID (e.g., LIB-1001)"
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
            value={memberType}
            onChange={(e) => setMemberType(e.target.value)}
          >
            <option>Student</option>
            <option>Staff</option>
            <option>Parent</option>
            <option>Alumni</option>
            <option>External</option>
          </select>
          <button type="submit" className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200">
            Create
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
      </form>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Member List</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Member ID</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Outstanding Fines</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-2 py-2">{row.member_id}</td>
                  <td className="px-2 py-2">{row.member_type}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">{row.total_fines ?? '0.00'}</td>
                  <td className="px-2 py-2">
                    <button
                      className="rounded-lg border border-rose-500/60 bg-rose-500/15 px-2 py-1 text-xs text-rose-200"
                      onClick={() => suspend(row.id)}
                    >
                      Suspend
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={5}>
                    No members yet.
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
