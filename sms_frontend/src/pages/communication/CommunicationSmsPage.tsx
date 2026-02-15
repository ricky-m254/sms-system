import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type SmsRow = { id: number; recipient_phone: string; channel: string; status: string; message: string; failure_reason: string }
type Balance = { provider_configured: boolean; balance: string; note: string }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function CommunicationSmsPage() {
  const [rows, setRows] = useState<SmsRow[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [phones, setPhones] = useState('')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('SMS')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const [smsResponse, balanceResponse] = await Promise.all([
        apiClient.get<SmsRow[] | { results: SmsRow[] }>('/communication/sms/'),
        apiClient.get<Balance>('/communication/sms/balance/'),
      ])
      setRows(asArray(smsResponse.data))
      setBalance(balanceResponse.data)
    } catch {
      setError('Unable to load SMS gateway.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const send = async () => {
    const list = phones.split(',').map((v) => v.trim()).filter(Boolean)
    if (!list.length || !message.trim()) return
    await apiClient.post('/communication/sms/send/', {
      phones: list,
      message: message.trim(),
      channel,
    })
    setMessage('')
    await load()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">SMS Gateway</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">SMS / WhatsApp Placeholder Transport</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
        <p><strong>Provider configured:</strong> {balance?.provider_configured ? 'Yes' : 'No'}</p>
        <p className="mt-1"><strong>Balance:</strong> {balance?.balance ?? 'N/A'}</p>
        <p className="mt-1 text-slate-400">{balance?.note ?? ''}</p>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Send</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="Phones comma-separated" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:col-span-2" />
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option>SMS</option>
            <option>WhatsApp</option>
          </select>
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Message" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <button onClick={send} className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Send</button>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Delivery Log</h2>
        <div className="mt-3 space-y-2 text-xs text-slate-300">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg bg-slate-950/60 px-3 py-2">
              <p>{row.channel} → {row.recipient_phone} ({row.status})</p>
              <p className="text-slate-400">{row.message}</p>
              {row.failure_reason ? <p className="text-amber-300">{row.failure_reason}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

