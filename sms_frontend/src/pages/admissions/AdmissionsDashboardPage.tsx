import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero'
import {
  UserPlus, ClipboardList, Star, CheckCircle2, ChevronRight,
  Users, TrendingUp, Calendar, Filter,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const PIPELINE_STAGES = [
  { label: 'Inquiries', count: 48, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: ClipboardList },
  { label: 'Applications', count: 35, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: Filter },
  { label: 'Assessments', count: 28, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', icon: Star },
  { label: 'Interviews', count: 22, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Calendar },
  { label: 'Decisions', count: 18, color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: TrendingUp },
  { label: 'Enrolled', count: 15, color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
]

const QUICK_LINKS = [
  { label: 'Inquiries', to: '/modules/admissions/inquiries', color: '#94a3b8' },
  { label: 'Applications', to: '/modules/admissions/applications', color: '#0ea5e9' },
  { label: 'Assessments', to: '/modules/admissions/assessments', color: '#a855f7' },
  { label: 'Interviews', to: '/modules/admissions/interviews', color: '#f59e0b' },
  { label: 'Decisions', to: '/modules/admissions/decisions', color: '#f97316' },
  { label: 'Enrollment', to: '/modules/admissions/enrollment', color: '#10b981' },
  { label: 'Analytics', to: '/modules/admissions/analytics', color: '#6366f1' },
]

export default function AdmissionsDashboardPage() {
  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1420 0%, #1a0e1a 45%, #0e1a14 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(14,165,233,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(16,185,129,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(14,165,233,0.2)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.35)' }}>
                ADMISSIONS · INTAKE 2025
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Pipeline active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Student Admissions &<br />
              <span style={{ color: '#7dd3fc' }}>Intake Management</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Track every applicant from initial inquiry through enrollment — with full pipeline visibility and analytics.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[240px]">
            {[
              { label: 'Inquiries', value: '48', color: '#94a3b8' },
              { label: 'Applications', value: '35', color: '#0ea5e9' },
              { label: 'Enrolled', value: '15', color: '#10b981' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-3 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pipeline Funnel ── */}
      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Users size={13} className="text-sky-400" /> Admissions Pipeline — Term 1 2025
          </p>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.label} className="relative">
              <div className="rounded-xl p-4 text-center" style={{ background: stage.bg, border: `1px solid ${stage.color}30` }}>
                <stage.icon size={20} style={{ color: stage.color }} className="mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stage.count}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{stage.label}</p>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Conversion rate bar */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-400">Conversion Rate (Inquiry → Enrolled)</p>
            <p className="text-[11px] font-bold text-emerald-400">31.3%</p>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: '31.3%', background: '#10b981' }} />
          </div>
        </div>
      </div>

      {/* ── Quick Links + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick navigation */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus size={13} className="text-emerald-400" /> Module Navigation
            </p>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {QUICK_LINKS.map(link => (
              <Link key={link.label} to={link.to}
                className="rounded-xl p-3 text-center hover:bg-white/[0.04] transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background: `${link.color}18` }}>
                  <ChevronRight size={14} style={{ color: link.color }} />
                </div>
                <p className="text-xs font-medium text-slate-300">{link.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <p className="text-xs font-bold text-emerald-300 mb-3">Key Metrics</p>
            {[
              { label: 'Applications this month', value: '12' },
              { label: 'Average processing time', value: '4.2 days' },
              { label: 'Acceptance rate', value: '43%' },
              { label: 'Enrollment target', value: '60 students' },
              { label: 'Current enrollment', value: '15 students' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs font-bold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
