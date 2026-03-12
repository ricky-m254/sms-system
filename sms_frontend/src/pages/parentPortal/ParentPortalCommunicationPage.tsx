import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

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
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Communication"
        subtitle="Communication management and overview."
        icon="📋"
      />
      <section className="rounded-xl glass-panel p-4 text-sm text-slate-300">
        Messages: {messages.length} | Announcements: {announcements.length} | Notifications: {notifications.length}
      </section>
    </div>
  )
}

