import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import {
  Bed,
  Users,
  DoorOpen,
  CalendarCheck,
  Building,
  TrendingUp
} from 'lucide-react'

interface DashboardStats {
  total_dormitories: number
  total_beds: number
  occupied_beds: number
  available_beds: number
  occupancy_rate: number
  today_attendance: {
    Present: number
    Absent: number
    'On Leave': number
  }
}

export default function HostelDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/hostel/dashboard/')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-slate-400">Loading dashboard...</div>

  const cards = [
    { label: 'Total Dormitories', value: stats?.total_dormitories ?? 0, icon: Building, color: 'text-blue-400' },
    { label: 'Total Beds', value: stats?.total_beds ?? 0, icon: Bed, color: 'text-emerald-400' },
    { label: 'Occupied Beds', value: stats?.occupied_beds ?? 0, icon: Users, color: 'text-orange-400' },
    { label: 'Available Beds', value: stats?.available_beds ?? 0, icon: DoorOpen, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Hostel Dashboard</h1>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-emerald-400 border border-emerald-500/20">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Occupancy: {stats?.occupancy_rate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <span className="text-2xl font-bold text-white">{card.value}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Tonight's Attendance Summary</h3>
          <div className="space-y-4">
            {Object.entries(stats?.today_attendance ?? {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-slate-400">{status}</span>
                <div className="flex items-center gap-4">
                  <div className="h-2 w-48 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        status === 'Present' ? 'bg-emerald-500' : status === 'Absent' ? 'bg-rose-500' : 'bg-orange-500'
                      }`}
                      style={{
                        width: `${(count / (stats?.occupied_beds || 1)) * 100}%`
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium text-white">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-center items-center text-center">
           <CalendarCheck className="h-12 w-12 text-slate-700 mb-4" />
           <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
           <p className="text-sm text-slate-400 mt-2 mb-6">Manage student check-ins and night roll calls efficiently.</p>
           <div className="grid grid-cols-2 gap-4 w-full">
             <button className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition">
               Take Attendance
             </button>
             <button className="rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition border border-slate-700">
               New Allocation
             </button>
           </div>
        </div>
      </div>
    </div>
  )
}
