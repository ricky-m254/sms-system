import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

interface Stats {
  total_requests: number;
  pending_requests: number;
  in_progress: number;
  completed_requests: number;
}

export default function MaintenanceDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/maintenance/dashboard/')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Maintenance Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Requests', value: stats?.total_requests || 0 },
          { label: 'Pending', value: stats?.pending_requests || 0 },
          { label: 'In Progress', value: stats?.in_progress || 0 },
          { label: 'Completed', value: stats?.completed_requests || 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-500">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white">Maintenance Overview</h3>
        <p className="mt-4 text-slate-400">
          Track school maintenance requests, facility inspections, and repair schedules.
        </p>
      </div>
    </div>
  );
}
