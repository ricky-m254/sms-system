import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'

type StaffRow = { id: number; full_name: string; staff_id: string }
type DocumentRow = { id: number; staff: number; staff_name: string; title: string; document_type: string; verification_status: string; expiry_date: string | null }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function StaffDocumentsPage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('Certificate')
  const [file, setFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [expiring, setExpiring] = useState<DocumentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const [staffResponse, docsResponse, expiringResponse] = await Promise.all([
        apiClient.get<StaffRow[] | { results: StaffRow[] }>('/staff/'),
        apiClient.get<DocumentRow[] | { results: DocumentRow[] }>('/staff/documents/'),
        apiClient.get<DocumentRow[] | { results: DocumentRow[] }>('/staff/documents/expiring/'),
      ])
      setStaff(asArray(staffResponse.data))
      setDocuments(asArray(docsResponse.data))
      setExpiring(asArray(expiringResponse.data))
    } catch {
      setError('Unable to load staff documents.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const upload = async () => {
    if (!selectedStaff || !title.trim() || !file) return
    setError(null)
    setNotice(null)
    try {
      const form = new FormData()
      form.append('staff', String(selectedStaff))
      form.append('title', title.trim())
      form.append('document_type', documentType)
      form.append('file', file)
      await apiClient.post('/staff/documents/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTitle('')
      setFile(null)
      setNotice('Document uploaded.')
      await load()
    } catch {
      setError('Unable to upload document.')
    }
  }

  const verify = async (id: number) => {
    setError(null)
    try {
      await apiClient.post(`/staff/documents/${id}/verify/`)
      await load()
    } catch {
      setError('Unable to verify document.')
    }
  }

  const download = async (id: number) => {
    try {
      const response = await apiClient.get(`/staff/documents/${id}/download/`, { responseType: 'blob' })
      downloadFromResponse(response as { data: Blob; headers?: Record<string, unknown> }, `staff_document_${id}`)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download document.'))
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Documents</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Upload, Verify, and Track Expiring Records</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Upload Document</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select staff</option>
            {staff.map((row) => <option key={row.id} value={row.id}>{row.staff_id} - {row.full_name}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option>Contract</option>
            <option>Certificate</option>
            <option>License</option>
            <option>ID</option>
            <option>Medical</option>
            <option>Performance</option>
            <option>Other</option>
          </select>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button onClick={upload} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Upload</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Documents</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {documents.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                <div>
                  <p>{row.title}</p>
                  <p className="text-slate-400">{row.staff_name} | {row.document_type} | {row.verification_status}</p>
                </div>
                <div className="flex gap-2">
                  {row.verification_status !== 'Verified' ? (
                    <button onClick={() => verify(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Verify</button>
                  ) : null}
                  <button onClick={() => download(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Download</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Expiring Soon</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {expiring.map((row) => (
              <div key={row.id} className="rounded-lg bg-slate-950/60 px-3 py-2">
                <p>{row.title}</p>
                <p className="text-slate-400">{row.staff_name} | Expiry: {row.expiry_date ?? 'N/A'}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
