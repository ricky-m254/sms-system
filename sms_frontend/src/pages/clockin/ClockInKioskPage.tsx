import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { resolveApiBaseUrl } from '../../api/baseUrl'

type ScanResponse = {
  event_type: 'IN' | 'OUT'
  is_late: boolean
  person: {
    display_name: string
    person_type: string
    fingerprint_id: string
    admission_number_or_employee_id: string
  }
  message: string
}

export default function ClockInKioskPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fingerprintId, setFingerprintId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [schoolName] = useState(localStorage.getItem('sms_school_name') || 'Rynaty School')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const focusInput = () => {
      inputRef.current?.focus()
    }
    focusInput()
    const interval = setInterval(focusInput, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fingerprintId) return

    try {
      setError(null)
      const baseUrl = resolveApiBaseUrl().replace(/\/$/, '')
      const response = await axios.post<ScanResponse>(`${baseUrl}/api/clockin/kiosk/scan/`, {
        fingerprint_id: fingerprintId,
      })
      setScanResult(response.data)
      setFingerprintId('')
      setTimeout(() => setScanResult(null), 4000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unknown person or scan error.')
      setFingerprintId('')
      setTimeout(() => setError(null), 4000)
    }
  }

  const getStatusColor = () => {
    if (error) return 'border-rose-500 bg-rose-500/10 shadow-[0_0_50px_rgba(244,63,94,0.3)]'
    if (!scanResult) return 'border-slate-800 bg-slate-900/60 shadow-xl'
    if (scanResult.event_type === 'IN') return 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
    return 'border-sky-500 bg-sky-500/10 shadow-[0_0_50px_rgba(14,165,233,0.3)]'
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 font-sans text-white select-none">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full"></div>
      </div>

      <header className="absolute top-12 text-center">
        <h1 className="text-3xl font-display font-bold tracking-tight text-emerald-400">{schoolName}</h1>
        <p className="mt-2 text-lg text-slate-400 font-medium">Biometric Attendance Kiosk</p>
      </header>

      <div className="text-center space-y-2 mb-12">
        <p className="text-8xl font-mono font-bold tracking-tighter text-slate-100 tabular-nums">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </p>
        <p className="text-xl text-slate-400 font-medium uppercase tracking-[0.2em]">
          {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <form onSubmit={handleScan} className="opacity-0 absolute pointer-events-none">
        <input
          ref={inputRef}
          type="text"
          value={fingerprintId}
          onChange={(e) => setFingerprintId(e.target.value)}
          autoFocus
        />
      </form>

      <div className={`w-full max-w-2xl rounded-[2.5rem] border-4 p-12 transition-all duration-500 ${getStatusColor()}`}>
        {!scanResult && !error ? (
          <div className="text-center py-10 space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-slate-700 flex items-center justify-center animate-pulse">
               <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0115.443 3m5.41 5.191A10.003 10.003 0 0120.808 13m-1.354 3.038a10.003 10.003 0 01-4.017 4.017m-3.231 1.45A10.003 10.003 0 0112 21c-4.474 0-8.068-3.955-8.068-8.832 0-2.147.785-4.12 2.057-5.655M7 13.158c.005-.121.011-.242.011-.363 0-1.22.302-2.371.843-3.374m9.233 4.797c.017.219.027.439.027.66 0 1.22-.302 2.371-.843 3.374m-5.132-10.703A5.001 5.001 0 0115.013 9M17 12a5 5 0 11-10 0 5 5 0 0110 0z" />
               </svg>
            </div>
            <p className="text-3xl font-display font-semibold text-slate-300">Please Place Finger on Scanner</p>
            <p className="text-slate-500 font-medium">System ready for scanning...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 space-y-6">
             <div className="mx-auto w-24 h-24 rounded-full bg-rose-500 flex items-center justify-center">
               <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
               </svg>
            </div>
            <p className="text-4xl font-display font-bold text-rose-400">Scan Failed</p>
            <p className="text-2xl text-slate-300 font-medium">{error}</p>
          </div>
        ) : scanResult ? (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center items-center gap-6">
               <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-bold ${
                 scanResult.event_type === 'IN' ? 'bg-emerald-500 text-slate-900' : 'bg-sky-500 text-slate-900'
               }`}>
                 {scanResult.event_type}
               </div>
               <div className="text-left">
                  <p className="text-5xl font-display font-bold text-slate-100">{scanResult.person.display_name}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-full bg-slate-800 px-4 py-1.5 text-lg font-bold text-slate-300 uppercase tracking-wider border border-slate-700">
                      {scanResult.person.person_type}
                    </span>
                    <span className="text-xl text-slate-400 font-medium font-mono">
                      ID: {scanResult.person.admission_number_or_employee_id}
                    </span>
                  </div>
               </div>
            </div>

            <div className="h-px bg-slate-800/50"></div>

            <div className="flex justify-center gap-12">
               <div>
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Status</p>
                 <p className={`mt-2 text-3xl font-bold ${scanResult.is_late ? 'text-amber-400' : 'text-emerald-400'}`}>
                   {scanResult.is_late ? 'LATE ARRIVAL' : 'ON TIME'}
                 </p>
               </div>
               <div>
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Scan Time</p>
                 <p className="mt-2 text-3xl font-bold text-slate-100 tabular-nums">
                   {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
               </div>
            </div>

            <div className={`mt-8 py-4 rounded-2xl font-bold text-2xl ${
               scanResult.event_type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'
            }`}>
              WELCOME TO {schoolName.toUpperCase()}
            </div>
          </div>
        ) : null}
      </div>

      <footer className="absolute bottom-12 text-slate-600 font-medium tracking-widest uppercase text-sm">
        Rynaty SMS Biometric Security System v2.1
      </footer>
    </div>
  )
}
