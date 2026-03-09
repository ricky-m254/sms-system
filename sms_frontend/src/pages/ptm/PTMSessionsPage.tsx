import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Calendar, MapPin, Clock, Plus, MoreHorizontal, Video } from 'lucide-react'

interface PTMSession {
  id: number
  title: string
  date: string
  venue: string
  term_name: string
  slot_duration_minutes: number
  start_time: string
  end_time: string
  is_virtual: boolean
  notes: string
}

export default function PTMSessionsPage() {
  const [sessions, setSessions] = useState<PTMSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/ptm/sessions/')
      .then(res => setSessions(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight tracking-tight">PTM Sessions</h1>
          <p className="mt-1 text-sm text-slate-400">Manage parent-teacher meeting events and schedule slots.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <Plus className="h-4 w-4" />
          Create Session
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 italic rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
            <Calendar className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p>No PTM sessions found. Create a session to start scheduling meetings.</p>
          </div>
        ) : sessions.map((session) => (
          <div key={session.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                   <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{session.title}</h3>
                   <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">{session.term_name}</span>
                </div>
              </div>
              <button className="text-slate-500 hover:text-white transition">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>{session.date}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Clock className="h-4 w-4 text-slate-500" />
                <span>{session.start_time} - {session.end_time}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                {session.is_virtual ? <Video className="h-4 w-4 text-blue-400" /> : <MapPin className="h-4 w-4 text-slate-500" />}
                <span className="truncate">{session.venue}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Clock className="h-4 w-4 text-slate-500" />
                <span>{session.slot_duration_minutes} min / slot</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
               <button className="text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition">View Slots</button>
               <button className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition">Edit Session</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
