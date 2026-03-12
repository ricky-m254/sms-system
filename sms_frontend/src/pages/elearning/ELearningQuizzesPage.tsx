import { useState } from 'react'
import { CheckCircle, Clock, Target, Trophy, BookOpen, ChevronRight, AlertCircle, BarChart2 } from 'lucide-react'
import PageHero from '../../components/PageHero'

const QUIZZES = [
  { id: 1, subject: 'Mathematics', title: 'Form 3 CAT: Quadratic Equations', questions: 20, timeLimit: 45, maxScore: 40, passPct: 50, attempts: 38, avgScore: 72, completed: true, myScore: 85, from: '#1d4ed8', to: '#3b82f6', dueDate: 'Submitted' },
  { id: 2, subject: 'Biology', title: 'Form 2: Cell Biology Quiz', questions: 25, timeLimit: 40, maxScore: 50, passPct: 50, attempts: 40, avgScore: 68, completed: true, myScore: 90, from: '#166534', to: '#22c55e', dueDate: 'Submitted' },
  { id: 3, subject: 'Chemistry', title: 'Organic Chemistry: Functional Groups', questions: 15, timeLimit: 30, maxScore: 30, passPct: 60, attempts: 35, avgScore: 61, completed: false, myScore: null, from: '#581c87', to: '#a855f7', dueDate: '14 Mar 2025' },
  { id: 4, subject: 'Physics', title: 'Electromagnetism: Faraday & Lenz', questions: 20, timeLimit: 35, maxScore: 40, passPct: 55, attempts: 28, avgScore: 55, completed: false, myScore: null, from: '#0c4a6e', to: '#0ea5e9', dueDate: '18 Mar 2025' },
  { id: 5, subject: 'English', title: 'Grammar & Comprehension Test', questions: 30, timeLimit: 60, maxScore: 60, passPct: 50, attempts: 44, avgScore: 70, completed: true, myScore: 78, from: '#065f46', to: '#10b981', dueDate: 'Submitted' },
  { id: 6, subject: 'Mathematics', title: 'Form 3: Matrices Quick Quiz', questions: 10, timeLimit: 20, maxScore: 20, passPct: 50, attempts: 0, avgScore: 0, completed: false, myScore: null, from: '#1d4ed8', to: '#3b82f6', dueDate: '20 Mar 2025' },
  { id: 7, subject: 'History', title: 'Colonial Kenya: Multiple Choice', questions: 20, timeLimit: 30, maxScore: 20, passPct: 50, attempts: 38, avgScore: 65, completed: false, myScore: null, from: '#7c2d12', to: '#f97316', dueDate: '21 Mar 2025' },
  { id: 8, subject: 'Computer Studies', title: 'Programming Fundamentals Quiz', questions: 25, timeLimit: 40, maxScore: 50, passPct: 55, attempts: 30, avgScore: 74, completed: true, myScore: 88, from: '#1e1b4b', to: '#6366f1', dueDate: 'Submitted' },
  { id: 9, subject: 'Kiswahili', title: 'Sarufi ya Kiswahili: Vihusishi', questions: 15, timeLimit: 25, maxScore: 30, passPct: 50, attempts: 42, avgScore: 58, completed: false, myScore: null, from: '#92400e', to: '#f59e0b', dueDate: '22 Mar 2025' },
  { id: 10, subject: 'Biology', title: 'Form 3: Genetics & Heredity', questions: 20, timeLimit: 35, maxScore: 40, passPct: 60, attempts: 0, avgScore: 0, completed: false, myScore: null, from: '#166534', to: '#22c55e', dueDate: '25 Mar 2025' },
]

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const completed = QUIZZES.filter(q => q.completed)
  const pending = QUIZZES.filter(q => !q.completed)
  const avgMyScore = completed.length > 0 ? Math.round(completed.reduce((s, q) => s + (q.myScore || 0), 0) / completed.length) : 0

  const shown = filter === 'completed' ? completed : filter === 'pending' ? pending : QUIZZES

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Quizzes', value: QUIZZES.length, icon: BookOpen, color: '#6366f1' },
          { label: 'Completed', value: completed.length, icon: CheckCircle, color: '#10b981' },
          { label: 'Pending', value: pending.length, icon: AlertCircle, color: '#f59e0b' },
          { label: 'Avg Score', value: `${avgMyScore}%`, icon: Trophy, color: '#3b82f6' },
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
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
            style={filter === f
              ? { background: '#10b981', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
            {f === 'all' ? 'All Quizzes' : f === 'pending' ? `Pending (${pending.length})` : `Completed (${completed.length})`}
          </button>
        ))}
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shown.map(q => (
          <GlassCard key={q.id} className={`p-5 hover:border-slate-600 transition-all ${!q.completed ? 'cursor-pointer' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${q.from}, ${q.to})` }}>
                {q.subject.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: q.to }}>{q.subject}</p>
                    <p className="text-sm font-bold text-white leading-snug mt-0.5">{q.title}</p>
                  </div>
                  {q.completed && q.myScore !== null && (
                    <ScoreRing score={q.myScore} max={100} color={q.myScore >= 70 ? '#10b981' : q.myScore >= 50 ? '#f59e0b' : '#ef4444'} />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Target size={12} /> {q.questions} Qs</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {q.timeLimit} min</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400"><BarChart2 size={12} /> Avg: {q.avgScore > 0 ? `${q.avgScore}%` : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    {q.completed ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                        <CheckCircle size={11} /> Submitted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-400"><Clock size={11} /> Due: {q.dueDate}</span>
                    )}
                  </div>
                  {!q.completed ? (
                    <button className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90" style={{ background: '#10b981', color: '#fff' }}>
                      Start Quiz <ChevronRight size={13} />
                    </button>
                  ) : (
                    <button className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                      View Results <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
