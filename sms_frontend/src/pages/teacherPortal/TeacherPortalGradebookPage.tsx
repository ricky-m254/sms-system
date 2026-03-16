import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { GraduationCap, TrendingUp, AlertCircle } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Student = { id: number; full_name: string; admission_number: string }
type GradeEntry = { studentId: number; value: string }

const CATEGORIES = ['Homework', 'Quiz', 'CAT', 'Midterm', 'Final Exam']
const SUBJECTS = ['Mathematics', 'English', 'Science', 'Kiswahili', 'Social Studies', 'CRE', 'Art & Craft', 'Physical Education']

function gradeColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 65) return '#0ea5e9'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function letterGrade(score: number) {
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'E'
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v?.results ?? [])
}

export default function TeacherPortalGradebookPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0])
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0])
  const [grades, setGrades] = useState<Record<number, GradeEntry>>({})
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<Student[] | { results: Student[] }>('/students/?limit=200')
      .then(res => setStudents(asArray(res.data).slice(0, 20)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const init: Record<number, GradeEntry> = {}
    students.forEach(s => { init[s.id] = { studentId: s.id, value: '' } })
    setGrades(init)
    setSaved(false)
  }, [students, selectedSubject, selectedCategory])

  const setGrade = (studentId: number, value: string) => {
    if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
      setGrades(prev => ({ ...prev, [studentId]: { studentId, value } }))
    }
  }

  const saveGrades = () => {
    setSaved(true)
    setNotice(`Grades saved for ${selectedSubject} — ${selectedCategory} (${students.length} students)`)
    setTimeout(() => setNotice(null), 4000)
  }

  const avg = () => {
    const vals = Object.values(grades).map(g => Number(g.value)).filter(v => !isNaN(v) && v > 0)
    if (vals.length === 0) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  const filled = Object.values(grades).filter(g => g.value !== '').length

  return (
    <div className="space-y-6">
      <PageHero badge="TEACHER" badgeColor="purple" title="Gradebook" subtitle="Record and review student grades by subject and assessment type" icon="📊" />

      {/* Controls */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-white outline-none">
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assessment Type</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-white outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={saveGrades} disabled={filled === 0}
              className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition">
              Save Grades ({filled}/{students.length})
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Students', value: students.length, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Graded', value: filled, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Class Average', value: avg() ? `${avg()}%` : '—', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Pending', value: students.length - filled, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <p className="text-xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <GraduationCap size={14} /> {notice}
        </div>
      )}

      {/* Gradebook Table */}
      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-sm font-bold text-white">{selectedSubject} — {selectedCategory}</p>
            <p className="text-xs text-slate-500 mt-0.5">Enter scores out of 100</p>
          </div>
          {avg() && (
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} className="text-sky-400" />
              <span className="text-sm font-bold" style={{ color: gradeColor(Number(avg())) }}>
                Class avg: {avg()}%
              </span>
            </div>
          )}
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-slate-500">Loading students…</p>
        ) : students.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <AlertCircle size={28} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No students found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['#', 'Student', 'Admission No.', 'Score (/100)', 'Grade', 'Band'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const val = grades[s.id]?.value ?? ''
                  const num = val ? Number(val) : null
                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-white">{s.full_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{s.admission_number}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val}
                          onChange={e => setGrade(s.id, e.target.value)}
                          placeholder="—"
                          className="w-20 rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1 text-sm text-white text-center outline-none focus:border-violet-500/50"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {num !== null && !isNaN(num) ? (
                          <span className="font-bold text-sm" style={{ color: gradeColor(num) }}>
                            {letterGrade(num)}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {num !== null && !isNaN(num) ? (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: `${gradeColor(num)}18`, color: gradeColor(num) }}>
                            {num >= 80 ? 'Exceeding' : num >= 65 ? 'Meeting' : num >= 50 ? 'Approaching' : 'Below'}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CBC Grade bands legend */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">CBC Performance Bands</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { band: 'Exceeding Expectation', range: '80–100', color: '#10b981' },
            { band: 'Meeting Expectation', range: '65–79', color: '#0ea5e9' },
            { band: 'Approaching Expectation', range: '50–64', color: '#f59e0b' },
            { band: 'Below Expectation', range: '0–49', color: '#ef4444' },
          ].map(b => (
            <div key={b.band} className="rounded-xl p-3" style={{ background: `${b.color}10`, border: `1px solid ${b.color}25` }}>
              <p className="text-xs font-bold" style={{ color: b.color }}>{b.range}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{b.band}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
