import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface Material {
  id: number
  title: string
  course_name?: string
  material_type: string
  file_url: string
}

export default function ELearningMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/elearning/materials/')
      .then(res => setMaterials(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Materials</h1>
          <p className="text-slate-400 mt-1">Access study resources and documents.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl transition font-medium shadow-lg shadow-emerald-500/20">
          Upload Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-medium">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic">No materials found.</div>
        ) : (
          materials.map((mat) => (
            <div key={mat.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center text-center shadow-lg transition hover:border-slate-700 hover:bg-slate-900/80">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-display font-semibold text-white">{mat.title}</h3>
              <p className="mt-1 text-xs text-slate-400 font-medium uppercase tracking-wider">{mat.course_name}</p>
              <div className="mt-4 pt-4 border-t border-slate-800 w-full flex justify-between items-center">
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold uppercase">{mat.material_type}</span>
                <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition">Download</a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
