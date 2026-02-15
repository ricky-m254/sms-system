import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Staff = {
  id: number
  staff_id: string
  full_name: string
  staff_type: string
  employment_type: string
  status: string
  email_work: string
  phone_primary: string
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

const defaultForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  staff_type: 'Teaching',
  employment_type: 'Full-time',
  status: 'Active',
  email_work: '',
  phone_primary: '',
  join_date: '',
}

export default function StaffDirectoryPage() {
  const [rows, setRows] = useState<Staff[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const load = async () => {
    setError(null)
    try {
      if (query.trim()) {
        const response = await apiClient.get<Staff[] | { results: Staff[] }>(`/staff/search/?q=${encodeURIComponent(query.trim())}`)
        setRows(asArray(response.data))
      } else {
        const response = await apiClient.get<Staff[] | { results: Staff[] }>('/staff/')
        setRows(asArray(response.data))
      }
    } catch {
      setError('Unable to load staff directory.')
    }
  }

  useEffect(() => {
    void load()
  }, [query])

  const createStaff = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/staff/', form)
      setForm(defaultForm)
      setNotice('Staff member created.')
      await load()
    } catch {
      setError('Unable to create staff member.')
    } finally {
      setWorking(false)
    }
  }

  const exportCsv = async () => {
    try {
      const response = await apiClient.get('/staff/export/', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'staff_directory.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Unable to export staff directory.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Staff Directory</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Search, Filter, and Manage Staff</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, email, phone..." className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-3" />
          <button onClick={exportCsv} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">Export CSV</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Directory List</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Name</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Employment</th><th className="px-2 py-2">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="px-2 py-2">{row.staff_id}</td>
                    <td className="px-2 py-2">{row.full_name}</td>
                    <td className="px-2 py-2">{row.staff_type}</td>
                    <td className="px-2 py-2">{row.employment_type}</td>
                    <td className="px-2 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Create Staff</h2>
          <div className="mt-3 space-y-2">
            <input value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="First name" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input value={form.middle_name} onChange={(e) => setForm((p) => ({ ...p, middle_name: e.target.value }))} placeholder="Middle name" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input value={form.email_work} onChange={(e) => setForm((p) => ({ ...p, email_work: e.target.value }))} placeholder="Work email" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input value={form.phone_primary} onChange={(e) => setForm((p) => ({ ...p, phone_primary: e.target.value }))} placeholder="Phone" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input type="date" value={form.join_date} onChange={(e) => setForm((p) => ({ ...p, join_date: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createStaff} disabled={working} className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60">
              {working ? 'Saving...' : 'Create'}
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}
