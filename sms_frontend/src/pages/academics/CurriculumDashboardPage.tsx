import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

interface Stats {
  total_schemes: number;
  total_lessons: number;
  topics_covered: number;
  total_resources: number;
}

export default function CurriculumDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/curriculum/dashboard/')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Curriculum Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Schemes of Work', value: stats?.total_schemes || 0 },
          { label: 'Lesson Plans', value: stats?.total_lessons || 0 },
          { label: 'Topics Covered', value: stats?.topics_covered || 0 },
          { label: 'Learning Resources', value: stats?.total_resources || 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-500">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white">Curriculum Overview</h3>
        <p className="mt-4 text-slate-400">
          Manage schemes of work, lesson plans, and learning resources across all subjects and classes.
        </p>
      </div>
    </div>
  );
}
