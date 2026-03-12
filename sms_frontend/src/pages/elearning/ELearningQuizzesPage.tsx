import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Clock, Target, Trophy, BookOpen, ChevronRight, AlertCircle, BarChart2, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
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
  subject_name?: string
}

interface Question {
  id: number
  question_text: string
  question_type: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  marks: number
  sequence: number
}

interface QuizResult {
  earned: number
  total: number
  pct: number
  answers: Record<number, string>
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
function guessColors(name: string) {
  for (const [subj, colors] of Object.entries(SUBJECT_COLORS)) {
    if (name.toLowerCase().includes(subj.toLowerCase())) return colors
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
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 28 28)" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  )
}

function QuizTaker({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiClient.get(`elearning/questions/?quiz=${quiz.id}`)
      .then(r => {
        const data = r.data
        setQuestions(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [quiz.id])

  const handleSubmit = useCallback(() => {
    setSubmitting(true)
    let earned = 0
    let total = 0
    questions.forEach(q => {
      total += q.marks
      const given = (answers[q.id] ?? '').trim().toUpperCase()
      const correct = (q.correct_answer ?? '').trim().toUpperCase()
      if (q.question_type === 'MCQ' || q.question_type === 'TF') {
        if (given === correct) earned += q.marks
      }
    })
    const pct = total > 0 ? Math.round((earned / total) * 100) : 0
    setTimeout(() => {
      setResult({ earned, total, pct, answers })
      setSubmitting(false)
    }, 600)
  }, [questions, answers])

  const { from, to } = guessColors(quiz.subject_name || quiz.title)
  const answered = Object.keys(answers).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-2xl">
        <GlassCard className="overflow-hidden">
          {/* Header */}
          <div className="p-5 flex items-start justify-between" style={{ background: `linear-gradient(135deg, ${from}99, ${to}99)` }}>
            <div>
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider">{quiz.course_name}</p>
              <h2 className="text-lg font-display font-bold text-white mt-0.5">{quiz.title}</h2>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                <span className="flex items-center gap-1"><Target size={11} /> {quiz.question_count} Questions</span>
                {quiz.time_limit_minutes && <span className="flex items-center gap-1"><Clock size={11} /> {quiz.time_limit_minutes} min</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {result ? (
              /* Result Screen */
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <ScoreRing score={result.earned} max={result.total} color={result.pct >= 70 ? '#10b981' : result.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                </div>
                <div>
                  <p className="text-3xl font-display font-bold text-white">{result.pct}%</p>
                  <p className="text-slate-400 text-sm mt-1">{result.earned} / {result.total} marks</p>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={result.pct >= 70
                    ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                    : result.pct >= 50
                    ? { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }
                    : { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
                >
                  {result.pct >= 70 ? <><Trophy size={15} /> Excellent! Well done</> : result.pct >= 50 ? <><CheckCircle size={15} /> Good effort, keep practicing</> : <><AlertCircle size={15} /> Review and try again</>}
                </div>
                {/* Review answers */}
                <div className="mt-4 space-y-3 text-left">
                  {questions.map((q, i) => {
                    const given = (result.answers[q.id] ?? '').trim().toUpperCase()
                    const correct = (q.correct_answer ?? '').trim().toUpperCase()
                    const isCorrect = given === correct
                    return (
                      <div key={q.id} className="rounded-xl border p-3" style={{ borderColor: isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', background: isCorrect ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                        <p className="text-xs font-semibold text-white">Q{i + 1}. {q.question_text}</p>
                        <p className="text-xs mt-1" style={{ color: isCorrect ? '#34d399' : '#fca5a5' }}>
                          Your answer: {given || '(none)'} {isCorrect ? '✓' : `✗ — Correct: ${correct}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#10b981', color: '#fff' }}
                >
                  Done
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="text-emerald-500 animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen size={36} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No questions available for this quiz yet.</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>Close</button>
              </div>
            ) : (
              /* Questions */
              <>
                {quiz.instructions && (
                  <div className="rounded-xl border p-3 text-xs text-slate-300" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}>
                    <strong className="text-indigo-300">Instructions:</strong> {quiz.instructions}
                  </div>
                )}
                <div className="space-y-4">
                  {questions.map((q, i) => {
                    const opts: Array<{ key: string; label: string }> = []
                    if (q.question_type === 'TF') {
                      opts.push({ key: 'True', label: 'True' }, { key: 'False', label: 'False' })
                    } else {
                      if (q.option_a) opts.push({ key: 'A', label: `A. ${q.option_a}` })
                      if (q.option_b) opts.push({ key: 'B', label: `B. ${q.option_b}` })
                      if (q.option_c) opts.push({ key: 'C', label: `C. ${q.option_c}` })
                      if (q.option_d) opts.push({ key: 'D', label: `D. ${q.option_d}` })
                    }
                    const sel = answers[q.id]
                    return (
                      <div key={q.id} className="rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <p className="text-sm font-semibold text-white mb-3">
                          <span className="text-slate-500 mr-2">Q{i + 1}.</span>
                          {q.question_text}
                          <span className="ml-2 text-xs text-slate-500">({q.marks} mark{q.marks !== 1 ? 's' : ''})</span>
                        </p>
                        {opts.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {opts.map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                                className="text-left px-3 py-2 rounded-lg text-sm transition-all"
                                style={sel === opt.key
                                  ? { background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#34d399' }
                                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            value={answers[q.id] ?? ''}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Type your answer…"
                            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">{answered} / {questions.length} answered</p>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || answered === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{ background: '#10b981', color: '#fff' }}
                  >
                    {submitting ? <><Loader2 size={15} className="animate-spin" /> Grading…</> : <><Trophy size={15} /> Submit Quiz</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

export default function ELearningQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'published'>('all')
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

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
      {activeQuiz && <QuizTaker quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

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
              const { from, to } = guessColors(q.subject_name || q.title)
              const subjectLabel = q.subject_name || q.title.split('—')[0]?.trim() || 'General'
              const isExpanded = expandedId === q.id
              return (
                <GlassCard key={q.id} className="p-5 hover:border-slate-600 transition-all">
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
                          {q.course_name && <p className="text-xs text-slate-500 mt-0.5">{q.course_name}</p>}
                        </div>
                        {q.attempt_count > 0 && (
                          <ScoreRing score={q.attempt_count} max={q.max_attempts} color="#10b981" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Target size={12} /> {q.question_count} Qs</span>
                        {q.time_limit_minutes && <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {q.time_limit_minutes} min</span>}
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Details
                          </button>
                          {q.is_published && q.question_count > 0 && (
                            <button
                              onClick={() => setActiveQuiz(q)}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                              style={{ background: '#10b981', color: '#fff' }}
                            >
                              Start Quiz <ChevronRight size={13} />
                            </button>
                          )}
                          {!q.is_published && (
                            <button
                              onClick={() => setActiveQuiz(q)}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                              style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
                            >
                              Preview <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1 text-xs text-slate-400">
                          {q.instructions && <p><span className="text-slate-500">Instructions:</span> {q.instructions}</p>}
                          <p><span className="text-slate-500">Max Attempts:</span> {q.max_attempts}</p>
                          {q.due_date && <p><span className="text-slate-500">Due:</span> {new Date(q.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        </div>
                      )}
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
