import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Bus, MapPin, Users, AlertTriangle } from 'lucide-react'

interface Stats {
  total_vehicles: number
  active_routes: number
  students_enrolled: number
  incidents_open: number
}

export default function TransportDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/transport/dashboard/')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-slate-400 text-center">Loading dashboard...</div>

  const cards = [
    { label: 'Total Vehicles', value: stats?.total_vehicles || 0, icon: Bus, color: 'text-blue-400' },
    { label: 'Active Routes', value: stats?.active_routes || 0, icon: MapPin, color: 'text-emerald-400' },
    { label: 'Students Enrolled', value: stats?.students_enrolled || 0, icon: Users, color: 'text-purple-400' },
    { label: 'Open Incidents', value: stats?.incidents_open || 0, icon: AlertTriangle, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-display font-bold text-white">Transport Dashboard</h1>
        <p className="text-slate-400">Overview of school transportation services</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <span className="text-3xl font-bold text-white">{card.value}</span>
            </div>
            <p className="text-sm text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
        <Bus className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Transport Management System</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Use the sidebar to manage vehicles, routes, student assignments, and track safety incidents.
        </p>
      </div>
    </div>
  )
}
