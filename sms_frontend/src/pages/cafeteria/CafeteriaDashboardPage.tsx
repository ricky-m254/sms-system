import { useEffect, useState } from 'react';
import { cafeteriaApi } from '../../api/sports_cafeteria';
import { Utensils, Users, ClipboardList, Wallet } from 'lucide-react';

export default function CafeteriaDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cafeteriaApi.getDashboard()
      .then((data: any) => setStats(data))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-400 animate-pulse">Loading dashboard...</div>;

  const cards = [
    { label: "Today's Meals Served", value: stats?.today_meal_count ?? 0, icon: Utensils, color: 'text-emerald-400' },
    { label: 'Enrolled Students', value: stats?.enrolled_students ?? 0, icon: Users, color: 'text-blue-400' },
    { label: "This Week's Menus", value: stats?.this_week_menu_count ?? 0, icon: ClipboardList, color: 'text-amber-400' },
    { label: 'Total Meal Records', value: stats?.today_meal_count ?? 0, icon: Wallet, color: 'text-purple-400' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          <h3 className="text-lg font-semibold text-white mb-4">Today's Menu Overview</h3>
          <p className="italic">Menu details are being loaded from the current week's schedule.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition font-medium text-sm text-center">
              New Meal Plan
            </button>
            <button className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-white rounded-xl transition font-medium text-sm text-center">
              Record Attendance
            </button>
            <button className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-white rounded-xl transition font-medium text-sm text-center">
              Wallet Top-up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
