import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Filter, Search, Plus, CheckCircle2, XCircle } from 'lucide-react'

interface BedSpace {
  id: number
  dormitory_name: string
  bed_number: string
  is_occupied: boolean
  is_active: boolean
}

export default function BedSpacesPage() {
  const [beds, setBeds] = useState<BedSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    apiClient.get('/hostel/beds/')
      .then(res => setBeds(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const filteredBeds = beds.filter(bed => 
    bed.bed_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bed.dormitory_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight tracking-tight">Bed Spaces</h1>
          <p className="mt-1 text-sm text-slate-400">Inventory of all individual beds across dormitories.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <Plus className="h-4 w-4" />
          Add Bed
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by bed or dormitory..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40">
              <th className="px-6 py-4 font-semibold text-slate-300">Dormitory</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Bed Number</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Active</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading bed spaces...</td>
              </tr>
            ) : filteredBeds.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No bed spaces found matching criteria.</td>
              </tr>
            ) : filteredBeds.map((bed) => (
              <tr key={bed.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-200">{bed.dormitory_name}</span>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs uppercase tracking-wider">{bed.bed_number}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    bed.is_occupied ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {bed.is_occupied ? 'Occupied' : 'Vacant'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {bed.is_active ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500" />
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-500 hover:text-white transition">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
