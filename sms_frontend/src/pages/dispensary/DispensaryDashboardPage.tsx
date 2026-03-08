import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Pill, ArrowUpRight, ArrowRight } from 'lucide-react';
import apiClient from '../../api/client';

interface DashboardData {
  visits_today: number;
  visits_month: number;
  low_stock_meds: number;
  referred_count: number;
  recent_visits: {
    id: number;
    visit_date: string;
    complaint: string;
    diagnosis: string;
    severity: string;
    student__first_name: string;
    student__last_name: string;
    student__admission_number: string;
    referred: boolean;
    parent_notified: boolean;
  }[];
}

const SEVERITY_COLOR: Record<string, string> = {
  MINOR: 'bg-sky-500/20 text-sky-300',
  MODERATE: 'bg-amber-500/20 text-amber-300',
  SERIOUS: 'bg-rose-500/20 text-rose-300',
};

export default function DispensaryDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/dispensary/dashboard/').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Dispensary Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Visits", value: data?.visits_today ?? 0, icon: Users, color: 'text-emerald-400' },
          { label: 'This Month', value: data?.visits_month ?? 0, icon: Calendar, color: 'text-sky-400' },
          { label: 'Low Stock Meds', value: data?.low_stock_meds ?? 0, icon: Pill, color: 'text-rose-400' },
          { label: 'Referred (Month)', value: data?.referred_count ?? 0, icon: ArrowUpRight, color: 'text-amber-400' },
        ].map(card => (
          <div key={card.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{card.label}</span>
              <card.icon size={18} className={card.color} />
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">Recent Visits</h2>
          <button onClick={() => navigate('/modules/dispensary/visits')} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </button>
        </div>
        {!data?.recent_visits.length ? (
          <p className="text-slate-500 text-sm">No recent visits.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="text-left py-2 pr-4">Student</th>
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Complaint</th>
                  <th className="text-left py-2 pr-4">Severity</th>
                  <th className="text-left py-2">Referred</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_visits.map(v => (
                  <tr key={v.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2.5 pr-4 text-slate-200">
                      {v.student__first_name} {v.student__last_name}
                      <span className="block text-xs text-slate-500">{v.student__admission_number}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-400">{v.visit_date}</td>
                    <td className="py-2.5 pr-4 text-slate-300 max-w-[160px] truncate">{v.complaint}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLOR[v.severity] || ''}`}>{v.severity}</span>
                    </td>
                    <td className="py-2.5">
                      {v.referred ? <span className="text-amber-400 text-xs">Yes</span> : <span className="text-slate-500 text-xs">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
