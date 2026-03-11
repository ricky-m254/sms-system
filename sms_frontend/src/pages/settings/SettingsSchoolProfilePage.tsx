import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../../api/client'
import { Building2, Upload } from 'lucide-react'

interface ProfileData {
  id?: number
  school_name: string
  logo_url?: string | null
  address: string
  phone: string
  currency: string
  tax_percentage: string
  receipt_prefix: string
  admission_number_mode: 'AUTO' | 'MANUAL'
  admission_number_prefix: string
  admission_number_padding: number
}

const DEFAULTS: ProfileData = {
  school_name: '',
  logo_url: null,
  address: '',
  phone: '',
  currency: 'KES',
  tax_percentage: '0.00',
  receipt_prefix: 'RCT-',
  admission_number_mode: 'AUTO',
  admission_number_prefix: 'ADM-',
  admission_number_padding: 4,
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 placeholder:text-slate-600"
    />
  )
}

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
      const res = await apiClient.get<{ profile: ProfileData; tenant: { name: string } }>('/school/profile/')
      const p = res.data.profile
      if (p) {
        setForm({
          id: (p as any).id,
          school_name: p.school_name ?? '',
          logo_url: p.logo_url ?? null,
          address: p.address ?? '',
          phone: p.phone ?? '',
          currency: p.currency ?? 'KES',
          tax_percentage: String(p.tax_percentage ?? '0.00'),
          receipt_prefix: p.receipt_prefix ?? 'RCT-',
          admission_number_mode: p.admission_number_mode ?? 'AUTO',
          admission_number_prefix: p.admission_number_prefix ?? 'ADM-',
          admission_number_padding: p.admission_number_padding ?? 4,
        })
        setLogoPreview(p.logo_url ?? null)
      }
    } catch { setError('Unable to load school profile.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const setF = (k: keyof ProfileData, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    if (!form.school_name.trim()) { setError('School name is required.'); return }
    setSaving(true); setError(null); setSuccess(null)
    try {
      const fd = new FormData()
      fd.append('school_name', form.school_name)
      fd.append('address', form.address)
      fd.append('phone', form.phone)
      fd.append('currency', form.currency)
      fd.append('tax_percentage', form.tax_percentage)
      fd.append('receipt_prefix', form.receipt_prefix)
      fd.append('admission_number_mode', form.admission_number_mode)
      fd.append('admission_number_prefix', form.admission_number_prefix)
      fd.append('admission_number_padding', String(form.admission_number_padding))
      if (logoFile) fd.append('logo', logoFile)

      await apiClient.patch('/school/profile/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess('School profile saved successfully.')
      setLogoFile(null)
      await load()
    } catch {
      setError('Failed to save school profile. Check your permissions.')
    } finally { setSaving(false) }
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-sm text-slate-400 animate-pulse">Loading school profile...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">School Profile</h1>
            <p className="mt-1 text-sm text-slate-400">Core identity and configuration for this school. These settings appear across all modules.</p>
          </div>
        </div>
        {error && <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
        {success && <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}
      </div>

      {/* Logo */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">School Logo</h2>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl border-2 border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              : <Building2 className="w-8 h-8 text-slate-600" />}
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition"
            >
              <Upload className="w-4 h-4" /> Upload Logo
            </button>
            <p className="mt-1.5 text-xs text-slate-600">PNG or JPG, max 2MB. Displayed on reports and invoices.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            {logoFile && <p className="mt-1 text-xs text-emerald-400">{logoFile.name} selected</p>}
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">School Identity</h2>
        <Field label="School Name *" hint="Appears on reports, invoices, and all official documents.">
          <Input value={form.school_name} onChange={v => setF('school_name', v)} placeholder="e.g. Rynaty Academy" />
        </Field>
        <Field label="Physical Address">
          <textarea
            value={form.address}
            onChange={e => setF('address', e.target.value)}
            rows={3}
            placeholder="Street, City, County, Country"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 resize-none placeholder:text-slate-600"
          />
        </Field>
        <Field label="Phone Number">
          <Input value={form.phone} onChange={v => setF('phone', v)} placeholder="+254 700 000 000" />
        </Field>
      </div>

      {/* Finance Configuration */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Finance Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Currency Code" hint="Used on all invoices and receipts.">
            <Input value={form.currency} onChange={v => setF('currency', v)} placeholder="KES" />
          </Field>
          <Field label="Tax / VAT %" hint="Applied when generating invoices.">
            <Input value={form.tax_percentage} onChange={v => setF('tax_percentage', v)} placeholder="0.00" type="number" />
          </Field>
          <Field label="Receipt Prefix" hint="e.g. RCT-0001">
            <Input value={form.receipt_prefix} onChange={v => setF('receipt_prefix', v)} placeholder="RCT-" />
          </Field>
        </div>
      </div>

      {/* Admission Number Configuration */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Admission Number Format</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Generation Mode">
            <select
              value={form.admission_number_mode}
              onChange={e => setF('admission_number_mode', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value="AUTO">Auto-generate</option>
              <option value="MANUAL">Manual entry</option>
            </select>
          </Field>
          <Field label="Prefix" hint="e.g. ADM-">
            <Input value={form.admission_number_prefix} onChange={v => setF('admission_number_prefix', v)} placeholder="ADM-" />
          </Field>
          <Field label="Number Padding" hint="Digits in the sequence (e.g. 4 → 0001)">
            <input
              type="number"
              min={1} max={10}
              value={form.admission_number_padding}
              onChange={e => setF('admission_number_padding', Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
            />
          </Field>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
          Preview: <span className="font-mono text-emerald-300">
            {form.admission_number_prefix}{new Date().getFullYear()}-{'0'.repeat(Math.max(0, form.admission_number_padding - 1))}1
          </span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => void load()}
          className="rounded-xl border border-slate-700 px-5 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
        >
          Reset
        </button>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
