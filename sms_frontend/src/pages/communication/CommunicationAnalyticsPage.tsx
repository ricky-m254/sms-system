import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Summary = { total_messages: number; total_notifications: number; total_emails: number; total_sms: number }
type ByChannel = { in_app_messages: number; email_messages: number; sms_messages: number; whatsapp_messages: number; push_notifications: number }
type DeliveryRate = { email_delivery_rate: number; sms_delivery_rate: number; whatsapp_delivery_rate: number }

export default function CommunicationAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [channel, setChannel] = useState<ByChannel | null>(null)
  const [delivery, setDelivery] = useState<DeliveryRate | null>(null)

  useEffect(() => {
    const load = async () => {
      const [s, c, d] = await Promise.all([
        apiClient.get<Summary>('/communication/analytics/summary/'),
        apiClient.get<ByChannel>('/communication/analytics/by-channel/'),
        apiClient.get<DeliveryRate>('/communication/analytics/delivery-rate/'),
      ])
      setSummary(s.data)
      setChannel(c.data)
      setDelivery(d.data)
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Delivery Analytics</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Channel Health and Success Rates</h1>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Messages</p><p className="mt-2 text-2xl font-semibold">{summary?.total_messages ?? 0}</p></article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">Email</p><p className="mt-2 text-2xl font-semibold">{channel?.email_messages ?? 0}</p></article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">SMS</p><p className="mt-2 text-2xl font-semibold">{channel?.sms_messages ?? 0}</p></article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">WhatsApp</p><p className="mt-2 text-2xl font-semibold">{channel?.whatsapp_messages ?? 0}</p></article>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold">Delivery Rate</h2>
        <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-950/60 px-3 py-2">Email: {delivery?.email_delivery_rate ?? 0}%</div>
          <div className="rounded-lg bg-slate-950/60 px-3 py-2">SMS: {delivery?.sms_delivery_rate ?? 0}%</div>
          <div className="rounded-lg bg-slate-950/60 px-3 py-2">WhatsApp: {delivery?.whatsapp_delivery_rate ?? 0}%</div>
        </div>
      </section>
    </div>
  )
}

