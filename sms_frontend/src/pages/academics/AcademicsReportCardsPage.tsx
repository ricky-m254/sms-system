import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import CBCReportCardModal from '../../components/CBCReportCardModal'
import {
  FileText, Download, CheckCircle2, Share2, Zap,
  AlertTriangle, GraduationCap, Users, Eye,
} from 'lucide-react'

type SchoolClass = { id: number; display_name?: string; name: string }
type Term = { id: number; name: string }
type ReportCard = {
  id: number
  student: number
  student_name?: string
  class_section: number
  class_section_name?: string
  term: number
  term_name?: string
  academic_year_name?: string
  status: 'Draft' | 'Submitted' | 'Approved' | 'Published' | 'Distributed'
  overall_grade?: string
  class_rank?: number | null
  attendance_days: number
  teacher_remarks?: string
  principal_remarks?: string
  pdf_url?: string
}

function getErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data) return 'Request failed.'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const msgs: string[] = []
    Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
      if (Array.isArray(v)) msgs.push(`${k}: ${v.join(' ')}`)
      else if (typeof v === 'string') msgs.push(`${k}: ${v}`)
    })
    if (msgs.length) return msgs.join(' | ')
  }
  return 'Request failed.'
}

const STATUS_CFG: Record<ReportCard['status'], { color: string; bg: string; label: string }> = {
  Draft:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  label: 'Draft' },
  Submitted:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   label: 'Submitted' },
  Approved:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   label: 'Approved' },
  Published:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   label: 'Published' },
  Distributed: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Distributed' },
}

const GRADE_COLOR = (g?: string) => {
  if (!g) return '#94a3b8'
  const n = g.toUpperCase()
  if (n === 'A') return '#10b981'
  if (n.startsWith('B')) return '#38bdf8'
  if (n.startsWith('C')) return '#fbbf24'
  if (n.startsWith('D')) return '#f97316'
  return '#f87171'
}

export default function AcademicsReportCardsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [cards, setCards] = useState<ReportCard[]>([])
  const [selClass, setSelClass] = useState('')
  const [selTerm, setSelTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<ReportCard | null>(null)

  const loadAll = async () => {
    setIsLoading(true); setError(null)
    try {
      const [cRes, tRes, rRes] = await Promise.all([
        apiClient.get('/academics/classes/'),
        apiClient.get('/academics/ref/terms/'),
        apiClient.get('/academics/report-cards/'),
      ])
      setClasses(normalizePaginatedResponse<SchoolClass>(cRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(tRes.data).items)
      setCards(normalizePaginatedResponse<ReportCard>(rRes.data).items)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { void loadAll() }, [])

  const generateReportCards = async () => {
    if (!selClass || !selTerm) return
    setIsGenerating(true); setError(null); setFlash(null)
    try {
      const res = await apiClient.post('/academics/report-cards/generate/', {
        class_section: Number(selClass), term: Number(selTerm),
      })
      setFlash((res.data as { message?: string })?.message ?? 'Report cards generated.')
      await loadAll()
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setIsGenerating(false) }
  }

  const runAction = async (id: number, action: 'approve' | 'publish') => {
    setError(null); setFlash(null)
    try {
      await apiClient.post(`/academics/report-cards/${id}/${action}/`, {})
      setFlash(`Report card ${action}d.`)
      await loadAll()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const distributePublished = async () => {
    setError(null); setFlash(null)
    try {
      const ids = cards.filter(c => c.status === 'Published').map(c => c.id)
      const res = await apiClient.post('/academics/report-cards/distribute/', { report_card_ids: ids })
      setFlash(`Distributed ${(res.data as { count?: number })?.count ?? 0} report card(s).`)
      await loadAll()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const downloadPdf = async (id: number) => {
    setError(null)
    try {
      const res = await apiClient.get(`/academics/report-cards/${id}/pdf/`, { responseType: 'blob' })
      downloadFromResponse(res as { data: Blob; headers?: Record<string, unknown> }, `report_card_${id}.pdf`)
    } catch (err) { setError(extractApiErrorMessage(err, 'Unable to download PDF.')) }
  }

  // Stats
  const byStatus = (s: ReportCard['status']) => cards.filter(c => c.status === s).length
  const statusCounts = {
    total: cards.length,
    approved: byStatus('Approved'),
    published: byStatus('Published'),
    distributed: byStatus('Distributed'),
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Report Cards</h1>
          <p className="text-slate-400 text-sm mt-0.5">Generate, approve, publish and distribute student report cards</p>
        </div>
        <button onClick={distributePublished}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-90"
          style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
          <Share2 size={12} /> Distribute Published
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />{error}</div>}
      {flash && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />{flash}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cards',  value: statusCounts.total,       icon: FileText,    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
          { label: 'Approved',     value: statusCounts.approved,    icon: CheckCircle2,color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
          { label: 'Published',    value: statusCounts.published,   icon: Zap,         color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
          { label: 'Distributed',  value: statusCounts.distributed, icon: Share2,      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-3 right-3 w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={13} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{isLoading ? '…' : k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Generate panel */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Zap size={13} className="text-emerald-400" /> Generate Report Cards
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={selClass} onChange={e => setSelClass(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="">Select class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.display_name ?? c.name}</option>)}
          </select>
          <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="">Select term…</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={generateReportCards} disabled={isGenerating || !selClass || !selTerm}
            className="rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            <GraduationCap size={14} />
            {isGenerating ? 'Generating…' : 'Generate Report Cards'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <Users size={14} className="text-violet-400" />
          <p className="text-sm font-bold text-white">Report Card List</p>
          <span className="ml-auto text-[10px] font-bold text-slate-500 tabular-nums">{cards.length} cards</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Student', 'Class', 'Term', 'Grade', 'Rank', 'Attendance', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-600">Loading report cards…</td></tr>
              ) : cards.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <FileText size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No report cards yet.</p>
                  <p className="text-xs text-slate-700 mt-1">Select a class and term above, then click Generate.</p>
                </td></tr>
              ) : cards.map(item => {
                const cfg = STATUS_CFG[item.status]
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 text-sm text-slate-200 font-medium">{item.student_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.class_section_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.term_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold tabular-nums" style={{ color: GRADE_COLOR(item.overall_grade) }}>
                        {item.overall_grade || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{item.class_rank ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{item.attendance_days} days</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.status === 'Draft' || item.status === 'Submitted' ? (
                          <button onClick={() => runAction(item.id, 'approve')}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                            Approve
                          </button>
                        ) : null}
                        {item.status === 'Approved' ? (
                          <button onClick={() => runAction(item.id, 'publish')}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80"
                            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                            Publish
                          </button>
                        ) : null}
                        <button onClick={() => setSelectedCard(item)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80 flex items-center gap-1"
                          style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                          <Eye size={9} /> CBC View
                        </button>
                        <button onClick={() => downloadPdf(item.id)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold transition hover:opacity-80 flex items-center gap-1"
                          style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                          <Download size={9} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CBC Report Card Modal */}
      {selectedCard && (
        <CBCReportCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}
