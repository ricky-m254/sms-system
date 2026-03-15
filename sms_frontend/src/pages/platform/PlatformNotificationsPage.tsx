import { useState } from 'react'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Notification = {
  id: number
  title: string
  body: string
  type: 'announcement' | 'maintenance' | 'billing' | 'alert'
  audience: 'all' | 'enterprise' | 'professional' | 'starter'
  channels: string[]
  sent_at: string | null
  status: 'draft' | 'sent' | 'scheduled'
}

const INITIAL: Notification[] = [
  { id: 1, title: 'Scheduled Maintenance — 16 Mar 02:00 UTC', body: 'The platform will undergo maintenance for approximately 1 hour.', type: 'maintenance', audience: 'all', channels: ['email', 'sms', 'in-app'], sent_at: null, status: 'scheduled' },
  { id: 2, title: 'March Invoices Generated', body: 'March billing invoices have been generated. Please settle within 7 days.', type: 'billing', audience: 'all', channels: ['email', 'in-app'], sent_at: '2026-03-01', status: 'sent' },
  { id: 3, title: 'New Feature: AI Report Cards', body: 'AI-powered CBC report cards are now live for Enterprise tenants.', type: 'announcement', audience: 'enterprise', channels: ['email', 'in-app'], sent_at: '2026-02-20', status: 'sent' },
  { id: 4, title: 'Critical Security Patch Applied', body: 'A critical security patch has been deployed. No action required.', type: 'alert', audience: 'all', channels: ['email'], sent_at: '2026-02-10', status: 'sent' },
]

const TYPE_COLOR: Record<string, string> = {
  announcement: 'bg-blue-500/15 text-blue-300',
  maintenance: 'bg-amber-500/15 text-amber-300',
  billing: 'bg-violet-500/15 text-violet-300',
  alert: 'bg-red-500/15 text-red-300',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-white/10 text-slate-400',
  sent: 'bg-emerald-500/15 text-emerald-300',
  scheduled: 'bg-blue-500/15 text-blue-300',
}

export default function PlatformNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', type: 'announcement', audience: 'all', channels: ['email', 'in-app'] })
  const [message, setMessage] = useState<string | null>(null)

  const send = () => {
    if (!form.title.trim() || !form.body.trim()) return
    const n: Notification = {
      id: Date.now(),
      title: form.title,
      body: form.body,
      type: form.type as Notification['type'],
      audience: form.audience as Notification['audience'],
      channels: form.channels,
      sent_at: new Date().toISOString().slice(0, 10),
      status: 'sent',
    }
    setNotifications(prev => [n, ...prev])
    setForm({ title: '', body: '', type: 'announcement', audience: 'all', channels: ['email', 'in-app'] })
    setShowForm(false)
    setMessage('Notification broadcast sent successfully.')
    setTimeout(() => setMessage(null), 3000)
  }

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }))
  }

  return (
    <div className="space-y-6">
      <PageHero title="Notifications & Broadcast" subtitle="Send platform-wide announcements, maintenance alerts, and billing notifications" />

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">✓ {message}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Broadcast'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Compose Broadcast</h3>
          <div className="space-y-4">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <textarea
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Message body…"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Type</label>
                <select className="rounded-xl border border-white/10 bg-[#0d1623] px-3 py-2 text-sm text-slate-200" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="announcement">Announcement</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="billing">Billing</option>
                  <option value="alert">Alert</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Audience</label>
                <select className="rounded-xl border border-white/10 bg-[#0d1623] px-3 py-2 text-sm text-slate-200" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                  <option value="all">All Tenants</option>
                  <option value="enterprise">Enterprise Only</option>
                  <option value="professional">Professional Only</option>
                  <option value="starter">Starter Only</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Channels</label>
                <div className="flex gap-2">
                  {['email', 'sms', 'in-app'].map(ch => (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${form.channels.includes(ch) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={send} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors">
              Send Now
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map(n => (
          <div key={n.id} className="rounded-2xl p-5" style={GLASS}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${TYPE_COLOR[n.type]}`}>{n.type}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[n.status]}`}>{n.status}</span>
                  <span className="text-[10px] text-slate-500 uppercase">→ {n.audience === 'all' ? 'All Tenants' : n.audience}</span>
                </div>
                <p className="mt-2 font-semibold text-slate-200">{n.title}</p>
                <p className="mt-1 text-sm text-slate-400">{n.body}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{n.sent_at ?? 'Pending'}</p>
                <p className="mt-1">{n.channels.join(' · ')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
