import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'

interface DashboardData {
  total_alumni: number
  alumni_by_year: any[]
  country_breakdown: any[]
}

export default function AlumniDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/alumni/dashboard/')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 text-white font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Alumni Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-400">Total Registered Alumni</p>
          <p className="mt-2 text-3xl font-display font-bold text-emerald-400">
            {loading ? '...' : (data?.total_alumni ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">By Graduation Year</h3>
          <div className="space-y-4">
            {data?.alumni_by_year?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                <span className="text-slate-300">Year: {item.graduation_year}</span>
                <span className="font-mono text-emerald-400">{item.count} alumni</span>
              </div>
            )) || <p className="text-slate-500 text-sm italic">No data available</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">By Country</h3>
          <div className="space-y-4">
            {data?.country_breakdown?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                <span className="text-slate-300">{item.country || 'Not Specified'}</span>
                <span className="font-mono text-emerald-400">{item.count}</span>
              </div>
            )) || <p className="text-slate-500 text-sm italic">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
