import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

export default function AlumniProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/alumni/profiles/')
      .then(res => setProfiles(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHero
        badge="ALUMNI"
        badgeColor="amber"
        title="Alumni Profiles"
        subtitle="Track, engage, and maintain connections with graduates of the institution."
        icon="🎓"
        actions={
          <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Add Profile
          </button>
        }
      />

      <div className="rounded-2xl glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Graduation Year</th>
                <th className="px-6 py-4">Occupation</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading profiles...</td>
                </tr>
              ) : profiles.length > 0 ? (
                profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.025] transition">
                    <td className="px-6 py-4 font-medium text-white">{p.first_name} {p.last_name}</td>
                    <td className="px-6 py-4">{p.graduation_year}</td>
                    <td className="px-6 py-4">{p.current_occupation || '-'}</td>
                    <td className="px-6 py-4">{p.city}, {p.country}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {p.is_verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No profiles found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
