import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../../api/client'
import { Building2, Globe, Mail, MapPin, Phone, Upload, Check, AlertCircle, Palette } from 'lucide-react'
import PageHero from '../../components/PageHero'

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
  timezone: string
  language: string
  currency: string
  tax_percentage: string
  receipt_prefix: string
  invoice_prefix: string
  admission_number_mode: 'AUTO' | 'MANUAL'
  admission_number_prefix: string
  admission_number_padding: number
  primary_color: string
  secondary_color: string
  font_family: string
}

const TIMEZONES = [
  'Africa/Nairobi', 'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Cairo',
  'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Dar_es_Salaam', 'Africa/Kampala',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Asia/Dubai', 'Asia/Kolkata', 'UTC',
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili (Kiswahili)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'am', label: 'Amharic (አማርኛ)' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ha', label: 'Hausa' },
  { value: 'ig', label: 'Igbo' },
]

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
  timezone: 'Africa/Nairobi',
  language: 'en',
  currency: 'KES',
  tax_percentage: '0.00',
  receipt_prefix: 'RCT-',
  invoice_prefix: 'INV-',
  admission_number_mode: 'AUTO',
  admission_number_prefix: 'ADM-',
  admission_number_padding: 4,
  primary_color: '#10b981',
  secondary_color: '#0ea5e9',
  font_family: 'Inter',
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter — Modern, clean' },
  { value: 'Space Grotesk', label: 'Space Grotesk — Technical, strong' },
  { value: 'Poppins', label: 'Poppins — Friendly, rounded' },
  { value: 'Manrope', label: 'Manrope — Geometric, elegant' },
  { value: 'DM Sans', label: 'DM Sans — Professional, balanced' },
  { value: 'Outfit', label: 'Outfit — Contemporary, warm' },
]

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
          timezone: p.timezone ?? 'Africa/Nairobi',
          language: p.language ?? 'en',
          currency: p.currency ?? 'KES',
          tax_percentage: String(p.tax_percentage ?? '0.00'),
          receipt_prefix: p.receipt_prefix ?? 'RCT-',
          invoice_prefix: p.invoice_prefix ?? 'INV-',
          admission_number_mode: p.admission_number_mode ?? 'AUTO',
          admission_number_prefix: p.admission_number_prefix ?? 'ADM-',
          admission_number_padding: p.admission_number_padding ?? 4,
          primary_color: p.primary_color ?? '#10b981',
          secondary_color: p.secondary_color ?? '#0ea5e9',
          font_family: p.font_family ?? 'Inter',
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
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="School Profile & Branding"
        subtitle="Identity, branding, contact details and school configuration"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">School Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Configure your school's identity, branding, contact information, and financial settings. This information appears on all printed documents.</p>
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

      {/* Branding */}
      <section className="rounded-2xl glass-panel p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Branding & Theme</h2>
        </div>
        <p className="text-xs text-slate-500 -mt-2">Customize the visual identity of your school management system. Colors appear on documents, reports, and UI accents.</p>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Primary Color */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-widest">Primary Accent Color</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input type="color" value={form.primary_color}
                  onChange={e => setF('primary_color', e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-white/[0.09] bg-slate-950 p-0.5" />
              </div>
              <input value={form.primary_color} onChange={e => setF('primary_color', e.target.value)}
                placeholder="#10b981" maxLength={7}
                className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 font-mono outline-none focus:border-emerald-400 transition" />
            </div>
            <div className="mt-2 rounded-xl h-6 w-full" style={{ background: form.primary_color, opacity: 0.8 }} />
          </div>

          {/* Secondary Color */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-widest">Secondary Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.secondary_color}
                onChange={e => setF('secondary_color', e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-white/[0.09] bg-slate-950 p-0.5" />
              <input value={form.secondary_color} onChange={e => setF('secondary_color', e.target.value)}
                placeholder="#0ea5e9" maxLength={7}
                className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 font-mono outline-none focus:border-emerald-400 transition" />
            </div>
            <div className="mt-2 rounded-xl h-6 w-full" style={{ background: form.secondary_color, opacity: 0.8 }} />
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-widest">System Font Family</label>
          <select value={form.font_family} onChange={e => setF('font_family', e.target.value)} className={cls}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Live Preview */}
        <div className="rounded-2xl p-5 overflow-hidden relative"
          style={{ border: `2px solid ${form.primary_color}40`, background: `${form.primary_color}08` }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: form.primary_color }}>
            LIVE PREVIEW
          </p>
          <div className="flex items-center gap-3 mb-4">
            {logoPreview
              ? <img src={logoPreview} alt="logo" className="w-10 h-10 rounded-xl object-contain bg-white/5" />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: `${form.primary_color}20` }}>🏫</div>
            }
            <div>
              <p className="font-bold text-white text-sm" style={{ fontFamily: form.font_family }}>
                {form.school_name || 'Your School Name'}
              </p>
              <p className="text-xs" style={{ color: form.secondary_color }}>
                {form.motto || 'School Motto Here'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: form.primary_color }}>
              Primary Button
            </button>
            <button className="px-4 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: form.secondary_color }}>
              Secondary Button
            </button>
          </div>
        </div>

        {/* Preset Themes */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Theme Presets</p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Emerald', primary: '#10b981', secondary: '#0ea5e9' },
              { name: 'Royal Blue', primary: '#3b82f6', secondary: '#8b5cf6' },
              { name: 'Crimson', primary: '#ef4444', secondary: '#f59e0b' },
              { name: 'Purple', primary: '#8b5cf6', secondary: '#ec4899' },
              { name: 'Orange', primary: '#f97316', secondary: '#eab308' },
              { name: 'Teal', primary: '#14b8a6', secondary: '#06b6d4' },
            ].map(preset => (
              <button key={preset.name}
                onClick={() => { setF('primary_color', preset.primary); setF('secondary_color', preset.secondary) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.09] text-xs text-slate-300 hover:border-white/30 transition">
                <span className="flex gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: preset.primary }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: preset.secondary }} />
                </span>
                {preset.name}
              </button>
            ))}
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
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Timezone</label>
            <select value={form.timezone} onChange={e => setF('timezone', e.target.value)} className={cls}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">System Language</label>
            <select value={form.language} onChange={e => setF('language', e.target.value)} className={cls}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
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
