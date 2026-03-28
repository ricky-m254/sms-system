import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const severityColor = (s: string) => {
  if (s === 'High' || s === 'Critical') return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  if (s === 'Medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  return 'text-sky-400 bg-sky-500/10 border-sky-500/20'
}

export default function ParentPortalAttendancePage() {
  const [summary, setSummary] = useState<any>({})
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'attendance' | 'behavior'>('attendance')

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/attendance/summary/'),
      apiClient.get('/parent-portal/behavior/incidents/'),
    ])
      .then(([s, i]) => {
        setSummary(s.data ?? {})
        setIncidents(Array.isArray(i.data) ? i.data : [])
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const rate = summary.attendance_rate ?? 0
  const isLow = rate < 80

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mb-1">ATTENDANCE</p>
        <h1 className="text-2xl font-display font-bold text-white">Attendance & Behavior</h1>
        <p className="text-slate-500 text-sm mt-1">School attendance records and behavioral incidents</p>
      </div>

      {isLow && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-200">Attendance is below 80%. Regular school attendance is critical for academic success.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Attendance Rate', value: `${rate}%`, color: isLow ? '#ef4444' : '#10b981' },
          { label: 'Present', value: summary.present ?? 0, color: '#10b981' },
          { label: 'Absent', value: summary.absent ?? 0, color: '#ef4444' },
          { label: 'Late', value: summary.late ?? 0, color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={GLASS}>
            <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-400">Attendance Rate</p>
          <p className="text-sm font-bold" style={{ color: isLow ? '#ef4444' : '#10b981' }}>{rate}%</p>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(rate, 100)}%`, background: isLow ? '#ef4444' : '#10b981' }} />
        </div>
        <p className="text-[10px] text-slate-600 mt-2">Minimum required: 80%</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['attendance', 'behavior'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {t === 'behavior' ? `Behavior Incidents (${incidents.length})` : 'Attendance Summary'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading records…</div>
      ) : tab === 'attendance' ? (
        <div className="rounded-2xl p-5" style={GLASS}>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Days Present', value: summary.present ?? 0, icon: CheckCircle2, color: '#10b981' },
              { label: 'Days Absent', value: summary.absent ?? 0, icon: XCircle, color: '#ef4444' },
              { label: 'Days Late', value: summary.late ?? 0, icon: AlertCircle, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label}>
                <s.icon size={24} style={{ color: s.color }} className="mx-auto mb-2" />
                <p className="text-3xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {rate >= 80 ? (
            <div className="mt-5 flex items-center justify-center gap-2 text-emerald-400 text-sm">
              <ShieldCheck size={16} />
              Attendance is satisfactory — keep it up!
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-center gap-2 text-rose-400 text-sm">
              <AlertTriangle size={16} />
              Attendance needs improvement to meet the 80% minimum.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>
              No behavioral incidents recorded.
            </div>
          ) : incidents.map((inc: any) => (
            <div key={inc.id} className={`rounded-2xl p-4 border ${severityColor(inc.severity)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityColor(inc.severity)}`}>
                      {inc.severity || 'Low'}
                    </span>
                    <span className="text-xs text-slate-500">{inc.incident_type}</span>
                  </div>
                  <p className="text-sm text-slate-200 font-medium">{inc.description || 'No description provided.'}</p>
                  {inc.category && <p className="text-xs text-slate-500 mt-0.5">Category: {inc.category}</p>}
                </div>
                <p className="text-xs text-slate-500 whitespace-nowrap">
                  {inc.incident_date ? new Date(inc.incident_date).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
