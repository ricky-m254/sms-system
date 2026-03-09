import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'

type LoginResponse = {
  access: string
  refresh: string
}

type RoutingResponse = {
  user: string
  role: string | null
  permissions?: string[]
}

type LoginError = {
  detail?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setTenant = useAuthStore((state) => state.setTenant)
  const setAuthMode = useAuthStore((state) => state.setAuthMode)
  const setUsername = useAuthStore((state) => state.setUsername)
  const setRole = useAuthStore((state) => state.setRole)
  const setPermissions = useAuthStore((state) => state.setPermissions)
  const storedTenant = useAuthStore((state) => state.tenantId)

  const [username, setUsernameInput] = useState('')
  const [password, setPassword] = useState('')
  const [tenantId, setTenantId] = useState(storedTenant ?? 'demo_school')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      setTenant(tenantId.trim() || null)
      setAuthMode('tenant')
      setUsername(username.trim())
      const response = await apiClient.post<LoginResponse>('/auth/login/', {
        username: username.trim(),
        password,
      })
      setTokens(response.data.access, response.data.refresh)
      const routing = await apiClient.get<RoutingResponse>('/dashboard/routing/')
      setRole(routing.data.role ?? null)
      setPermissions(routing.data.permissions ?? [])
      try {
        localStorage.setItem(
          'sms_user',
          JSON.stringify({
            id: routing.data.user,
            username: routing.data.user,
            role: routing.data.role,
            permissions: routing.data.permissions ?? [],
          }),
        )
      } catch {
        // ignore
      }
      navigate('/dashboard')
    } catch (err) {
      const message = (err as { response?: { data?: LoginError } })?.response?.data?.detail
      setError(message ?? 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-10 px-4 py-10 sm:px-6 sm:py-16 md:flex-row">
        <div className="flex-1 space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-400 font-semibold">Tenant Portal</p>
          <h1 className="text-4xl font-display font-semibold leading-tight md:text-5xl">
            Rynaty School Management System
          </h1>
          <p className="text-base text-slate-300">
            Sign in to your assigned modules. Routing is determined by your role and
            module access.
          </p>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            <p className="font-semibold text-white">Tips for local dev</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Tenant header uses `X-Tenant-ID`.</li>
              <li>Backend default base URL is `http://demo.localhost:8000`.</li>
              <li>Login endpoint: `/api/auth/login/`.</li>
            </ul>
          </div>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl sm:p-8">
          <h2 className="text-xl font-display font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-slate-400">
            Use your tenant credentials to continue.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              Tenant ID
              <input
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="demo_school"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Username
              <input
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="admin"
                value={username}
                onChange={(event) => setUsernameInput(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <button
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">
            Platform admin?{' '}
            <button
              type="button"
              className="text-emerald-300 hover:text-emerald-200"
              onClick={() => navigate('/platform/login')}
            >
              Use Super Admin login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
