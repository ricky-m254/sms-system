import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'

type Resource = {
  id: number
  title: string
  resource_type: string
  authors: string
  isbn: string
  total_copies: number
  available_copies: number
}

export default function LibraryCatalogPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [title, setTitle] = useState('')
  const [resourceType, setResourceType] = useState('Book')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const response = await apiClient.get<Resource[]>('/library/resources/')
      setResources(response.data ?? [])
      setError(null)
    } catch {
      setError('Catalog API unavailable.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await apiClient.post('/library/resources/', {
        title: title.trim(),
        resource_type: resourceType,
      })
      setTitle('')
      await load()
    } catch {
      setError('Unable to create resource.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Catalog Management</h1>
        <p className="mt-2 text-sm text-slate-400">
          Add resources and track available copies for circulation.
        </p>
      </header>
      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Create Resource</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
          >
            <option>Book</option>
            <option>Periodical</option>
            <option>Multimedia</option>
            <option>Digital</option>
            <option>Equipment</option>
          </select>
          <button
            type="submit"
            className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200"
            disabled={busy}
          >
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Resource List</h2>
        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Authors</th>
                <th className="px-2 py-2">ISBN</th>
                <th className="px-2 py-2">Copies</th>
                <th className="px-2 py-2">Available</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-2 py-2">{row.title}</td>
                  <td className="px-2 py-2">{row.resource_type}</td>
                  <td className="px-2 py-2">{row.authors || '-'}</td>
                  <td className="px-2 py-2">{row.isbn || '-'}</td>
                  <td className="px-2 py-2">{row.total_copies}</td>
                  <td className="px-2 py-2">{row.available_copies}</td>
                </tr>
              ))}
              {!resources.length ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={6}>
                    No resources yet.
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
