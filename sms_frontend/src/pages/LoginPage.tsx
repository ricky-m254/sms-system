import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'
import { Eye, EyeOff, ArrowRight, Loader2, GraduationCap, Shield, BarChart3, Globe, Zap, Lock } from 'lucide-react'
import brandLogo from '@/assets/brand/rynatyschool-logo.png'

type LoginResponse  = { access: string; refresh: string }
type RoutingResponse = { user: string; role: string | null; permissions?: string[] }
type LoginError    = { detail?: string }

const FEATURES = [
  { icon: GraduationCap, label: '28 Integrated Modules',    sub: 'Admissions to alumni — all in one place'   },
  { icon: BarChart3,     label: 'Real-time Analytics',      sub: 'Live KPIs, dashboards and reports'          },
  { icon: Shield,        label: 'IPSAS-Compliant Finance',  sub: 'Full audit trail and accountability'        },
  { icon: Globe,         label: 'Multi-tenant Architecture',sub: 'Scale across a network of schools'          },
  { icon: Zap,           label: 'CBC Kenya Aligned',        sub: 'PP1 through Grade 9 curriculum-ready'       },
  { icon: Lock,          label: 'Enterprise-grade Security',sub: 'Role-based access & encrypted data'         },
]

function FloatingOrb({ size, color, top, left, delay }: {
  size: number; color: string; top: string; left: string; delay: number
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none blur-3xl opacity-20 animate-pulse"
      style={{ width: size, height: size, background: color, top, left, animationDelay: `${delay}s`, animationDuration: '5s' }}
    />
  )
}

export default function LoginPage() {
  const navigate       = useNavigate()
  const setTokens      = useAuthStore(s => s.setTokens)
  const setTenant      = useAuthStore(s => s.setTenant)
  const setAuthMode    = useAuthStore(s => s.setAuthMode)
  const setUsername    = useAuthStore(s => s.setUsername)
  const setRole        = useAuthStore(s => s.setRole)
  const setPermissions = useAuthStore(s => s.setPermissions)
  const storedTenant   = useAuthStore(s => s.tenantId)

  const [username,  setUsernameInput] = useState('')
  const [password,  setPassword]      = useState('')
  const [tenantId,  setTenantId]      = useState(storedTenant ?? 'demo_school')
  const [error,     setError]         = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [showPass,  setShowPass]      = useState(false)
  const [mounted,   setMounted]       = useState(false)


  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      setTenant(tenantId.trim() || null)
      setAuthMode('tenant')
      setUsername(username.trim())
      const res     = await apiClient.post<LoginResponse>('/auth/login/', { username: username.trim(), password })
      setTokens(res.data.access, res.data.refresh)
      const routing = await apiClient.get<RoutingResponse>('/dashboard/routing/')
      setRole(routing.data.role ?? null)
      setPermissions(routing.data.permissions ?? [])
      try {
        localStorage.setItem('sms_user', JSON.stringify({
          id: routing.data.user, username: routing.data.user,
          role: routing.data.role, permissions: routing.data.permissions ?? [],
        }))
      } catch { /* ignore */ }
      navigate('/dashboard')
    } catch (err) {
      const msg = (err as { response?: { data?: LoginError } })?.response?.data?.detail
      setError(msg ?? 'Invalid credentials. Please check your details.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden" style={{ background: '#070b12' }}>

      {/* ── Left brand panel ────────────────────────── */}
      <div
        className="relative hidden lg:flex flex-col justify-between w-[500px] xl:w-[560px] flex-shrink-0 overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, #0a1f3a 0%, #070b12 55%, #061220 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Animated ambient orbs */}
        <FloatingOrb size={500} color="radial-gradient(circle, #10b98135, transparent)" top="-15%"  left="-25%" delay={0} />
        <FloatingOrb size={350} color="radial-gradient(circle, #0ea5e928, transparent)" top="55%"  left="55%"  delay={2.5} />
        <FloatingOrb size={280} color="radial-gradient(circle, #8b5cf618, transparent)" top="75%"  left="-8%"  delay={1.2} />
        <FloatingOrb size={200} color="radial-gradient(circle, #10b98120, transparent)" top="30%"  left="70%"  delay={3.5} />

        {/* Fine grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Emerald accent line top */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #10b981, #0ea5e9, transparent)' }} />

        {/* Brand content */}
        <div className={`relative z-10 px-12 pt-8 pb-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Brand Logo — top left */}
          <div className="mb-10">
            <img
              src={brandLogo}
              alt="RynatySchool SmartCampus"
              className="h-16 w-auto object-contain object-left select-none"
              draggable={false}
            />
          </div>

          {/* Hero text */}
          <h1 className="text-[38px] xl:text-[44px] font-display font-bold text-white leading-[1.12] mb-5 tracking-tight">
            Powering Smart Schools,<br />
            <span style={{
              background: 'linear-gradient(90deg, #10b981 0%, #0ea5e9 60%, #6366f1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>from Africa to the World.</span>
          </h1>
          <p className="text-slate-400 text-[14px] leading-relaxed mb-10 max-w-[340px]">
            The most advanced school management platform built for Africa's educators — CBC-aligned, IPSAS-compliant, and enterprise-ready.
          </p>

          {/* Feature list */}
          <div className="space-y-3.5">
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={`flex items-center gap-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
                style={{ transitionDelay: `${i * 70 + 150}ms` }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <f.icon size={14} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-200 leading-none">{f.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — copyright */}
        <div className="relative z-10 px-12 pb-10">
          <div className="border-t border-white/[0.05] pt-6">
            <p className="text-[11px] text-slate-700">
              © {new Date().getFullYear()} RynatySpace Technologies Ltd. All rights reserved.
            </p>
            <p className="text-[10px] text-slate-800 mt-0.5">
              RynatySchool SmartCampus · Powering Smart Schools
            </p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8 sm:py-12 relative overflow-hidden min-h-screen lg:min-h-0">
        {/* Ambient glow */}
        <div className="absolute pointer-events-none"
          style={{
            width: 600, height: 600,
            background: 'radial-gradient(circle, #10b98112 0%, transparent 70%)',
            top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          }}
        />

        <div className={`relative w-full max-w-[390px] transition-all duration-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Mobile logo — top left, only shown when left panel is hidden */}
          <div className="flex items-start mb-8 lg:hidden">
            <img src={brandLogo} alt="RynatySchool SmartCampus" className="h-12 w-auto object-contain object-left select-none" draggable={false} />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-display font-bold text-white leading-tight mb-2">Welcome back</h2>
            <p className="text-slate-500 text-[13px]">Sign in to your SmartCampus command centre.</p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* Tenant ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.12em]">
                School ID (Tenant)
              </label>
              <input
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                placeholder="demo_school"
                autoComplete="organization"
                className="w-full rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 outline-none transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.background = 'rgba(16,185,129,0.04)' }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.12em]">
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 outline-none transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.background = 'rgba(16,185,129,0.04)' }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-[0.12em]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-[13px] text-white placeholder-slate-600 outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.background = 'rgba(16,185,129,0.04)' }}
                  onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition p-1"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-[12px] text-rose-300 flex items-start gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-[13px] font-bold text-white transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {isLoading
                ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                : <><span>Sign in to SmartCampus</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Tagline */}
          <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
            <p className="text-[11px] text-slate-700 tracking-wide uppercase font-medium">
              Powering Smart Schools · From Africa to The World.
            </p>
          </div>

          {/* Platform admin link */}
          <p className="mt-4 text-center text-[12px] text-slate-600">
            Platform administrator?{' '}
            <button
              type="button"
              className="font-semibold transition hover:opacity-80"
              style={{ color: '#10b981' }}
              onClick={() => navigate('/platform/login')}
            >
              Super Admin login →
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
