import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { User, Clock } from 'lucide-react'

interface PTMSlot {
  id: number
  slot_time: string
  is_booked: boolean
  session_title: string
  booking_student_name?: string
  booking_parent_name?: string
  booking_notes?: string
}

export default function MyPTMSlotsPage() {
  const [slots, setSlots] = useState<PTMSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/ptm/my-slots/')
      .then(res => setSlots(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">My PTM Slots</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your individual schedule for upcoming parent-teacher meetings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading your slots...</div>
        ) : slots.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 italic rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
            <Clock className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p>You have no slots scheduled yet.</p>
          </div>
        ) : slots.map((slot) => (
          <div key={slot.id} className={`rounded-2xl border p-5 transition-all duration-300 ${
            slot.is_booked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/60 border-slate-800'
          }`}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Clock className={`h-4 w-4 ${slot.is_booked ? 'text-emerald-400' : 'text-slate-500'}`} />
                 <span className="text-lg font-bold text-white">{slot.slot_time}</span>
               </div>
               <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 ${
                 slot.is_booked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'
               }`}>
                 {slot.is_booked ? 'Booked' : 'Available'}
               </span>
             </div>
             
             <div className="mt-4">
               <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{slot.session_title}</p>
               {slot.is_booked ? (
                 <div className="mt-3 space-y-2">
                   <div className="flex items-center gap-2 text-slate-200">
                     <User className="h-4 w-4 text-emerald-400" />
                     <span className="font-semibold">{slot.booking_student_name}</span>
                   </div>
                   <p className="text-xs text-slate-400 italic">Parent: {slot.booking_parent_name}</p>
                 </div>
               ) : (
                 <p className="mt-3 text-sm text-slate-500 italic">No parent has booked this slot yet.</p>
               )}
             </div>

             <div className="mt-6 flex items-center justify-end">
               {slot.is_booked ? (
                 <button className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition">
                   Meeting Notes
                 </button>
               ) : (
                 <button className="text-xs font-bold text-slate-500 hover:text-white transition">Delete Slot</button>
               )}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}
