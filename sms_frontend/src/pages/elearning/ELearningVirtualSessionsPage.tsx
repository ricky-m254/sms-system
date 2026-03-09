import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface Session {
  id: number
  title: string
  course_name?: string
  scheduled_at: string
  duration_minutes: number
  meeting_link: string
}

export default function ELearningVirtualSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/elearning/sessions/')
      .then(res => setSessions(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Virtual Sessions</h1>
          <p className="text-slate-400 mt-1 text-lg">Live online classes and interactive sessions.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl transition font-medium shadow-lg shadow-emerald-500/20">
          Schedule Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-medium text-lg">Loading virtual sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
            No virtual sessions scheduled.
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl transition hover:border-emerald-500/30 hover:bg-slate-900/80">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded font-bold uppercase tracking-wider">Live</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white">{session.title}</h3>
                <p className="mt-1 text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">{session.course_name}</p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-slate-300 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(session.scheduled_at).toLocaleDateString()} at {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-slate-300 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {session.duration_minutes} Minutes
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <a 
                  href={session.meeting_link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-3 rounded-xl transition border border-slate-700 hover:border-emerald-500/50"
                >
                  Join Meeting
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
