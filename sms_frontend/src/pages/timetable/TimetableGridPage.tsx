import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type TimetableSlot = {
  id: number
  day_of_week: number
  period_number: number
  start_time: string
  end_time: string
  teacher: number | null
  teacher_name: string
  subject: number | null
  subject_name: string
  school_class: number | null
  class_name: string
  room: string
  is_active: boolean
  term: number | null
  notes: string
  coverage_status?: 'Uncovered' | 'Covered' | 'Cancelled'
}

type GridData = {
  slots: Record<number, TimetableSlot[]>
}

export default function TimetableGridPage() {
  const [gridData, setGridData] = useState<GridData>({ slots: {} })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewBy, setViewBy] = useState<'class' | 'teacher'>('class')
  const [selectedId, setSelectedId] = useState<string>('')
  
  const [classes, setClasses] = useState<{ id: number; display_name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: number; full_name: string }[]>([])

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [classRes, teacherRes] = await Promise.all([
          apiClient.get('/school/classes/'),
          apiClient.get('/hr/employees/?position=Teacher')
        ])
        setClasses(classRes.data.results || classRes.data)
        // Adjust based on actual API response structure
        const teacherData = teacherRes.data.results || teacherRes.data
        setTeachers(teacherData.map((t: any) => ({ 
          id: t.user, // TimetableSlot uses auth.User ID
          full_name: `${t.first_name} ${t.last_name}` 
        })).filter((t: any) => t.id))
      } catch (err) {
        console.error('Failed to load metadata', err)
      }
    }
    loadMetadata()
  }, [])

  const fetchGrid = async () => {
    if (!selectedId) return
    setIsLoading(true)
    try {
      const params: any = {}
      if (viewBy === 'class') params.class_id = selectedId
      else params.teacher_id = selectedId
      
      const res = await apiClient.get<GridData>('/timetable/grid/', { params })
      setGridData(res.data)
      setError(null)
    } catch (err) {
      setError('Failed to load timetable grid.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGrid()
  }, [viewBy, selectedId])

  const days = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
  ]
  
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

  const getSlot = (day: number, period: number) => {
    return gridData.slots[day]?.find(s => s.period_number === period)
  }

  const getSubjectColor = (id: number | null) => {
    if (!id) return 'bg-slate-800'
    const colors = [
      'bg-blue-500/20 border-blue-500/50 text-blue-200',
      'bg-purple-500/20 border-purple-500/50 text-purple-200',
      'bg-amber-500/20 border-amber-500/50 text-amber-200',
      'bg-emerald-500/20 border-emerald-500/50 text-emerald-200',
      'bg-rose-500/20 border-rose-500/50 text-rose-200',
      'bg-indigo-500/20 border-indigo-500/50 text-indigo-200',
      'bg-cyan-500/20 border-cyan-500/50 text-cyan-200',
    ]
    return colors[id % colors.length]
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold">Weekly Timetable</h1>
          <p className="mt-1 text-sm text-slate-400">Manage and view lesson schedules.</p>
        </div>
        <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition">
          + Add Slot
        </button>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex rounded-xl bg-slate-950 p-1">
            <button
              onClick={() => { setViewBy('class'); setSelectedId(''); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${viewBy === 'class' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              By Class
            </button>
            <button
              onClick={() => { setViewBy('teacher'); setSelectedId(''); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${viewBy === 'teacher' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              By Teacher
            </button>
          </div>

          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 min-w-[200px]"
          >
            <option value="">Select {viewBy === 'class' ? 'Class' : 'Teacher'}...</option>
            {viewBy === 'class' ? (
              classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)
            ) : (
              teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)
            )}
          </select>
        </div>

        {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}

        {!selectedId ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-500">Select a {viewBy} to view the timetable.</p>
          </div>
        ) : isLoading ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 animate-pulse">Loading timetable data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-800 bg-slate-950/50 text-xs text-slate-500 font-medium uppercase tracking-wider w-20">Period</th>
                  {days.map(day => (
                    <th key={day.id} className="p-3 border border-slate-800 bg-slate-950/50 text-sm font-semibold text-slate-200">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period}>
                    <td className="p-2 border border-slate-800 text-center bg-slate-950/30">
                      <span className="text-lg font-bold text-slate-700">{period}</span>
                    </td>
                    {days.map(day => {
                      const slot = getSlot(day.id, period)
                      return (
                        <td key={`${day.id}-${period}`} className="p-1 border border-slate-800 h-28 w-40 vertical-top">
                          {slot ? (
                            <div className={`h-full w-full rounded-lg p-2 border ${getSubjectColor(slot.subject)} flex flex-col justify-between relative group cursor-pointer hover:brightness-110 transition`}>
                              <div>
                                <div className="text-xs font-bold truncate">{slot.subject_name}</div>
                                <div className="text-[10px] opacity-80 truncate">
                                  {viewBy === 'class' ? slot.teacher_name : slot.class_name}
                                </div>
                                <div className="text-[10px] mt-1 flex items-center gap-1 opacity-70">
                                  <span>📍 {slot.room || 'No Room'}</span>
                                </div>
                              </div>
                              <div className="text-[10px] font-mono mt-auto pt-1 border-t border-white/10">
                                {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                              </div>
                              
                              {slot.coverage_status === 'Uncovered' && (
                                <div className="absolute -top-1 -right-1 flex h-4 w-4">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] items-center justify-center font-bold text-white">!</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full w-full rounded-lg bg-slate-900/20 border border-transparent group hover:border-slate-800 transition flex items-center justify-center">
                               <button className="opacity-0 group-hover:opacity-100 text-slate-600 text-xs transition">+</button>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
