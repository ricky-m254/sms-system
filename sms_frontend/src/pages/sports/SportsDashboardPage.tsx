import { useEffect, useState } from 'react';
import { sportsApi } from '../../api/sports_cafeteria';
import { Trophy, Users, Calendar, Award } from 'lucide-react';

export default function SportsDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportsApi.getDashboard()
      .then((data: any) => setStats(data))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-400 animate-pulse">Loading dashboard...</div>;

  const cards = [
    { label: 'Active Clubs', value: stats?.active_clubs ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Total Members', value: stats?.total_members ?? 0, icon: Calendar, color: 'text-emerald-400' },
    { label: 'Upcoming Tournaments', value: stats?.upcoming_tournaments ?? 0, icon: Trophy, color: 'text-amber-400' },
    { label: 'Recent Awards', value: stats?.recent_awards ?? 0, icon: Award, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition font-medium">
            Register New Club
          </button>
          <button className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-white rounded-xl transition font-medium">
            Schedule Tournament
          </button>
        </div>
      </div>
    </div>
  );
}
