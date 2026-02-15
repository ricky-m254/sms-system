import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalCommunicationPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/messages/'),
      apiClient.get('/parent-portal/announcements/'),
      apiClient.get('/parent-portal/notifications/'),
    ])
      .then(([m, a, n]) => {
        setMessages(m.data ?? [])
        setAnnouncements(a.data ?? [])
        setNotifications(n.data ?? [])
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-display font-semibold">Communication</h1>
      </header>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        Messages: {messages.length} | Announcements: {announcements.length} | Notifications: {notifications.length}
      </section>
    </div>
  )
}

