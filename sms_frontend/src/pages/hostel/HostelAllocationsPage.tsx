import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Calendar, User, UserPlus, MoreHorizontal, Filter } from 'lucide-react'

interface Allocation {
  id: number
  student_name: string
  dormitory_name: string
  bed_number: string
  term_name: string
  check_in_date: string
  status: 'Active' | 'Checked Out'
}

export default function HostelAllocationsPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/hostel/allocations/')
      .then(res => setAllocations(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Hostel Allocations</h1>
          <p className="mt-1 text-sm text-slate-400">Track which students are assigned to which beds.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <UserPlus className="h-4 w-4" />
          New Allocation
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition">
          <Filter className="h-4 w-4 text-slate-500" />
          Filter: All Terms
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition">
           Active Only
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40 uppercase tracking-widest text-[10px] font-bold text-slate-500">
              <th className="px-6 py-4 font-semibold text-slate-300">Student</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Dorm & Bed</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Term</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">In Date</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading allocations...</td>
              </tr>
            ) : allocations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No allocations found. Start by assigning a student to a bed.</td>
              </tr>
            ) : allocations.map((alloc) => (
              <tr key={alloc.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 border border-slate-700">
                       <User className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-slate-200">{alloc.student_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">{alloc.dormitory_name}</span>
                    <span className="text-xs text-slate-500">Bed: {alloc.bed_number}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{alloc.term_name}</td>
                <td className="px-6 py-4 text-center">
                   <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2 py-1 text-xs font-mono text-slate-400">
                     <Calendar className="h-3 w-3" />
                     {alloc.check_in_date}
                   </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    alloc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {alloc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-500 hover:text-white transition group-hover:bg-slate-800 p-2 rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
