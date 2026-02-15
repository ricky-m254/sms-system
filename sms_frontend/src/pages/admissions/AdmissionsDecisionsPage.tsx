import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type Application = { id: number; application_number?: string; student_first_name: string; student_last_name: string }
type Decision = {
  id: number
  application: number
  application_number?: string
  decision: string
  decision_date: string
  offer_deadline?: string | null
  response_status: string
}
type WaitlistRow = {
  queue_position: number
  application_number?: string
  student_name: string
  decision_date: string
}

export default function AdmissionsDecisionsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [rows, setRows] = useState<Decision[]>([])
  const [waitlistRows, setWaitlistRows] = useState<WaitlistRow[]>([])
  const [decidedApplicationIds, setDecidedApplicationIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [form, setForm] = useState({
    application: '',
    decision: 'Accept',
    decision_date: new Date().toISOString().slice(0, 10),
    offer_deadline: '',
    decision_notes: '',
  })

  const load = async () => {
    setError(null)
    try {
      const [appRes, decRes] = await Promise.all([
        apiClient.get('/admissions/applications/'),
        apiClient.get('/admissions/decisions/'),
      ])
      const loadedApplications = normalizePaginatedResponse<Application>(appRes.data).items
      const loadedDecisions = normalizePaginatedResponse<Decision>(decRes.data).items
      setApplications(loadedApplications)
      setRows(loadedDecisions)
      setDecidedApplicationIds(new Set(loadedDecisions.map((item) => item.application)))
      const queueRes = await apiClient.get('/admissions/waitlist/queue/')
      setWaitlistRows((queueRes.data?.items ?? []) as WaitlistRow[])
    } catch {
      setError('Unable to load decisions.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (decidedApplicationIds.has(Number(form.application))) {
      setError('This application already has a decision. Use the existing decision record instead.')
      return
    }
    try {
      setError(null)
      await apiClient.post('/admissions/decisions/', {
        application: Number(form.application),
        decision: form.decision,
        decision_date: form.decision_date,
        offer_deadline: form.offer_deadline || undefined,
        decision_notes: form.decision_notes || undefined,
      })
      setForm({
        application: '',
        decision: 'Accept',
        decision_date: new Date().toISOString().slice(0, 10),
        offer_deadline: '',
        decision_notes: '',
      })
      setFlash('Decision recorded.')
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (typeof detail === 'string') {
        setError(detail)
      } else if (detail?.detail) {
        setError(String(detail.detail))
      } else if (detail && typeof detail === 'object') {
        const firstKey = Object.keys(detail)[0]
        const firstValue = firstKey ? detail[firstKey] : null
        if (Array.isArray(firstValue) && firstValue[0]) {
          setError(String(firstValue[0]))
          return
        }
      }
      if (detail?.application && Array.isArray(detail.application) && detail.application[0]) {
        setError(String(detail.application[0]))
      } else if (detail?.error) {
        setError(String(detail.error))
      } else {
        setError('Unable to create decision.')
      }
    }
  }

  const respond = async (id: number, status: 'Accepted' | 'Declined') => {
    try {
      setError(null)
      await apiClient.post(`/admissions/decisions/${id}/respond/`, { response_status: status })
      setFlash(`Response set to ${status}.`)
      await load()
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) setError(String(detail.error))
      else setError('Unable to update response.')
    }
  }

  const downloadOfferLetter = async (id: number) => {
    try {
      setError(null)
      const response = await apiClient.get(`/admissions/decisions/${id}/offer-letter/`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `offer_letter_${id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
      setFlash('Offer letter downloaded.')
    } catch {
      setError('Unable to download offer letter.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admissions</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Decisions</h1>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {flash ? <p className="mb-4 text-sm text-emerald-300">{flash}</p> : null}
        <h2 className="text-lg font-display font-semibold">Record decision</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={create}>
          <select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm" value={form.application} onChange={(e) => setForm((p) => ({ ...p, application: e.target.value }))} required>
            <option value="">Select application</option>
            {applications.map((item) => (
              <option key={item.id} value={item.id} disabled={decidedApplicationIds.has(item.id)}>
                {item.application_number ?? `APP-${item.id}`} - {item.student_first_name} {item.student_last_name}
                {decidedApplicationIds.has(item.id) ? ' (Decision exists)' : ''}
              </option>
            ))}
          </select>
          <select className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm" value={form.decision} onChange={(e) => setForm((p) => ({ ...p, decision: e.target.value }))}>
            <option value="Accept">Accept</option>
            <option value="Reject">Reject</option>
            <option value="Waitlist">Waitlist</option>
          </select>
          <input type="date" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm" value={form.decision_date} onChange={(e) => setForm((p) => ({ ...p, decision_date: e.target.value }))} required />
          <input type="date" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm" value={form.offer_deadline} onChange={(e) => setForm((p) => ({ ...p, offer_deadline: e.target.value }))} />
          <button type="submit" className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold hover:border-emerald-400">
            Save
          </button>
          <input className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm md:col-span-5" placeholder="Decision notes" value={form.decision_notes} onChange={(e) => setForm((p) => ({ ...p, decision_notes: e.target.value }))} />
        </form>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Decision Date</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Response</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.application_number ?? `APP-${row.application}`}</td>
                  <td className="px-4 py-3">{row.decision}</td>
                  <td className="px-4 py-3">{row.decision_date}</td>
                  <td className="px-4 py-3">{row.offer_deadline ?? '--'}</td>
                  <td className="px-4 py-3">{row.response_status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {row.decision === 'Accept' && row.response_status === 'Pending' ? (
                        <>
                          <button type="button" className="rounded-lg border border-slate-700 px-2 py-1 text-xs" onClick={() => respond(row.id, 'Accepted')}>
                            Mark accepted
                          </button>
                          <button type="button" className="rounded-lg border border-slate-700 px-2 py-1 text-xs" onClick={() => respond(row.id, 'Declined')}>
                            Mark declined
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-1 text-xs text-slate-400">No response action</span>
                      )}
                      {row.decision === 'Accept' ? (
                        <button type="button" className="rounded-lg border border-slate-700 px-2 py-1 text-xs" onClick={() => downloadOfferLetter(row.id)}>
                          Offer letter
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No decisions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-display font-semibold">Waitlist queue</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Decision Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {waitlistRows.map((row) => (
                <tr key={`${row.application_number}-${row.queue_position}`} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.queue_position}</td>
                  <td className="px-4 py-3">{row.application_number ?? '--'}</td>
                  <td className="px-4 py-3">{row.student_name}</td>
                  <td className="px-4 py-3">{row.decision_date}</td>
                </tr>
              ))}
              {waitlistRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={4}>
                    No waitlisted applications.
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
