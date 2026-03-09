import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type StaffDutySlot = {
  id: number
  employee: number
  employee_name: string
  day_of_week: number
  duty_start: string
  duty_end: string
  location: string
  description: string
  is_active: boolean
  notes: string
}

export default function TimetableStaffDutyPage() {
  const [dutySlots, setDutySlots] = useState<StaffDutySlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dayFilter, setDayFilter] = useState<string>('')

  const fetchDuties = async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (dayFilter) params.day_of_week = dayFilter
      const res = await apiClient.get('/timetable/duty-slots/', { params })
      setDutySlots(res.data.results || res.data)
      setError(null)
    } catch (err) {
      setError('Failed to load staff duty slots.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDuties()
  }, [dayFilter])

  const days = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
  ]

  const getDayLabel = (id: number) => days.find(d => d.id === id)?.label || 'Unknown'

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold text-emerald-400">Staff Duties</h1>
          <p className="mt-1 text-sm text-slate-400">Non-teaching staff duty assignments and locations.</p>
        </div>
        <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition">
          + Add Duty
        </button>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 min-w-[150px]"
          >
            <option value="">All Days</option>
            {days.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 animate-pulse">Loading duty roster...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="p-4 border-b border-slate-800 font-semibold text-slate-400">Employee</th>
                  <th className="p-4 border-b border-slate-800 font-semibold text-slate-400">Day</th>
                  <th className="p-4 border-b border-slate-800 font-semibold text-slate-400">Location</th>
                  <th className="p-4 border-b border-slate-800 font-semibold text-slate-400">Time</th>
                  <th className="p-4 border-b border-slate-800 font-semibold text-slate-400">Description</th>
                  <th className="p-4 border-b border-slate-800 font-semibold text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {dutySlots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No duty assignments found.</td>
                  </tr>
                ) : (
                  dutySlots.map((duty) => (
                    <tr key={duty.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="p-4 border-b border-slate-800">
                        <p className="font-semibold text-slate-200">{duty.employee_name}</p>
                      </td>
                      <td className="p-4 border-b border-slate-800 text-slate-300 font-medium">
                        {getDayLabel(duty.day_of_week)}
                      </td>
                      <td className="p-4 border-b border-slate-800">
                         <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-500/20">
                            {duty.location}
                         </span>
                      </td>
                      <td className="p-4 border-b border-slate-800 text-slate-300 font-mono text-xs">
                        {duty.duty_start.substring(0,5)} - {duty.duty_end.substring(0,5)}
                      </td>
                      <td className="p-4 border-b border-slate-800 text-xs text-slate-400 max-w-[200px] truncate">
                        {duty.description}
                      </td>
                      <td className="p-4 border-b border-slate-800">
                        <button className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg border border-slate-800 hover:border-emerald-500/50">
                          Request Change
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
