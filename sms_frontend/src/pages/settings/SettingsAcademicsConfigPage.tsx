import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { Check, AlertCircle, GraduationCap, BookOpen, Hash, Calendar } from 'lucide-react'

interface AcademicsConfig {
  academic_year_start_month: number
  terms_per_year: number
  grading_system: string
  max_grade: number
  pass_mark: number
  report_card_footer: string
  class_promotion_auto: boolean
  subject_combination_required: boolean
}

const DEFAULTS: AcademicsConfig = {
  academic_year_start_month: 1,
  terms_per_year: 3,
  grading_system: 'KCSE',
  max_grade: 100,
  pass_mark: 40,
  report_card_footer: '',
  class_promotion_auto: false,
  subject_combination_required: false,
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const cls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition'

const GRADING_SYSTEMS = [
  { value: 'KCSE', label: 'KCSE — Kenya Certificate of Secondary Education' },
  { value: 'KCPE', label: 'KCPE — Kenya Certificate of Primary Education' },
  { value: 'CBC', label: 'CBC — Competency Based Curriculum' },
  { value: 'IGCSE', label: 'Cambridge IGCSE' },
  { value: 'IB', label: 'International Baccalaureate' },
  { value: 'CUSTOM', label: 'Custom / Institutional' },
]

export default function SettingsAcademicsConfigPage() {
  const [form, setForm] = useState<AcademicsConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<any>('/school/module-config/?module=academics').then(r => {
      const d = r.data.config ?? {}
      setForm({ ...DEFAULTS, ...d })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const setF = <K extends keyof AcademicsConfig>(k: K, v: AcademicsConfig[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.post('/school/module-config/', { module: 'academics', config: form })
      setSuccess('Academic configuration saved successfully.')
    } catch { setError('Failed to save configuration.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-20 text-center text-slate-500 animate-pulse">Loading…</div>

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Academic Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">Configure academic year structure, grading system, report card settings, and promotion rules.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* Year Structure */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-sky-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Academic Year Structure</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Year Start Month</label>
            <select value={form.academic_year_start_month} onChange={e => setF('academic_year_start_month', Number(e.target.value))} className={cls}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Terms per Academic Year</label>
            <select value={form.terms_per_year} onChange={e => setF('terms_per_year', Number(e.target.value))} className={cls}>
              <option value={2}>2 Terms (Semester)</option>
              <option value={3}>3 Terms (Trimester)</option>
              <option value={4}>4 Terms (Quarters)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Grading */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1"><GraduationCap className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Grading System</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Curriculum / Grading System</label>
            <select value={form.grading_system} onChange={e => setF('grading_system', e.target.value)} className={cls}>
              {GRADING_SYSTEMS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Maximum Grade / Marks</label>
            <input type="number" min={1} max={1000} value={form.max_grade} onChange={e => setF('max_grade', Number(e.target.value))} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Pass Mark</label>
            <input type="number" min={0} max={form.max_grade} value={form.pass_mark} onChange={e => setF('pass_mark', Number(e.target.value))} className={cls} />
            <p className="text-[10px] text-slate-600 mt-1">Minimum marks required to pass a subject</p>
          </div>
        </div>
      </section>

      {/* Report Cards */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1"><BookOpen className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Report Cards</h2></div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Report Card Footer Text</label>
          <textarea value={form.report_card_footer} onChange={e => setF('report_card_footer', e.target.value)} rows={3}
            placeholder="e.g. 'This report is computer-generated and is valid without a signature.' or school motto" className={`${cls} resize-none`} />
        </div>
      </section>

      {/* Promotion Rules */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1"><Hash className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Promotion & Subject Rules</h2></div>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.class_promotion_auto} onChange={e => setF('class_promotion_auto', e.target.checked)} className="mt-0.5 rounded border-slate-700 bg-slate-950 accent-emerald-500" />
            <div>
              <p className="text-sm text-slate-200 font-medium">Auto-promote students at end of year</p>
              <p className="text-xs text-slate-500">Students are automatically moved to the next class when the academic year ends. Manual review can still be performed.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.subject_combination_required} onChange={e => setF('subject_combination_required', e.target.checked)} className="mt-0.5 rounded border-slate-700 bg-slate-950 accent-emerald-500" />
            <div>
              <p className="text-sm text-slate-200 font-medium">Require subject combinations for upper classes</p>
              <p className="text-xs text-slate-500">Students in Form 3/4 or Senior years must be assigned a subject combination (Arts, Sciences, Commerce, etc.).</p>
            </div>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Academic Configuration'}
        </button>
      </div>
    </div>
  )
}
