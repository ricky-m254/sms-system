import { useEffect, useRef, useState } from 'react'
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
  // Network / connection
  ip_address: string | null
  port: number
  http_port: number
  rtsp_port: number
  channel: number
  username: string
  password: string
  // Device identity
  brand: string
  model: string
  serial_number: string
  mac_address: string
  firmware_version: string
  discovery_method: string
}

type DiscoveredDevice = {
  ip: string
  port: number
  brand: string
  model: string
  serial: string
  mac: string
  technology: string
  device_id: string
  discovery_method: string
  already_registered: boolean
}

type ScanPhase = 'idle' | 'usb' | 'network' | 'done'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

function guessIpPrefix(): string {
  return '192.168.1'
}

export default function ClockInDevicesPage() {
  const [devices, setDevices]     = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    device_id:   '',
    name:        '',
    location:    '',
    device_type: 'BOTH' as 'ENTRY' | 'EXIT' | 'BOTH',
    notes:       '',
    // Connection — Dahua ASI6214S factory defaults
    ip_address:  '',
    port:        37777,
    http_port:   80,
    rtsp_port:   37778,
    channel:     1,
    username:    'admin',
    password:    'admin123',
    // Identity
    brand:            'Dahua',
    model:            '',
    serial_number:    '',
    mac_address:      '',
    firmware_version: '',
    discovery_method: 'Manual',
  })

  const [deleteId, setDeleteId]     = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Auto-detect state ──────────────────────────────────────
  const [showDetect, setShowDetect]         = useState(false)
  const [scanPhase, setScanPhase]           = useState<ScanPhase>('idle')
  const [ipPrefix, setIpPrefix]             = useState(guessIpPrefix())
  const [scanTimeout, setScanTimeout]       = useState(0.5)
  const [discovered, setDiscovered]         = useState<DiscoveredDevice[]>([])
  const [scanLog, setScanLog]               = useState<string[]>([])
  const [usbSupported, setUsbSupported]     = useState(false)
  const [scanError, setScanError]           = useState<string | null>(null)
  const abortRef                            = useRef(false)
  const logRef                              = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUsbSupported('hid' in navigator || 'serial' in navigator)
    fetchDevices()
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [scanLog])

  const addLog = (msg: string) =>
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

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

  const BLANK_FORM = {
    device_id: '', name: '', location: '', device_type: 'BOTH' as const, notes: '',
    ip_address: '', port: 37777, http_port: 80, rtsp_port: 37778, channel: 1,
    username: 'admin', password: 'admin123',
    brand: 'Dahua', model: '', serial_number: '', mac_address: '', firmware_version: '',
    discovery_method: 'Manual',
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      await apiClient.post('/clockin/devices/', formData)
      setFormData(BLANK_FORM)
      setIsAdding(false)
      setShowForm(false)
      setShowDetect(false)
      fetchDevices()
    } catch (err: any) {
      const errData = err.response?.data
      const msg = errData?.detail || errData?.device_id?.[0] || errData?.ip_address?.[0] || 'Failed to add device.'
      setError(msg)
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

  const prefillForm = (d: DiscoveredDevice) => {
    const isDahua = d.brand?.toLowerCase().includes('dahua') || d.port === 37777 || d.port === 37778
    setFormData({
      device_id:        d.serial ? d.serial : d.device_id,
      name:             `${d.model || d.brand} @ ${d.ip}`,
      location:         '',
      device_type:      'BOTH',
      notes:            [
        `Auto-detected via ${d.discovery_method}`,
        d.model  ? `Model: ${d.model}`   : '',
        d.serial ? `Serial: ${d.serial}` : '',
        d.mac    ? `MAC: ${d.mac}`       : '',
        `Tech: ${d.technology}`,
      ].filter(Boolean).join('\n'),
      // Network connection (use discovered IP; Dahua SDK port wins if applicable)
      ip_address:       d.ip === 'USB' ? '' : d.ip,
      port:             d.port === 80 ? 37777 : (d.port || 37777),
      http_port:        80,
      rtsp_port:        37778,
      channel:          1,
      // Dahua factory credentials
      username:         'admin',
      password:         isDahua ? 'admin123' : '',
      // Device identity
      brand:            d.brand?.split(' ')[0] || 'Dahua',
      model:            d.model || (isDahua ? 'ASI6214S' : ''),
      serial_number:    d.serial || '',
      mac_address:      d.mac || '',
      firmware_version: '',
      discovery_method: d.discovery_method || 'TCP Port Probe',
    })
    setShowForm(true)
    setShowDetect(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── USB (WebHID) detection ─────────────────────────────────
  const runUsbScan = async () => {
    abortRef.current = false
    setScanPhase('usb')
    setDiscovered([])
    setScanLog([])
    setScanError(null)
    addLog('Checking for USB-connected biometric devices (Dahua ASI6214S priority)…')

    if (!('hid' in navigator)) {
      addLog('WebHID not supported in this browser (use Chrome or Edge).')
      setScanPhase('network')
      return
    }

    try {
      addLog('Prompting browser for USB HID access — select your device in the dialog…')
      // PRIMARY: Dahua ASI6214S (vendor 0x2207 / 0x2b87) + other known brands
      const hidDevices = await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: 0x2207 },  // Dahua / Rockchip (ASI6214S USB config)
          { vendorId: 0x2b87 },  // Dahua Technology Co.
          { vendorId: 0x1b55 },  // ZKTeco
          { vendorId: 0x05ba },  // DigitalPersona / HID Global
          { vendorId: 0x1533 },  // Suprema
          { vendorId: 0x0483 },  // STMicroelectronics (generic readers)
          { vendorId: 0x04b4 },  // Cypress / generic USB HID
          { vendorId: 0x1a79 },  // Crossmatch / Aware
          { usagePage: 0x000d }, // Digitizer / biometric (catch-all)
        ],
      })

      if (!hidDevices || hidDevices.length === 0) {
        addLog('No USB biometric device selected or found via USB.')
      } else {
        for (const dev of hidDevices) {
          const devId    = `USB-HID:${dev.vendorId.toString(16).padStart(4,'0')}:${dev.productId.toString(16).padStart(4,'0')}`
          const isDahua  = dev.vendorId === 0x2207 || dev.vendorId === 0x2b87
          const brand    = isDahua
            ? (dev.productName || 'Dahua ASI6214S')
            : (dev.productName || 'USB Biometric Device')
          addLog(`✓ Found: ${brand} (VID 0x${dev.vendorId.toString(16).toUpperCase()}, PID 0x${dev.productId.toString(16).toUpperCase()})`)
          const candidate: DiscoveredDevice = {
            ip:                 'USB',
            port:               0,
            brand,
            technology:         isDahua ? 'Dahua USB (ASI6214S)' : 'USB HID Fingerprint',
            device_id:          devId,
            already_registered: devices.some(d => d.device_id === devId),
          }
          setDiscovered(prev => [...prev, candidate])
        }
      }
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
        addLog('USB access denied by browser — try again and allow access in the dialog.')
      } else {
        addLog(`USB scan error: ${err.message}`)
      }
    }

    setScanPhase('network')
  }

  // ── Network scan ───────────────────────────────────────────
  const runNetworkScan = async () => {
    abortRef.current = false
    if (scanPhase === 'idle') {
      setScanPhase('network')
      setDiscovered([])
      setScanLog([])
      setScanError(null)
    }
    addLog(`Starting network scan on ${ipPrefix}.1 – ${ipPrefix}.254…`)
    addLog('PRIMARY: port 37777 (Dahua ASI6214S SDK) · Also: 37778, 80, 8000 (Dahua alt), 4370 (ZKTeco), 5010 (Anviz), 4008 (FingerTec), 9922 (Suprema)…')

    try {
      const res = await apiClient.post<{ devices: DiscoveredDevice[]; scanned: string }>(
        '/clockin/devices/discover/',
        { ip_prefix: ipPrefix, timeout: scanTimeout },
      )
      if (abortRef.current) return
      const found = res.data.devices
      const sadpCount = res.data.sadp_found ?? 0
      addLog(`Scan complete — ${res.data.scanned}`)
      if (sadpCount > 0) addLog(`✓ SADP Ethernet broadcast identified ${sadpCount} Dahua device(s) by model & serial.`)
      addLog(found.length > 0
        ? `Total: ${found.length} device(s) found (${sadpCount} identified via SADP, ${found.length - sadpCount} via TCP).`
        : 'No biometric devices found on this subnet.')
      setDiscovered(prev => {
        const existing = prev.map(d => d.device_id)
        const fresh    = found.filter(d => !existing.includes(d.device_id))
        return [...prev, ...fresh]
      })
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Network scan failed.'
      setScanError(msg)
      addLog(`Error: ${msg}`)
    } finally {
      setScanPhase('done')
    }
  }

  const startAutoDetect = async () => {
    setScanPhase('idle')
    setDiscovered([])
    setScanLog([])
    setScanError(null)
    await runUsbScan()
    if (!abortRef.current) await runNetworkScan()
  }

  const stopScan = () => {
    abortRef.current = true
    setScanPhase('done')
    addLog('Scan cancelled by user.')
  }

  const resetDetect = () => {
    abortRef.current = true
    setScanPhase('idle')
    setDiscovered([])
    setScanLog([])
    setScanError(null)
  }

  const isScanning = scanPhase === 'usb' || scanPhase === 'network'

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <PageHero
        badge="CLOCK-IN"
        badgeColor="emerald"
        title="Devices"
        subtitle="Manage biometric and RFID clock-in devices"
        icon="⏰"
      />

      {/* ── Header bar ── */}
      <header className="rounded-2xl p-5 flex flex-wrap gap-3 justify-between items-center" style={GLASS}>
        <div>
          <h1 className="text-xl font-display font-semibold">Biometric Devices</h1>
          <p className="mt-1 text-sm text-slate-400">Fingerprint scanners, RFID terminals and network endpoints.</p>
          {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowDetect(v => !v); setShowForm(false) }}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
          >
            <span>📡</span> Auto-detect
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setShowDetect(false) }}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition"
          >
            {showForm ? 'Cancel' : '+ Register Device'}
          </button>
        </div>
      </header>

      {/* ── Auto-detect panel ── */}
      {showDetect && (
        <section className="rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-4" style={GLASS}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-display font-semibold text-emerald-400">Auto-detect Biometric Devices</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                  PRIMARY: Dahua ASI6214S
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Scans USB and network for biometric terminals.
                <span className="ml-1 text-emerald-500/80 font-medium">Dahua ASI6214S</span> is checked first (ports 37777 / 37778 / 80),
                then ZKTeco, Anviz, FingerTec, Suprema and other terminals.
              </p>
            </div>
            <button onClick={() => { setShowDetect(false); resetDetect() }} className="shrink-0 text-slate-500 hover:text-slate-300 text-xs mt-0.5">✕ Close</button>
          </div>

          {/* Config row */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Network prefix (first 3 octets)</label>
              <input
                className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm font-mono outline-none focus:border-emerald-500 transition w-44"
                placeholder="192.168.1"
                value={ipPrefix}
                onChange={e => {
                  let val = e.target.value
                  const parts = val.split('.')
                  if (parts.length === 4 && parts.every(p => /^\d+$/.test(p) && Number(p) <= 255)) {
                    val = parts.slice(0, 3).join('.')
                  }
                  setIpPrefix(val)
                }}
                disabled={isScanning}
              />
              <p className="text-[10px] text-slate-600">Dahua ASI6214S default: <span className="font-mono text-emerald-600">192.168.1</span>.108</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Probe timeout (s)</label>
              <select
                className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 transition"
                value={scanTimeout}
                onChange={e => setScanTimeout(Number(e.target.value))}
                disabled={isScanning}
              >
                <option value={0.3}>0.3 s — Fast</option>
                <option value={0.5}>0.5 s — Balanced</option>
                <option value={1.0}>1.0 s — Thorough</option>
                <option value={2.0}>2.0 s — Slow network</option>
              </select>
            </div>

            {!isScanning && scanPhase !== 'done' && (
              <button
                onClick={startAutoDetect}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition flex items-center gap-2"
              >
                <span className="animate-pulse">🔍</span> Start Scan
              </button>
            )}
            {isScanning && (
              <button
                onClick={stopScan}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition"
              >
                ⏹ Stop
              </button>
            )}
            {scanPhase === 'done' && (
              <button
                onClick={resetDetect}
                className="rounded-xl border border-white/[0.09] px-5 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                ↺ Scan Again
              </button>
            )}
          </div>

          {/* Phase indicator */}
          {(isScanning || scanPhase === 'done') && (
            <div className="flex items-center gap-6 text-xs">
              <span className={`flex items-center gap-1.5 ${scanPhase === 'usb' ? 'text-emerald-400' : (scanPhase === 'idle' ? 'text-slate-600' : 'text-slate-400')}`}>
                {scanPhase === 'usb'
                  ? <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  : <span className="inline-block h-2 w-2 rounded-full bg-slate-600" />}
                USB / HID
              </span>
              <span className={`flex items-center gap-1.5 ${scanPhase === 'network' ? 'text-emerald-400' : (scanPhase === 'done' ? 'text-slate-400' : 'text-slate-600')}`}>
                {scanPhase === 'network'
                  ? <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  : <span className="inline-block h-2 w-2 rounded-full bg-slate-600" />}
                Network scan
              </span>
              {scanPhase === 'done' && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Complete
                </span>
              )}
            </div>
          )}

          {/* Scan log console */}
          {scanLog.length > 0 && (
            <div
              ref={logRef}
              className="rounded-xl bg-slate-950 border border-white/[0.06] p-4 text-[11px] font-mono text-slate-400 space-y-1 max-h-36 overflow-y-auto"
            >
              {scanLog.map((line, i) => (
                <div key={i} className={line.includes('Found') || line.includes('device') ? 'text-emerald-400' : line.includes('Error') || line.includes('denied') ? 'text-rose-400' : ''}>
                  {line}
                </div>
              ))}
              {isScanning && (
                <div className="flex items-center gap-2 text-emerald-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Scanning…
                </div>
              )}
            </div>
          )}

          {scanError && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{scanError}</p>
          )}

          {/* Discovered devices */}
          {discovered.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Discovered ({discovered.length})
              </h3>
              {discovered.map((d, i) => {
                const isSadp = d.discovery_method?.includes('SADP')
                const isUsb  = d.ip === 'USB'
                return (
                  <div key={i} className={`rounded-xl border px-5 py-4 space-y-3 ${isSadp ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-slate-900 border-white/[0.07]'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-xl mt-0.5">{isUsb ? '🔌' : isSadp ? '✅' : '📡'}</span>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-100">{d.brand}</p>
                            {isSadp && (
                              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                                SADP Identified
                              </span>
                            )}
                            {d.discovery_method?.includes('HTTP') && (
                              <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-400">
                                HTTP Confirmed
                              </span>
                            )}
                          </div>
                          {/* IP / address row */}
                          <p className="text-xs font-mono text-slate-500">
                            {isUsb ? d.device_id : `${d.ip} : ${d.port}`}
                            <span className="ml-2 text-slate-700">· {d.technology}</span>
                          </p>
                          {/* Identification details */}
                          {(d.model || d.serial || d.mac) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-mono mt-1">
                              {d.model  && <span className="text-slate-400">Model: <span className="text-emerald-400">{d.model}</span></span>}
                              {d.serial && <span className="text-slate-400">S/N: <span className="text-sky-400">{d.serial}</span></span>}
                              {d.mac    && <span className="text-slate-400">MAC: <span className="text-slate-300">{d.mac}</span></span>}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-600">via {d.discovery_method || 'TCP'}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {d.already_registered ? (
                          <span className="text-xs text-slate-500 border border-white/[0.07] rounded-full px-3 py-1">Already registered</span>
                        ) : (
                          <button
                            onClick={() => prefillForm(d)}
                            className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition"
                          >
                            Register →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {scanPhase === 'done' && discovered.length === 0 && (
            <div className="rounded-xl bg-slate-900 border border-white/[0.07] p-6 space-y-4">
              <p className="text-slate-300 text-sm font-semibold">No biometric devices found on this subnet.</p>
              <div className="space-y-2 text-xs text-slate-500">
                <p>Ensure the device is powered on and on the same LAN as this server.</p>
                <div className="rounded-lg bg-slate-950 border border-white/[0.06] p-3 space-y-1.5 font-mono">
                  <p className="text-slate-400 font-sans font-bold text-[10px] uppercase tracking-widest mb-2">Known factory defaults</p>
                  <p><span className="text-emerald-400 font-bold">Dahua ASI6214S</span> → <span className="text-sky-400">192.168.1.108</span> · ports <span className="text-sky-400">37777 / 80</span></p>
                  <p><span className="text-slate-400">Dahua (other)</span>     → <span className="text-slate-500">192.168.1.108</span> · port <span className="text-slate-500">37777</span></p>
                  <p><span className="text-slate-400">ZKTeco</span>            → <span className="text-slate-500">192.168.1.201</span> · port <span className="text-slate-500">4370</span></p>
                  <p><span className="text-slate-400">Anviz</span>             → <span className="text-slate-500">192.168.1.100</span> · port <span className="text-slate-500">5010</span></p>
                  <p><span className="text-slate-400">FingerTec</span>         → <span className="text-slate-500">192.168.1.200</span> · port <span className="text-slate-500">4008</span></p>
                  <p><span className="text-slate-400">Suprema BioStar</span>   → <span className="text-slate-500">192.168.1.x</span>   · port <span className="text-slate-500">9922</span></p>
                </div>
                <p>If the Dahua ASI6214S is on a different subnet, update the network prefix above and scan again.</p>
              </div>
              <button
                onClick={() => { setShowForm(true); setShowDetect(false) }}
                className="rounded-xl border border-white/[0.09] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                Register manually instead →
              </button>
            </div>
          )}

          {/* USB note */}
          {!usbSupported && (
            <p className="text-[11px] text-amber-400/70 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2">
              ⚠ USB auto-detection requires Chrome or Edge. The network scan works in all browsers.
            </p>
          )}
        </section>
      )}

      {/* ── Manual registration form ── */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-4" style={GLASS}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-display font-semibold text-emerald-400">Register Device</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-white/[0.07] rounded-full px-3 py-1">
              Dahua ASI6214S defaults pre-filled
            </span>
          </div>

          {/* Identity section */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Device Identity</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Serial / Device ID *</label>
                <input required
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. 4A2F… or 192.168.1.108:37777"
                  value={formData.device_id}
                  onChange={e => setFormData({ ...formData, device_id: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Friendly Name *</label>
                <input required
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. Main Entrance Terminal"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Location *</label>
                <input required
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. Front Gate"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Brand</label>
                <select
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
                  value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}
                >
                  <option value="Dahua">Dahua</option>
                  <option value="ZKTeco">ZKTeco</option>
                  <option value="Anviz">Anviz</option>
                  <option value="FingerTec">FingerTec</option>
                  <option value="Suprema">Suprema</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Model</label>
                <input
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="ASI6214S"
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
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
                  <option value="BOTH">Entry &amp; Exit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Network / Connection section */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Network Connection
              <span className="ml-2 normal-case font-normal text-emerald-600">Dahua ASI6214S factory: 192.168.1.108 · SDK 37777 · HTTP 80 · admin / admin123</span>
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">IP Address</label>
                <input
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="192.168.1.108"
                  value={formData.ip_address}
                  onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">SDK Port</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="37777"
                  value={formData.port}
                  onChange={e => setFormData({ ...formData, port: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">HTTP Port</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="80"
                  value={formData.http_port}
                  onChange={e => setFormData({ ...formData, http_port: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Username</label>
                <input
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="admin"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Password</label>
                <input type="password"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="admin123"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">RTSP Port</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="37778"
                  value={formData.rtsp_port}
                  onChange={e => setFormData({ ...formData, rtsp_port: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Channel</label>
                <input type="number"
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 transition"
                  placeholder="1"
                  value={formData.channel}
                  onChange={e => setFormData({ ...formData, channel: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Notes</label>
            <textarea
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition resize-none"
              rows={2}
              placeholder="Hardware specs, firmware version, maintenance notes or auto-detection info…"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-xl border border-white/[0.09] px-5 py-2 text-sm text-slate-400 hover:text-slate-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={isAdding}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 transition">
              {isAdding ? 'Registering…' : 'Confirm Registration'}
            </button>
          </div>
        </form>
      )}

      {/* ── Registered devices list ── */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading devices…</div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            No devices registered yet. Use <span className="text-emerald-400 not-italic font-semibold">Auto-detect</span> to find devices on your network.
          </div>
        ) : (
          devices.map(device => (
            <article key={device.id} className="rounded-2xl p-6 flex flex-col md:flex-row gap-6" style={GLASS}>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-display font-semibold">{device.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    device.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {device.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                    {device.device_type}
                  </span>
                  {device.brand && (
                    <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase">
                      {device.brand}{device.model ? ` ${device.model}` : ''}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Device ID</p>
                    <p className="font-mono text-emerald-400 mt-1 break-all text-xs">{device.device_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Location</p>
                    <p className="text-slate-300 mt-1">{device.location}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Last Seen</p>
                    <p className="text-slate-300 mt-1 italic">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</p>
                  </div>
                  {device.ip_address && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">IP Address</p>
                      <p className="font-mono text-sky-400 mt-1">{device.ip_address}</p>
                    </div>
                  )}
                  {device.ip_address && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">SDK · HTTP Ports</p>
                      <p className="font-mono text-slate-300 mt-1 text-xs">{device.port} · {device.http_port}</p>
                    </div>
                  )}
                  {device.serial_number && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Serial</p>
                      <p className="font-mono text-slate-400 mt-1 text-xs">{device.serial_number}</p>
                    </div>
                  )}
                  {device.mac_address && (
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">MAC</p>
                      <p className="font-mono text-slate-400 mt-1 text-xs">{device.mac_address}</p>
                    </div>
                  )}
                </div>
                {device.notes && (
                  <p className="text-xs text-slate-500 border-l-2 border-white/[0.09] pl-3 py-1 italic whitespace-pre-line">{device.notes}</p>
                )}
              </div>

              <div className="w-full md:w-80 space-y-4 border-l border-white/[0.07] pl-0 md:pl-6">
                {device.ip_address && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Connection</h4>
                    <div className="space-y-2 rounded-xl bg-slate-950 p-4 border border-white/[0.05] text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">IP</span>
                        <span className="text-sky-400">{device.ip_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">SDK Port</span>
                        <span className="text-slate-300">{device.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">HTTP Port</span>
                        <span className="text-slate-300">{device.http_port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Username</span>
                        <span className="text-emerald-400">{device.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Password</span>
                        <span className="text-slate-400">••••••••</span>
                      </div>
                      {device.channel > 1 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Channel</span>
                          <span className="text-slate-300">{device.channel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Webhook Config</h4>
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
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setDeleteId(device.id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold uppercase tracking-wider">
                    Delete
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
