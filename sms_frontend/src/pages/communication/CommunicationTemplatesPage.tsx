import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Template = { id: number; name: string; category: string; channel: string; subject: string; body: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function CommunicationTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([])
  const [name, setName] = useState('')
  const [body, setBody] = useState('Hello {{parent_name}}')
  const [preview, setPreview] = useState<string>('')

  const load = async () => {
    const response = await apiClient.get<Template[] | { results: Template[] }>('/communication/templates/')
    setRows(asArray(response.data))
  }

  useEffect(() => {
    void load()
  }, [])

  const create = async () => {
    if (!name.trim() || !body.trim()) return
    await apiClient.post('/communication/templates/', {
      name: name.trim(),
      category: 'System',
      channel: 'Email',
      subject: 'Notification',
      body: body.trim(),
      language: 'en',
    })
    setName('')
    await load()
  }

  const runPreview = async (id: number) => {
    const response = await apiClient.post<{ subject: string; body: string }>(`/communication/templates/${id}/preview/`, {
      sample: { parent_name: 'Jane Parent', student_name: 'John Student', amount: '1500' },
    })
    setPreview(`${response.data.subject}\n${response.data.body}`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Templates</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Reusable Template Library</h1>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Create Template</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <button onClick={create} className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create</button>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Templates</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                <p>{row.name}</p>
                <button onClick={() => runPreview(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs">Preview</button>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Preview</h2>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-950/60 p-3 text-xs text-slate-300">{preview || 'Select a template to preview.'}</pre>
        </article>
      </section>
    </div>
  )
}

