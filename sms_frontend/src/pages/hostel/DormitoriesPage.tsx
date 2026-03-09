import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Plus, Building, Users, MoreHorizontal } from 'lucide-react'

interface Dormitory {
  id: number
  name: string
  gender: 'Male' | 'Female' | 'Mixed'
  capacity: number
  warden_name?: string
  notes: string
}

export default function DormitoriesPage() {
  const [dorms, setDorms] = useState<Dormitory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/hostel/dormitories/')
      .then(res => setDorms(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Dormitories</h1>
          <p className="mt-1 text-sm text-slate-400">Manage school housing facilities and capacity.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <Plus className="h-4 w-4" />
          Add Dormitory
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading dormitories...</div>
        ) : dorms.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
            <Building className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p>No dormitories found. Add your first dormitory to get started.</p>
          </div>
        ) : dorms.map((dorm) => (
          <div key={dorm.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Building className="h-6 w-6" />
              </div>
              <button className="text-slate-500 hover:text-white transition">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{dorm.name}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  dorm.gender === 'Male' ? 'bg-blue-500/10 text-blue-400' : 
                  dorm.gender === 'Female' ? 'bg-pink-500/10 text-pink-400' : 'bg-purple-500/10 text-purple-400'
                }`}>
                  {dorm.gender}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400 font-medium">{dorm.capacity} Capacity</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-slate-800 pt-4 text-sm text-slate-400">
              <Users className="h-4 w-4 text-slate-500" />
              <span>Warden: <span className="text-slate-200">{dorm.warden_name || 'Not assigned'}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
