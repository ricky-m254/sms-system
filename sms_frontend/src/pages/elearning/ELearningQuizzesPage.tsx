import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Target, Trophy, BookOpen, ChevronRight, AlertCircle, BarChart2, Loader2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

interface Quiz {
  id: number
  title: string
  instructions: string
  time_limit_minutes: number
  max_attempts: number
  is_published: boolean
  due_date: string | null
  question_count: number
  attempt_count: number
  created_at: string
  course: number
  course_name?: string
}

const SUBJECT_COLORS: Record<string, { from: string; to: string }> = {
  'Mathematics':    { from: '#1d4ed8', to: '#3b82f6' },
  'Biology':        { from: '#166534', to: '#22c55e' },
  'Chemistry':      { from: '#581c87', to: '#a855f7' },
  'Physics':        { from: '#0c4a6e', to: '#0ea5e9' },
  'English':        { from: '#065f46', to: '#10b981' },
  'Kiswahili':      { from: '#92400e', to: '#f59e0b' },
  'History':        { from: '#7c2d12', to: '#f97316' },
  'Geography':      { from: '#14532d', to: '#84cc16' },
  'Computer Studies': { from: '#1e1b4b', to: '#6366f1' },
  'Business Studies': { from: '#1e3a5f', to: '#64748b' },
  'Agriculture':    { from: '#052e16', to: '#16a34a' },
}
function guessSubjectColors(title: string) {
  for (const [subj, colors] of Object.entries(SUBJECT_COLORS)) {
    if (title.toLowerCase().includes(subj.toLowerCase())) return colors
  }
  return { from: '#1e293b', to: '#475569' }
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

function ScoreRing({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.round((score / max) * 100)
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="flex flex-col items-center">
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 28 28)" />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
    </div>
  )
}

export default function ELearningQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'published'>('all')

  useEffect(() => {
    apiClient.get('elearning/quizzes/')
      .then(r => {
        const data = r.data
        setQuizzes(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false))
  }, [])

  const published = quizzes.filter(q => q.is_published)
  const pending = quizzes.filter(q => !q.is_published)
  const withAttempts = quizzes.filter(q => q.attempt_count > 0)

  const shown =
    filter === 'published' ? published :
    filter === 'pending' ? pending :
    quizzes

  return (
    <div className="space-y-6">
      <PageHero
        badge="E-LEARNING"
        badgeColor="violet"
        title="Quiz Bank"
        subtitle="CBC-aligned quizzes and assessments per subject"
        icon="🎓"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Quizzes & Assessments</h1>
          <p className="text-slate-400 text-sm mt-1">Online quizzes set by your teachers</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Quizzes', value: quizzes.length, icon: BookOpen, color: '#6366f1' },
              { label: 'Published', value: published.length, icon: CheckCircle, color: '#10b981' },
              { label: 'Drafts', value: pending.length, icon: AlertCircle, color: '#f59e0b' },
              { label: 'With Attempts', value: withAttempts.length, icon: Trophy, color: '#3b82f6' },
            ].map(s => {
              const Icon = s.icon
              return (
                <GlassCard key={s.label} className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                    <Icon size={20} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-white">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                </GlassCard>
              )
            })}
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {([['all', 'All Quizzes'], ['published', `Published (${published.length})`], ['pending', `Drafts (${pending.length})`]] as const).map(([f, label]) => (
              <button
                key={f} onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={filter === f
                  ? { background: '#10b981', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quiz Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.length === 0 ? (
              <GlassCard className="col-span-full p-10 text-center">
                <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">No quizzes found</p>
              </GlassCard>
            ) : shown.map(q => {
              const { from, to } = guessSubjectColors(q.title)
              const subjectLabel = q.title.split('—')[0]?.trim() ?? 'General'
              return (
                <GlassCard key={q.id} className="p-5 hover:border-slate-600 transition-all cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                    >
                      {subjectLabel.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: to }}>{subjectLabel}</p>
                          <p className="text-sm font-bold text-white leading-snug mt-0.5">{q.title}</p>
                        </div>
                        {q.attempt_count > 0 && (
                          <ScoreRing score={q.attempt_count} max={q.max_attempts} color="#10b981" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Target size={12} /> {q.question_count} Qs</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {q.time_limit_minutes} min</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><BarChart2 size={12} /> {q.attempt_count} attempts</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          {q.is_published ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                              <CheckCircle size={11} /> Published
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-400"><Clock size={11} /> Draft</span>
                          )}
                        </div>
                        <button
                          className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                          style={{ background: q.is_published ? '#10b981' : 'rgba(255,255,255,0.05)', color: q.is_published ? '#fff' : '#64748b' }}
                        >
                          {q.is_published ? 'Start Quiz' : 'Preview'} <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
