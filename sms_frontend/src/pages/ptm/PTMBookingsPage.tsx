import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { User, Filter, Search, ChevronDown, ChevronUp, Phone, Mail, Clock } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface PTMBooking {
  id: number
  slot_time: string
  student_name: string
  parent_name: string
  parent_phone: string
  parent_email: string
  status: 'Confirmed' | 'Cancelled' | 'Completed'
  teacher_name: string
  session_title: string
}

export default function PTMBookingsPage() {
  const [bookings, setBookings] = useState<PTMBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    apiClient.get('/ptm/bookings/')
      .then(res => setBookings(Array.isArray(res.data) ? res.data : res.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = bookings.filter(b =>
    !search ||
    b.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.teacher_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHero badge="PTM" badgeColor="violet" title="PTM Bookings" subtitle="Parent-teacher meeting appointment bookings" icon="🤝" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">PTM Bookings</h1>
          <p className="mt-1 text-sm text-slate-400">All scheduled meetings between parents and teachers.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student, parent, or teacher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setSearch('')}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <Filter className="h-4 w-4 text-slate-500" />
          Clear
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel shadow-xl backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.025] uppercase tracking-widest text-[10px] font-bold text-slate-500">
              <th className="px-6 py-4 font-semibold text-slate-300">Time & Session</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Student & Parent</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Teacher</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading bookings...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  {search ? 'No bookings match your search.' : 'No bookings found.'}
                </td>
              </tr>
            ) : filtered.map((booking) => (
              <>
                <tr key={booking.id} className="group hover:bg-emerald-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-semibold">{booking.slot_time}</span>
                      <span className="text-xs text-slate-500 truncate">{booking.session_title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-medium">{booking.student_name}</span>
                      <span className="text-xs text-slate-400">P: {booking.parent_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-600" />
                      <span className="text-slate-200">{booking.teacher_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        booking.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        booking.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400' : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition ml-auto"
                    >
                      {expandedId === booking.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      Details
                    </button>
                  </td>
                </tr>
                {expandedId === booking.id && (
                  <tr key={`detail-${booking.id}`} className="bg-slate-900/40">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} className="text-slate-500" />
                          <span className="text-slate-400">Slot:</span>
                          <span className="text-slate-200 font-medium">{booking.slot_time}</span>
                        </div>
                        {booking.parent_phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone size={14} className="text-slate-500" />
                            <span className="text-slate-400">Phone:</span>
                            <a href={`tel:${booking.parent_phone}`} className="text-emerald-400 hover:text-emerald-300">{booking.parent_phone}</a>
                          </div>
                        )}
                        {booking.parent_email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={14} className="text-slate-500" />
                            <span className="text-slate-400">Email:</span>
                            <a href={`mailto:${booking.parent_email}`} className="text-emerald-400 hover:text-emerald-300 truncate">{booking.parent_email}</a>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
