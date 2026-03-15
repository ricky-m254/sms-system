import { useState } from 'react'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type ApiKey = {
  id: number
  tenant: string
  label: string
  key: string
  created: string
  last_used: string | null
  active: boolean
}

type Integration = {
  id: number
  name: string
  category: string
  status: 'connected' | 'disconnected' | 'error'
  description: string
  icon: string
}

const API_KEYS: ApiKey[] = [
  { id: 1, tenant: 'Greenfield Academy', label: 'Primary API Key', key: 'sk_live_gf_••••••••4a2f', created: '2026-01-10', last_used: '2026-03-15', active: true },
  { id: 2, tenant: 'Sunrise Primary', label: 'Webhook Key', key: 'sk_live_sp_••••••••9b1c', created: '2026-02-05', last_used: '2026-03-14', active: true },
  { id: 3, tenant: 'Demo School', label: 'Test Key', key: 'sk_test_ds_••••••••3e7d', created: '2026-03-01', last_used: null, active: false },
]

const INTEGRATIONS: Integration[] = [
  { id: 1, name: 'Stripe', category: 'Payments', status: 'connected', description: 'Fee collection and subscription billing', icon: '💳' },
  { id: 2, name: 'Africa\'s Talking', category: 'SMS', status: 'connected', description: 'SMS notifications to parents and staff', icon: '📱' },
  { id: 3, name: 'Google Workspace', category: 'Productivity', status: 'connected', description: 'SSO and Drive document integration', icon: '🔵' },
  { id: 4, name: 'Zoom', category: 'Video', status: 'disconnected', description: 'Virtual classroom integration for CBC e-learning', icon: '🎥' },
  { id: 5, name: 'M-Pesa', category: 'Payments', status: 'connected', description: 'Mobile money fee collection (Kenya)', icon: '📲' },
  { id: 6, name: 'SendGrid', category: 'Email', status: 'error', description: 'Transactional email delivery', icon: '📧' },
]

const STATUS_COLOR: Record<string, string> = {
  connected: 'bg-emerald-500/15 text-emerald-300',
  disconnected: 'bg-white/10 text-slate-400',
  error: 'bg-red-500/15 text-red-400',
}

export default function PlatformApiIntegrationsPage() {
  const [keys, setKeys] = useState<ApiKey[]>(API_KEYS)
  const [message, setMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tenant: 'Greenfield Academy', label: '' })

  const revoke = (id: number) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, active: false } : k))
    setMessage('API key revoked.')
    setTimeout(() => setMessage(null), 2500)
  }

  const generate = () => {
    if (!form.label.trim()) return
    const newKey: ApiKey = {
      id: Date.now(),
      tenant: form.tenant,
      label: form.label,
      key: `sk_live_${Math.random().toString(36).slice(2, 6)}_••••••••${Math.random().toString(36).slice(2, 6)}`,
      created: new Date().toISOString().slice(0, 10),
      last_used: null,
      active: true,
    }
    setKeys(prev => [newKey, ...prev])
    setForm({ tenant: 'Greenfield Academy', label: '' })
    setShowForm(false)
    setMessage('New API key generated.')
    setTimeout(() => setMessage(null), 2500)
  }

  return (
    <div className="space-y-6">
      <PageHero title="API & Integration Management" subtitle="Manage tenant API keys, webhooks, and third-party integrations" />

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">✓ {message}</div>
      )}

      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Active Integrations</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map(i => (
            <div key={i.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.018] p-4">
              <span className="text-2xl">{i.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-200 text-sm">{i.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[i.status]}`}>{i.status}</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-0.5">{i.category}</p>
                <p className="text-xs text-slate-400">{i.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Tenant API Keys</h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Generate Key'}
          </button>
        </div>

        {showForm && (
          <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <select
              className="rounded-xl border border-white/10 bg-[#0d1623] px-3 py-2 text-sm text-slate-200"
              value={form.tenant}
              onChange={e => setForm(f => ({ ...f, tenant: e.target.value }))}
            >
              {['Greenfield Academy', 'Sunrise Primary', 'Demo School', 'Hillside Secondary'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              className="flex-1 min-w-[180px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Key label (e.g. Production Key)"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
            <button onClick={generate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors">
              Generate
            </button>
          </div>
        )}

        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-opacity ${k.active ? 'border-white/5 bg-white/[0.018]' : 'border-white/5 bg-white/[0.008] opacity-50'}`}>
              <div>
                <p className="font-medium text-slate-200">{k.label} <span className="text-xs text-slate-500">— {k.tenant}</span></p>
                <code className="text-xs text-slate-400 font-mono">{k.key}</code>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Created: {k.created}</span>
                <span>Last used: {k.last_used ?? 'never'}</span>
                {k.active && (
                  <button onClick={() => revoke(k.id)} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition-colors">
                    Revoke
                  </button>
                )}
                {!k.active && <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-500">Revoked</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
