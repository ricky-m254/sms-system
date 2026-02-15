import { useState } from 'react'
import { apiClient } from '../../api/client'

export default function CommunicationParentPage() {
  const [emails, setEmails] = useState('')
  const [phones, setPhones] = useState('')
  const [subject, setSubject] = useState('Parent Update')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const call = async (path: string) => {
    const emailList = emails.split(',').map((v) => v.trim()).filter(Boolean)
    const phoneList = phones.split(',').map((v) => v.trim()).filter(Boolean)
    await apiClient.post(path, {
      emails: emailList,
      phones: phoneList,
      subject,
      message,
    })
    setNotice(`Sent using ${path}`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Parent Communication</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Report Cards, Fees, Attendance, Meetings</h1>
      </section>
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Emails (comma-separated)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="Phones (comma-separated)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        </div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Message" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => call('/communication/parent/report-card-notify/')} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">Report Card</button>
          <button onClick={() => call('/communication/parent/fee-reminder/')} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">Fee Reminder</button>
          <button onClick={() => call('/communication/parent/attendance-alert/')} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">Attendance Alert</button>
          <button onClick={() => call('/communication/parent/meeting-invite/')} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">Meeting Invite</button>
        </div>
      </section>
    </div>
  )
}

