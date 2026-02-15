import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type StaffRow = { id: number; full_name: string; staff_id: string }
type ObservationRow = { id: number; staff_name: string; observation_date: string; overall_rating: string | null; status: string }
type AppraisalRow = { id: number; staff_name: string; appraisal_period: string; overall_rating: string | null; status: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function StaffPerformancePage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [observations, setObservations] = useState<ObservationRow[]>([])
  const [appraisals, setAppraisals] = useState<AppraisalRow[]>([])
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('')
  const [observationDate, setObservationDate] = useState('')
  const [appraisalPeriod, setAppraisalPeriod] = useState('2026')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const [staffResponse, observationResponse, appraisalResponse] = await Promise.all([
        apiClient.get<StaffRow[] | { results: StaffRow[] }>('/staff/'),
        apiClient.get<ObservationRow[] | { results: ObservationRow[] }>('/staff/observations/'),
        apiClient.get<AppraisalRow[] | { results: AppraisalRow[] }>('/staff/appraisals/'),
      ])
      setStaff(asArray(staffResponse.data))
      setObservations(asArray(observationResponse.data))
      setAppraisals(asArray(appraisalResponse.data))
    } catch {
      setError('Unable to load staff performance data.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createObservation = async () => {
    if (!selectedStaff || !observationDate) return
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/staff/observations/', {
        staff: selectedStaff,
        observer: selectedStaff,
        observation_date: observationDate,
        status: 'Draft',
      })
      setNotice('Observation created.')
      await load()
    } catch {
      setError('Unable to create observation.')
    }
  }

  const submitObservation = async (id: number) => {
    setError(null)
    try {
      await apiClient.post(`/staff/observations/${id}/submit/`)
      await load()
    } catch {
      setError('Unable to submit observation.')
    }
  }

  const createAppraisal = async () => {
    if (!selectedStaff || !appraisalPeriod.trim()) return
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/staff/appraisals/', {
        staff: selectedStaff,
        appraiser: selectedStaff,
        appraisal_period: appraisalPeriod.trim(),
        status: 'Draft',
      })
      setNotice('Appraisal created.')
      await load()
    } catch {
      setError('Unable to create appraisal.')
    }
  }

  const approveAppraisal = async (id: number) => {
    setError(null)
    try {
      await apiClient.post(`/staff/appraisals/${id}/approve/`)
      await load()
    } catch {
      setError('Unable to approve appraisal.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Performance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Observations and Appraisals</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Create Observation</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Select staff</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{row.staff_id} - {row.full_name}</option>)}
            </select>
            <input type="datetime-local" value={observationDate} onChange={(e) => setObservationDate(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createObservation} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create</button>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {observations.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                <div>
                  <p>{row.staff_name}</p>
                  <p className="text-slate-400">{row.observation_date} | {row.status}</p>
                </div>
                {row.status === 'Draft' ? (
                  <button onClick={() => submitObservation(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Submit</button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">Create Appraisal</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input value={appraisalPeriod} onChange={(e) => setAppraisalPeriod(e.target.value)} placeholder="Period (2026/Q1)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <div />
            <button onClick={createAppraisal} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create</button>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {appraisals.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                <div>
                  <p>{row.staff_name}</p>
                  <p className="text-slate-400">{row.appraisal_period} | {row.status}</p>
                </div>
                {row.status !== 'Approved' ? (
                  <button onClick={() => approveAppraisal(row.id)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Approve</button>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
