import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { GraduationCap, BookOpen, Calendar, Plus, Trash2, Save, AlertCircle, Check } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface AcademicConfig {
  academic_year_start: string
  academic_year_end: string
  school_type: string
  school_gender_type: string
  grading_system: string
  max_students_per_class: number
  terms_per_year: number
  default_term_duration_weeks: number
  promotion_policy: string
}

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

interface AcademicYear { id?: number; name: string; start_date: string; end_date: string; is_current: boolean }
interface Term { id?: number; name: string; start_date: string; end_date: string }
interface GradeLevel { id?: number; name: string; capacity: number; order: number }
interface Subject { id?: number; name: string; code: string; grade_levels: string }

function SectionHeader({ icon: Icon, color, title, desc }: { icon: React.ElementType; color: string; title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">{title}</h2>
      </div>
      {desc && <p className="mt-1 text-xs text-slate-500 ml-6">{desc}</p>}
    </div>
  )
}

export default function SettingsAcademicsConfigPage() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [config, setConfig] = useState<AcademicConfig>({
    academic_year_start: '2026-01-01',
    academic_year_end: '2026-12-31',
    school_type: 'secondary',
    school_gender_type: 'coed',
    grading_system: 'letter',
    max_students_per_class: 40,
    terms_per_year: 3,
    default_term_duration_weeks: 13,
    promotion_policy: 'auto',
  })

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([
    { name: '2026', start_date: '2026-01-01', end_date: '2026-12-31', is_current: true },
  ])

  const [terms, setTerms] = useState<Term[]>([
    { name: 'Term 1', start_date: '2026-01-07', end_date: '2026-04-04' },
    { name: 'Term 2', start_date: '2026-05-05', end_date: '2026-08-07' },
    { name: 'Term 3', start_date: '2026-09-01', end_date: '2026-11-27' },
  ])

  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([
    { name: 'Form 1', capacity: 40, order: 1 },
    { name: 'Form 2', capacity: 40, order: 2 },
    { name: 'Form 3', capacity: 40, order: 3 },
    { name: 'Form 4', capacity: 40, order: 4 },
  ])

  const [subjects, setSubjects] = useState<Subject[]>([
    { name: 'Mathematics', code: 'MATH', grade_levels: 'All' },
    { name: 'English', code: 'ENG', grade_levels: 'All' },
    { name: 'Kiswahili', code: 'KSW', grade_levels: 'All' },
    { name: 'Physics', code: 'PHY', grade_levels: 'Form 3, Form 4' },
    { name: 'Chemistry', code: 'CHEM', grade_levels: 'Form 3, Form 4' },
    { name: 'Biology', code: 'BIO', grade_levels: 'Form 3, Form 4' },
  ])

  useEffect(() => {
    apiClient.get<any>('/school/profile/').then(r => {
      const p = r.data.profile ?? r.data
      if (p.academic_year_start) setConfig(c => ({ ...c, academic_year_start: p.academic_year_start, academic_year_end: p.academic_year_end || c.academic_year_end }))
    }).catch(() => {})
  }, [])

  const setC = <K extends keyof AcademicConfig>(k: K, v: AcademicConfig[K]) => setConfig(c => ({ ...c, [k]: v }))

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', {
        academic_year_start: config.academic_year_start,
        academic_year_end: config.academic_year_end,
      })
      setSuccess('Academic configuration saved successfully.')
    } catch { setError('Failed to save configuration.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="sky"
        title="Academics Config"
        subtitle="Grading scale, CBC strands and subject setup"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Academic Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">Define your school's academic structure — years, terms, grades, classes, and subjects. This configuration drives all academic modules.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* School Type */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <SectionHeader icon={GraduationCap} color="text-violet-400" title="School Classification" desc="Define what type of school this is — affects available academic modules." />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">School Type</label>
            <select value={config.school_type} onChange={e => setC('school_type', e.target.value)} className={cls}>
              <option value="primary">Primary School</option>
              <option value="secondary">Secondary School</option>
              <option value="college">College / Tertiary</option>
              <option value="mixed">Primary + Secondary</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">School Gender</label>
            <select value={config.school_gender_type} onChange={e => setC('school_gender_type', e.target.value)} className={cls}>
              <option value="coed">Mixed (Co-ed)</option>
              <option value="boys">Boys Only</option>
              <option value="girls">Girls Only</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Max Students / Class</label>
            <input type="number" min={1} max={200} value={config.max_students_per_class} onChange={e => setC('max_students_per_class', +e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Grading System</label>
            <select value={config.grading_system} onChange={e => setC('grading_system', e.target.value)} className={cls}>
              <option value="letter">Letter Grades (A, B, C, D, E)</option>
              <option value="percentage">Percentage Only</option>
              <option value="points">Point System (KCSE 0–12)</option>
              <option value="gpa">GPA (4.0 Scale)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Promotion Policy</label>
            <select value={config.promotion_policy} onChange={e => setC('promotion_policy', e.target.value)} className={cls}>
              <option value="auto">Automatic (end of year)</option>
              <option value="manual">Manual (admin decision)</option>
              <option value="exam">Based on exam results</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Terms Per Year</label>
            <select value={config.terms_per_year} onChange={e => setC('terms_per_year', +e.target.value)} className={cls}>
              <option value={2}>2 Semesters</option>
              <option value={3}>3 Terms</option>
              <option value={4}>4 Quarters</option>
            </select>
          </div>
        </div>
      </section>

      {/* Academic Years */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <SectionHeader icon={Calendar} color="text-sky-400" title="Academic Years" desc="Define your school's academic calendar years." />
        <div className="space-y-2">
          {academicYears.map((y, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={y.name} onChange={e => setAcademicYears(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Year name e.g. 2026" className={`${cls} col-span-3`} />
              <input type="date" value={y.start_date} onChange={e => setAcademicYears(p => p.map((x, j) => j === i ? { ...x, start_date: e.target.value } : x))} className={`${cls} col-span-3`} />
              <input type="date" value={y.end_date} onChange={e => setAcademicYears(p => p.map((x, j) => j === i ? { ...x, end_date: e.target.value } : x))} className={`${cls} col-span-3`} />
              <div className="col-span-2 flex items-center gap-1.5">
                <input type="checkbox" checked={y.is_current} onChange={() => setAcademicYears(p => p.map((x, j) => ({ ...x, is_current: j === i })))} className="rounded" />
                <span className="text-xs text-slate-400">Current</span>
              </div>
              <button onClick={() => setAcademicYears(p => p.filter((_, j) => j !== i))} className="col-span-1 text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-600 px-1">
          <div className="col-span-3">Year Name</div><div className="col-span-3">Start Date</div><div className="col-span-3">End Date</div><div className="col-span-2">Active</div>
        </div>
        <button onClick={() => setAcademicYears(p => [...p, { name: '2027', start_date: '2027-01-01', end_date: '2027-12-31', is_current: false }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition">
          <Plus className="h-3.5 w-3.5" /> Add Academic Year
        </button>
      </section>

      {/* Terms */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <SectionHeader icon={Calendar} color="text-amber-400" title="Terms / Semesters" desc="Configure term dates for the current academic year." />
        <div className="space-y-2">
          {terms.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={t.name} onChange={e => setTerms(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="e.g. Term 1" className={`${cls} col-span-4`} />
              <input type="date" value={t.start_date} onChange={e => setTerms(p => p.map((x, j) => j === i ? { ...x, start_date: e.target.value } : x))} className={`${cls} col-span-3`} />
              <input type="date" value={t.end_date} onChange={e => setTerms(p => p.map((x, j) => j === i ? { ...x, end_date: e.target.value } : x))} className={`${cls} col-span-4`} />
              <button onClick={() => setTerms(p => p.filter((_, j) => j !== i))} className="col-span-1 text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setTerms(p => [...p, { name: `Term ${p.length + 1}`, start_date: '', end_date: '' }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition">
          <Plus className="h-3.5 w-3.5" /> Add Term
        </button>
      </section>

      {/* Grade Levels */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <SectionHeader icon={GraduationCap} color="text-emerald-400" title="Grade / Form Levels" desc="Define the grade levels in your school. Classes/streams are created per grade." />
        <div className="space-y-2">
          {gradeLevels.map((g, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={g.name} onChange={e => setGradeLevels(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="e.g. Form 1" className={`${cls} col-span-5`} />
              <input type="number" value={g.capacity} min={1} onChange={e => setGradeLevels(p => p.map((x, j) => j === i ? { ...x, capacity: +e.target.value } : x))} placeholder="Max students" className={`${cls} col-span-3`} />
              <input type="number" value={g.order} min={1} onChange={e => setGradeLevels(p => p.map((x, j) => j === i ? { ...x, order: +e.target.value } : x))} placeholder="Order" className={`${cls} col-span-3`} />
              <button onClick={() => setGradeLevels(p => p.filter((_, j) => j !== i))} className="col-span-1 text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-600 px-1">
          <div className="col-span-5">Grade Name</div><div className="col-span-3">Max Students</div><div className="col-span-3">Display Order</div>
        </div>
        <button onClick={() => setGradeLevels(p => [...p, { name: '', capacity: 40, order: p.length + 1 }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition">
          <Plus className="h-3.5 w-3.5" /> Add Grade Level
        </button>
      </section>

      {/* Subjects */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <SectionHeader icon={BookOpen} color="text-rose-400" title="Subjects" desc="Define the subjects offered. Each can be assigned to specific grade levels." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.07] text-[10px] text-slate-500 uppercase tracking-widest">
              <th className="text-left pb-2 font-semibold">Subject Name</th>
              <th className="text-left pb-2 font-semibold pl-2">Code</th>
              <th className="text-left pb-2 font-semibold pl-2">Assigned To</th>
              <th className="pb-2 w-8"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-800/50">
              {subjects.map((s, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2"><input value={s.name} onChange={e => setSubjects(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Subject name" className={cls} /></td>
                  <td className="py-1.5 px-2"><input value={s.code} onChange={e => setSubjects(p => p.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} placeholder="Code" className={cls} /></td>
                  <td className="py-1.5 px-2"><input value={s.grade_levels} onChange={e => setSubjects(p => p.map((x, j) => j === i ? { ...x, grade_levels: e.target.value } : x))} placeholder="All / Form 1, Form 2" className={cls} /></td>
                  <td className="py-1.5 pl-2"><button onClick={() => setSubjects(p => p.filter((_, j) => j !== i))} className="text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setSubjects(p => [...p, { name: '', code: '', grade_levels: 'All' }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition">
          <Plus className="h-3.5 w-3.5" /> Add Subject
        </button>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Academic Configuration'}
        </button>
      </div>
    </div>
  )
}
