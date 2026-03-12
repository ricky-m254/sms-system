import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Device = {
  id: number
  device_id: string
  name: string
  location: string
  device_type: 'ENTRY' | 'EXIT' | 'BOTH'
  api_key: string
  is_active: boolean
  last_seen: string | null
  notes: string
  created_at: string
}

export default function ClockInDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    device_id: '',
    name: '',
    location: '',
    device_type: 'BOTH' as const,
    notes: '',
  })

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDevices = async () => {
    try {
      const res = await apiClient.get<Device[]>('/clockin/devices/')
      setDevices(res.data)
    } catch {
      setError('Unable to load devices.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      await apiClient.post('/clockin/devices/', formData)
      setFormData({ device_id: '', name: '', location: '', device_type: 'BOTH', notes: '' })
      setIsAdding(false)
      fetchDevices()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add device.')
      setIsAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/clockin/devices/${deleteId}/`)
      setDeleteId(null)
      fetchDevices()
    } catch {
      setError('Failed to delete device.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHero
        badge="CLOCK-IN"
        badgeColor="emerald"
        title="Devices"
        subtitle="Manage biometric and RFID clock-in devices"
        icon="⏰"
      />
      <header className="rounded-2xl glass-panel p-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-display font-semibold">Biometric Devices</h1>
          <p className="mt-2 text-sm text-slate-400">Manage fingerprint scanner terminals and endpoints.</p>
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
        >
          {isAdding ? 'Cancel' : '+ Register Device'}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleAdd} className="rounded-2xl glass-panel p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-display font-semibold text-emerald-400">Register New Device</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Serial Number (Device ID)</label>
              <input
                required
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                placeholder="e.g. SN-9988-G1"
                value={formData.device_id}
                onChange={e => setFormData({ ...formData, device_id: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Friendly Name</label>
              <input
                required
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                placeholder="e.g. Main Entrance Terminal"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Location</label>
              <input
                required
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                placeholder="e.g. Front Gate"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Function</label>
              <select
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                value={formData.device_type}
                onChange={e => setFormData({ ...formData, device_type: e.target.value as any })}
              >
                <option value="ENTRY">Entry Only</option>
                <option value="EXIT">Exit Only</option>
                <option value="BOTH">Entry & Exit</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Notes</label>
              <input
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                placeholder="Hardware specs or maintenance info..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAdding}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              Confirm Registration
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic rounded-2xl border border-white/[0.07] bg-white/[0.02]">No devices registered.</div>
        ) : (
          devices.map(device => (
            <article key={device.id} className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-display font-semibold">{device.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    device.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {device.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                    {device.device_type}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Serial Number</p>
                    <p className="font-mono text-emerald-400 mt-1">{device.device_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Location</p>
                    <p className="text-slate-300 mt-1">{device.location}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Last Seen</p>
                    <p className="text-slate-300 mt-1 italic">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">API Key</p>
                    <p className="text-slate-300 mt-1 font-mono text-xs">{device.api_key.substring(0, 8)}••••••••••••••••</p>
                  </div>
                </div>
                {device.notes && <p className="text-xs text-slate-500 border-l-2 border-white/[0.09] pl-3 py-1 italic">{device.notes}</p>}
              </div>

              <div className="w-full md:w-80 space-y-4 border-l border-white/[0.07] pl-0 md:pl-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Webhook Config</h4>
                <div className="space-y-3 rounded-xl bg-slate-950 p-4 border border-white/[0.05]">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500">ENDPOINT URL</p>
                    <p className="text-[11px] font-mono break-all text-emerald-500">POST /api/clockin/scan/</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500">AUTH HEADER</p>
                    <p className="text-[11px] font-mono break-all text-sky-400">X-Device-Key: {device.api_key.substring(0, 6)}•••</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                   <button 
                     onClick={() => setDeleteId(device.id)}
                     className="text-rose-400 hover:text-rose-300 text-xs font-semibold uppercase tracking-wider"
                    >
                     Delete Device
                   </button>
                   <button
                     onClick={() => window.open('https://developer.android.com/studio', '_blank', 'noopener,noreferrer')}
                     className="text-slate-400 hover:text-slate-100 text-xs font-semibold uppercase tracking-wider"
                   >
                     Download SDK
                   </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Device Registration"
        description="Are you sure you want to remove this device? This will invalidate its API key and it won't be able to send any more scans until re-registered."
        confirmLabel="Delete"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
