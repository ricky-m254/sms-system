import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Calendar, User, Clock, Filter, ListChecks } from 'lucide-react'

interface Attendance {
  id: number
  student_name: string
  date: string
  roll_call_time: 'Morning' | 'Evening' | 'Night'
  status: 'Present' | 'Absent' | 'Leave'
  recorded_by_name: string
}

export default function HostelAttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    apiClient.get(`/hostel/attendance/?date=${selectedDate}`)
      .then(res => setAttendance(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [selectedDate])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Hostel Attendance</h1>
          <p className="mt-1 text-sm text-slate-400">Roll call records for Morning, Evening, and Night.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <ListChecks className="h-4 w-4" />
          Take Attendance
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="date"
            className="rounded-xl border border-slate-800 bg-slate-900/40 py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition">
          <Filter className="h-4 w-4 text-slate-500" />
          Filter: Time of Day
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40 uppercase tracking-widest text-[10px] font-bold text-slate-500">
              <th className="px-6 py-4 font-semibold text-slate-300">Student</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Date & Time</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Recorded By</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading attendance...</td>
              </tr>
            ) : attendance.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No attendance records found for this date.</td>
              </tr>
            ) : attendance.map((record) => (
              <tr key={record.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold text-slate-200">{record.student_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">{record.date}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase text-emerald-400 font-bold tracking-wider">
                      <Clock className="h-3 w-3" />
                      {record.roll_call_time}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      record.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 
                      record.status === 'Absent' ? 'bg-rose-500/10 text-rose-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{record.recorded_by_name || 'System'}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-500 hover:text-white transition">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
