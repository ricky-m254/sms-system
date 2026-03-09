import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface DashboardData {
  total_courses: number
  active_quizzes: number
  enrolled_students: number
  total_materials: number
}

export default function ELearningDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/elearning/dashboard/')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-slate-400 text-center animate-pulse">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold text-white">E-Learning Dashboard</h1>
        <p className="text-slate-400 mt-1 text-lg">Online learning management and tracking.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard label="Total Courses" value={data?.total_courses ?? 0} color="text-emerald-400" />
        <DashboardCard label="Active Quizzes" value={data?.active_quizzes ?? 0} color="text-blue-400" />
        <DashboardCard label="Enrolled Students" value={data?.enrolled_students ?? 0} color="text-purple-400" />
        <DashboardCard label="Total Materials" value={data?.total_materials ?? 0} color="text-amber-400" />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-xl font-display font-semibold text-white">Digital Learning Ready</h3>
        <p className="mt-2 text-slate-400 max-w-md mx-auto">
          Create courses, upload study materials, and conduct online assessments from a single platform.
        </p>
      </div>
    </div>
  )
}

function DashboardCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm transition hover:border-slate-700">
      <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-2 text-4xl font-display font-bold ${color}`}>{value}</p>
    </div>
  )
}
