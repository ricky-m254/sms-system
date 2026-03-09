import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { UserCheck, UserMinus, ShieldCheck, ClipboardList } from 'lucide-react'

interface Stats {
  today_visitors_in: number
  today_visitors_out: number
}

export default function VisitorDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/visitor_mgmt/dashboard/')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-slate-400 text-center">Loading dashboard...</div>

  const cards = [
    { label: 'Visitors Currently In', value: stats?.today_visitors_in || 0, icon: UserCheck, color: 'text-emerald-400' },
    { label: 'Visitors Signed Out Today', value: stats?.today_visitors_out || 0, icon: UserMinus, color: 'text-blue-400' },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-display font-bold text-white">Visitor Management Dashboard</h1>
        <p className="text-slate-400">Real-time school access monitoring</p>
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-emerald-400 mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Security Active</span>
            </div>
            <p className="text-sm text-slate-400">All access points monitored</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-blue-400 mb-1">
                <ClipboardList className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Pickup Logs</span>
                </div>
            <p className="text-sm text-slate-400">Tracking student departures</p>
        </div>
      </div>
      
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
        <UserCheck className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Visitor Management System</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Securely manage visitors, authorized student pickups, and maintain digital logs of all campus entry and exit.
        </p>
      </div>
    </div>
  )
}
