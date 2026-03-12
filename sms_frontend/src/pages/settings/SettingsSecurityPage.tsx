import { useState } from 'react'
import { apiClient } from '../../api/client'
import { Shield, Lock, Clock, AlertTriangle, Check, AlertCircle } from 'lucide-react'

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

export default function SettingsSecurityPage() {
  const [sessionTimeout, setSessionTimeout] = useState(60)
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5)
  const [lockoutDuration, setLockoutDuration] = useState(15)
  const [minPasswordLength, setMinPasswordLength] = useState(8)
  const [requireUppercase, setRequireUppercase] = useState(true)
  const [requireNumbers, setRequireNumbers] = useState(true)
  const [requireSpecial, setRequireSpecial] = useState(false)
  const [passwordExpireDays, setPasswordExpireDays] = useState(90)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorMethod, setTwoFactorMethod] = useState('sms')
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false)
  const [allowedIps, setAllowedIps] = useState('')
  const [auditLogRetentionDays, setAuditLogRetentionDays] = useState(365)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', {
        security_config: {
          session_timeout: sessionTimeout, max_login_attempts: maxLoginAttempts,
          lockout_duration: lockoutDuration, min_password_length: minPasswordLength,
          require_uppercase: requireUppercase, require_numbers: requireNumbers,
          require_special: requireSpecial, password_expire_days: passwordExpireDays,
          two_factor_enabled: twoFactorEnabled, two_factor_method: twoFactorMethod,
          ip_whitelist_enabled: ipWhitelistEnabled, allowed_ips: allowedIps,
          audit_log_retention_days: auditLogRetentionDays,
        }
      })
      setSuccess('Security settings saved.')
    } catch { setError('Failed to save security settings.') }
    finally { setSaving(false) }
  }

  const passwordStrength = [requireUppercase, requireNumbers, requireSpecial, minPasswordLength >= 10].filter(Boolean).length
  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'][Math.min(passwordStrength, 3)]
  const strengthColor = ['text-rose-400', 'text-amber-400', 'text-sky-400', 'text-emerald-400'][Math.min(passwordStrength, 3)]

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Security & Access Control</h1>
        <p className="mt-1 text-sm text-slate-400">Configure authentication policies, session management, password requirements, and system security settings. These settings protect all school data.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* Session */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-sky-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Session Management</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Session Timeout (minutes)</label>
            <input type="number" min={5} max={1440} value={sessionTimeout} onChange={e => setSessionTimeout(+e.target.value)} className={cls} />
            <p className="text-[10px] text-slate-600 mt-1">Users are logged out after this period of inactivity. Recommended: 60 mins.</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Audit Log Retention (days)</label>
            <input type="number" min={30} value={auditLogRetentionDays} onChange={e => setAuditLogRetentionDays(+e.target.value)} className={cls} />
            <p className="text-[10px] text-slate-600 mt-1">How long to keep action audit logs. Minimum 30 days recommended.</p>
          </div>
        </div>
      </section>

      {/* Login Protection */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Login Protection</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Max Failed Login Attempts</label>
            <input type="number" min={3} max={20} value={maxLoginAttempts} onChange={e => setMaxLoginAttempts(+e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Account Lockout Duration (minutes)</label>
            <input type="number" min={1} value={lockoutDuration} onChange={e => setLockoutDuration(+e.target.value)} className={cls} />
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200">After {maxLoginAttempts} failed attempts, the account is locked for {lockoutDuration} minutes. Admins can manually unlock accounts from User Management.</p>
        </div>
      </section>

      {/* Password Policy */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Password Policy</h2></div>
          <span className={`text-xs font-bold ${strengthColor}`}>Strength: {strengthLabel}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Minimum Length</label>
            <input type="number" min={6} max={32} value={minPasswordLength} onChange={e => setMinPasswordLength(+e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Password Expiry (days)</label>
            <input type="number" min={0} value={passwordExpireDays} onChange={e => setPasswordExpireDays(+e.target.value)} className={cls} />
            <p className="text-[10px] text-slate-600 mt-1">Set 0 to never expire.</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Require uppercase letters (A–Z)', value: requireUppercase, set: setRequireUppercase },
            { label: 'Require numbers (0–9)', value: requireNumbers, set: setRequireNumbers },
            { label: 'Require special characters (!@#$%)', value: requireSpecial, set: setRequireSpecial },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500 transition" />
              <span className="text-sm text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Two-Factor Authentication */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Two-Factor Authentication</h2></div>
          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${twoFactorEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
            {twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={twoFactorEnabled} onChange={e => setTwoFactorEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500 transition" />
          <span className="text-sm text-slate-300">Enable 2FA for admin accounts</span>
        </label>
        {twoFactorEnabled && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">2FA Method</label>
            <select value={twoFactorMethod} onChange={e => setTwoFactorMethod(e.target.value)} className={cls}>
              <option value="sms">SMS OTP</option>
              <option value="email">Email OTP</option>
              <option value="totp">Authenticator App (TOTP)</option>
            </select>
          </div>
        )}
      </section>

      {/* IP Whitelist */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-rose-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">IP Access Control</h2></div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={ipWhitelistEnabled} onChange={e => setIpWhitelistEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500 transition" />
          <span className="text-sm text-slate-300">Restrict admin access to specific IP addresses</span>
        </label>
        {ipWhitelistEnabled && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Allowed IP Addresses (one per line)</label>
            <textarea value={allowedIps} onChange={e => setAllowedIps(e.target.value)} rows={4} placeholder="192.168.1.0/24&#10;10.0.0.1&#10;203.0.113.42" className={`${cls} resize-none font-mono`} />
            <div className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              Warning: Incorrect IP configuration may lock all users out. Ensure your IP address is included.
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Security Settings'}
        </button>
      </div>
    </div>
  )
}
