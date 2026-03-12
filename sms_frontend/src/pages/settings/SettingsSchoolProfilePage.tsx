import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../../api/client'
import { Building2, Globe, Mail, MapPin, Phone, Upload, Check, AlertCircle } from 'lucide-react'

interface ProfileData {
  id?: number
  school_name: string
  logo_url?: string | null
  motto: string
  address: string
  phone: string
  email_address: string
  website: string
  county: string
  country: string
  currency: string
  tax_percentage: string
  receipt_prefix: string
  invoice_prefix: string
  admission_number_mode: 'AUTO' | 'MANUAL'
  admission_number_prefix: string
  admission_number_padding: number
}

const DEFAULTS: ProfileData = {
  school_name: '',
  logo_url: null,
  motto: '',
  address: '',
  phone: '',
  email_address: '',
  website: '',
  county: '',
  country: 'Kenya',
  currency: 'KES',
  tax_percentage: '0.00',
  receipt_prefix: 'RCT-',
  invoice_prefix: 'INV-',
  admission_number_mode: 'AUTO',
  admission_number_prefix: 'ADM-',
  admission_number_padding: 4,
}

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 placeholder:text-slate-600 transition'

export default function SettingsSchoolProfilePage() {
  const [form, setForm] = useState<ProfileData>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<any>('/school/profile/')
      const p = res.data?.profile ?? null
      if (p && p.id) {
        setForm({
          id: p.id,
          school_name: p.school_name ?? '',
          logo_url: p.logo_url ?? null,
          motto: p.motto ?? '',
          address: p.address ?? '',
          phone: p.phone ?? '',
          email_address: p.email_address ?? '',
          website: p.website ?? '',
          county: p.county ?? '',
          country: p.country ?? 'Kenya',
          currency: p.currency ?? 'KES',
          tax_percentage: String(p.tax_percentage ?? '0.00'),
          receipt_prefix: p.receipt_prefix ?? 'RCT-',
          invoice_prefix: p.invoice_prefix ?? 'INV-',
          admission_number_mode: p.admission_number_mode ?? 'AUTO',
          admission_number_prefix: p.admission_number_prefix ?? 'ADM-',
          admission_number_padding: p.admission_number_padding ?? 4,
        })
        if (p.logo_url) setLogoPreview(p.logo_url)
      }
    } catch { setError('Failed to load school profile.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const setF = (k: keyof ProfileData, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  const save = async () => {
    if (!form.school_name.trim()) { setError('School name is required.'); return }
    setSaving(true); setError(null); setSuccess(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'logo_url' || k === 'id') return
        fd.append(k, String(v ?? ''))
      })
      if (logoFile) fd.append('logo', logoFile)
      await apiClient.patch('/school/profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess('School profile saved successfully.')
      await load()
    } catch { setError('Failed to save profile. Please check all fields.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-20 text-center text-slate-500 animate-pulse">Loading school profile…</div>

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">School Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Configure your school's identity, contact information, and financial settings. This information appears on all printed documents.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Check className="h-4 w-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* School Identity */}
      <section className="rounded-2xl glass-panel p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">School Identity</h2>
        </div>

        {/* Logo upload */}
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            {logoPreview
              ? <img src={logoPreview} alt="logo" className="w-20 h-20 rounded-2xl object-contain border border-white/[0.09] bg-slate-950" />
              : <div className="w-20 h-20 rounded-2xl border border-dashed border-white/[0.09] bg-slate-950 flex items-center justify-center text-slate-600 text-xs text-center">No Logo</div>
            }
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-300 mb-2">School Logo</p>
            <p className="text-[11px] text-slate-500 mb-3">Used on all documents, invoices, receipts, and the system header. PNG or JPG, minimum 200×200px.</p>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition">
              <Upload className="h-3.5 w-3.5" /> Upload Logo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">School Name *</label>
            <input value={form.school_name} onChange={e => setF('school_name', e.target.value)} placeholder="e.g. Rynaty High School" className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">School Motto / Tagline</label>
            <input value={form.motto} onChange={e => setF('motto', e.target.value)} placeholder="e.g. Excellence in Education" className={cls} />
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Contact Information</h2>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Physical Address</label>
          <textarea value={form.address} onChange={e => setF('address', e.target.value)} rows={2} placeholder="P.O. Box 123, Nairobi" className={`${cls} resize-none`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Phone Number</label>
            <input value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+254 700 000 000" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Email Address</label>
            <input type="email" value={form.email_address} onChange={e => setF('email_address', e.target.value)} placeholder="info@school.ac.ke" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Website</label>
            <input value={form.website} onChange={e => setF('website', e.target.value)} placeholder="https://www.school.ac.ke" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">County / State</label>
            <input value={form.county} onChange={e => setF('county', e.target.value)} placeholder="Nairobi" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Country</label>
            <input value={form.country} onChange={e => setF('country', e.target.value)} placeholder="Kenya" className={cls} />
          </div>
        </div>
      </section>

      {/* Finance Configuration */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Finance Configuration</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Currency</label>
            <select value={form.currency} onChange={e => setF('currency', e.target.value)} className={cls}>
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="UGX">UGX — Ugandan Shilling</option>
              <option value="TZS">TZS — Tanzanian Shilling</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
              <option value="ZAR">ZAR — South African Rand</option>
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="GHS">GHS — Ghanaian Cedi</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Tax %</label>
            <input type="number" step="0.01" min="0" value={form.tax_percentage} onChange={e => setF('tax_percentage', e.target.value)} placeholder="0.00" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Receipt Prefix</label>
            <input value={form.receipt_prefix} onChange={e => setF('receipt_prefix', e.target.value)} placeholder="RCT-" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Invoice Prefix</label>
            <input value={form.invoice_prefix} onChange={e => setF('invoice_prefix', e.target.value)} placeholder="INV-" className={cls} />
          </div>
        </div>
      </section>

      {/* Admission Numbers */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Admission Number Configuration</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Mode</label>
            <select value={form.admission_number_mode} onChange={e => setF('admission_number_mode', e.target.value as 'AUTO' | 'MANUAL')} className={cls}>
              <option value="AUTO">Auto-generate</option>
              <option value="MANUAL">Manual entry</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Prefix</label>
            <input value={form.admission_number_prefix} onChange={e => setF('admission_number_prefix', e.target.value)} placeholder="ADM-" className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Zero Padding</label>
            <input type="number" min={1} max={8} value={form.admission_number_padding} onChange={e => setF('admission_number_padding', Number(e.target.value))} className={cls} />
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          Preview: <span className="text-emerald-400 font-mono text-xs">
            {form.admission_number_prefix}{String(1).padStart(form.admission_number_padding, '0')}
          </span>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
