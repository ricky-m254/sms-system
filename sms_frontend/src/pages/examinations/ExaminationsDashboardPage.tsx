import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'

interface Analytics {
  class_average?: number
  pass_rate?: number
  top_students?: any[]
  subject_averages?: any[]
}

export default function ExaminationsDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/examinations/analytics/')
      .then(res => setAnalytics(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Examinations Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-400">Class Average</p>
          <p className="mt-2 text-3xl font-display font-bold text-emerald-400">
            {loading ? '...' : (analytics?.class_average ?? 'N/A')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-400">Pass Rate</p>
          <p className="mt-2 text-3xl font-display font-bold text-blue-400">
            {loading ? '...' : `${analytics?.pass_rate ?? 0}%`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-display font-semibold text-white mb-4">Top Students</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Average Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {analytics?.top_students?.map((s: any, i: number) => (
                <tr key={i}>
                  <td className="px-4 py-3">{s.student__first_name} {s.student__last_name}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400">{s.avg_marks}</td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
