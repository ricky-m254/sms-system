import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type ModuleInfo = { key: string; name: string }

type RoleData = {
  id: number
  name: string
  description: string
  user_count: number
  assigned_module_keys: string[]
  editable: boolean
}

type ApiPayload = {
  roles: RoleData[]
  all_modules: ModuleInfo[]
}

const ROLE_LABELS: Record<string, string> = {
  TENANT_SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  ACCOUNTANT: 'Finance Manager',
  TEACHER: 'Teaching Staff',
}

const ROLE_COLORS: Record<string, string> = {
  TENANT_SUPER_ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ADMIN: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ACCOUNTANT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  TEACHER: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

const MODULE_LABELS: Record<string, string> = {
  CORE: 'Core Admin',
  STUDENTS: 'Students',
  ADMISSIONS: 'Admissions',
  FINANCE: 'Finance',
  ACADEMICS: 'Academics',
  HR: 'Human Resources',
  STAFF: 'Staff Mgmt',
  PARENTS: 'Parent Portal',
  LIBRARY: 'Library',
  ASSETS: 'Assets',
  COMMUNICATION: 'Communication',
  REPORTING: 'Reporting',
  STORE: 'Store & Inventory',
  DISPENSARY: 'Dispensary',
}

export default function SettingsRolesPage() {
  const [payload, setPayload] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<string | null>(null)
  const [draftKeys, setDraftKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    apiClient
      .get<ApiPayload>('/users/role-modules/')
      .then((r) => setPayload(r.data))
      .catch(() => setError('Failed to load role module data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const startEdit = (role: RoleData) => {
    setEditing(role.name)
    setDraftKeys(new Set(role.assigned_module_keys))
    setSaveError(null)
    setSaveSuccess(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraftKeys(new Set())
    setSaveError(null)
  }

  const toggleKey = (key: string) => {
    setDraftKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const res = await apiClient.post<{ updated_users: number; role: string }>(
        '/users/role-modules/',
        { role_name: editing, module_keys: Array.from(draftKeys) }
      )
      setSaveSuccess(
        `Saved — ${res.data.updated_users} user${res.data.updated_users !== 1 ? 's' : ''} updated.`
      )
      setEditing(null)
      load()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to save changes.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )

  if (error)
    return (
      <div className="rounded-2xl border border-red-800 bg-red-900/20 p-6 text-red-300">
        {error}
        <button onClick={load} className="ml-4 text-sm underline">
          Retry
        </button>
      </div>
    )

  const { roles, all_modules } = payload!

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Roles &amp; Module Access</h2>
        <p className="mt-1 text-sm text-slate-400">
          Control which modules each role can access. Admin-level roles always have full access and
          cannot be restricted.
        </p>
      </div>

      {saveSuccess && (
        <div className="rounded-xl border border-emerald-700 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
          {saveSuccess}
        </div>
      )}

      {saveError && (
        <div className="rounded-xl border border-red-700 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {saveError}
        </div>
      )}

      <div className="space-y-4">
        {roles.map((role) => {
          const isEditing = editing === role.name
          const colorClass =
            ROLE_COLORS[role.name] ?? 'bg-slate-700/40 text-slate-300 border-slate-600/40'

          return (
            <div
              key={role.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}
                  >
                    {ROLE_LABELS[role.name] ?? role.name}
                  </span>
                  <span className="text-sm text-slate-400">
                    {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                  </span>
                  {!role.editable && (
                    <span className="rounded-full bg-slate-700/40 px-2 py-0.5 text-[10px] text-slate-400">
                      Full access — not editable
                    </span>
                  )}
                </div>

                {role.editable && !isEditing && (
                  <button
                    onClick={() => startEdit(role)}
                    className="rounded-xl border border-slate-700 px-4 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800/60"
                  >
                    Edit access
                  </button>
                )}

                {isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="rounded-xl border border-slate-700 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800/60 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="rounded-xl bg-emerald-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {all_modules.map((mod) => {
                  const isActive = isEditing
                    ? draftKeys.has(mod.key)
                    : role.assigned_module_keys.includes(mod.key)

                  if (isEditing) {
                    return (
                      <button
                        key={mod.key}
                        onClick={() => toggleKey(mod.key)}
                        className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                          isActive
                            ? 'border-emerald-600 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {MODULE_LABELS[mod.key] ?? mod.key}
                        {isActive ? ' ✓' : ''}
                      </button>
                    )
                  }

                  return (
                    <span
                      key={mod.key}
                      className={`rounded-xl border px-3 py-1 text-xs font-medium ${
                        isActive
                          ? 'border-emerald-600/50 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700/50 bg-slate-800/20 text-slate-500'
                      }`}
                    >
                      {MODULE_LABELS[mod.key] ?? mod.key}
                    </span>
                  )
                })}
              </div>

              {isEditing && (
                <p className="mt-3 text-xs text-slate-500">
                  Tap a module to toggle access. Changes apply to all active users with the{' '}
                  <strong className="text-slate-300">{ROLE_LABELS[role.name] ?? role.name}</strong>{' '}
                  role.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
