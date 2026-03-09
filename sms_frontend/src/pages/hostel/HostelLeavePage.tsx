import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { User, CheckCircle2, XCircle, Clock, Plus, Filter } from 'lucide-react'

interface Leave {
  id: number
  student_name: string
  leave_from: string
  leave_to: string
  reason: string
  approved_by_name?: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

export default function HostelLeavePage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/hostel/leave/')
      .then(res => setLeaves(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Hostel Leave Requests</h1>
          <p className="mt-1 text-sm text-slate-400">Manage student leave of absence from the dormitory.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <Plus className="h-4 w-4" />
          Request Leave
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition">
          <Filter className="h-4 w-4 text-slate-500" />
          Filter: Pending Only
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition">
           All Requests
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40 uppercase tracking-widest text-[10px] font-bold text-slate-500">
              <th className="px-6 py-4 font-semibold text-slate-300">Student</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Period</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Reason</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Approver</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading leave requests...</td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No leave requests found.</td>
              </tr>
            ) : leaves.map((leave) => (
              <tr key={leave.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold text-slate-200">{leave.student_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">{leave.leave_from}</span>
                    <span className="text-xs text-slate-500">to {leave.leave_to}</span>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate text-slate-400 italic">"{leave.reason}"</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      leave.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                      {leave.status === 'Pending' && <Clock className="h-3 w-3" />}
                      {leave.status === 'Approved' && <CheckCircle2 className="h-3 w-3" />}
                      {leave.status === 'Rejected' && <XCircle className="h-3 w-3" />}
                      {leave.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{leave.approved_by_name || '-'}</td>
                <td className="px-6 py-4 text-right">
                   {leave.status === 'Pending' ? (
                     <div className="flex items-center justify-end gap-2">
                       <button className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20">
                         <CheckCircle2 className="h-4 w-4" />
                       </button>
                       <button className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20">
                         <XCircle className="h-4 w-4" />
                       </button>
                     </div>
                   ) : (
                      <button className="text-slate-500 hover:text-white transition">View</button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
