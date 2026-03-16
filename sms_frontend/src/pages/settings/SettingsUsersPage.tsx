import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Role = { id: number; name: string; description: string }

type TenantUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_staff: boolean
  date_joined: string | null
  last_login: string | null
  role_id: number | null
  role_name: string | null
  phone: string
}

type FormState = {
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  password: string
  role_id: string
}

const ROLE_COLORS: Record<string, string> = {
  TENANT_SUPER_ADMIN: 'bg-purple-500/20 text-purple-300',
  ADMIN: 'bg-blue-500/20 text-blue-300',
  ACCOUNTANT: 'bg-emerald-500/20 text-emerald-300',
  TEACHER: 'bg-amber-500/20 text-amber-300',
  PARENT: 'bg-sky-500/20 text-sky-300',
  STUDENT: 'bg-pink-500/20 text-pink-300',
  LIBRARIAN: 'bg-teal-500/20 text-teal-300',
  NURSE: 'bg-rose-500/20 text-rose-300',
}

const ROLE_LABELS: Record<string, string> = {
  TENANT_SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  ACCOUNTANT: 'Finance Manager',
  TEACHER: 'Teaching Staff',
  PARENT: 'Parent / Guardian',
  STUDENT: 'Student',
  LIBRARIAN: 'Librarian',
  NURSE: 'School Nurse',
}

const blank: FormState = { username: '', email: '', first_name: '', last_name: '', phone: '', password: '', role_id: '' }

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: string }).detail
    if (detail) return detail
    const msgs = Object.values(data as Record<string, unknown>).flat()
    if (msgs.length) return (msgs as string[]).join(' ')
  }
  return fallback
}

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TenantUser | null>(null)
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const [usersRes, rolesRes] = await Promise.all([
      apiClient.get('/users/'),
      apiClient.get('/users/roles/'),
    ])
    setUsers(usersRes.data.results ?? usersRes.data)
    setRoles(rolesRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(blank)
    setSaveError('')
    setShowForm(true)
  }

  const openEdit = (u: TenantUser) => {
    setEditing(u)
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      password: '',
      role_id: u.role_id ? String(u.role_id) : '',
    })
    setSaveError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true); setSaveError('')
    try {
      if (editing) {
        const payload: Partial<FormState> = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          role_id: form.role_id,
        }
        if (form.password) payload.password = form.password
        await apiClient.patch(`/users/${editing.id}/`, payload)
        setMessage('User updated successfully.')
      } else {
        await apiClient.post('/users/', { ...form, role_id: parseInt(form.role_id) || null })
        setMessage('User created successfully.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      setSaveError(extractApiError(err, 'Failed to save user.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (u: TenantUser) => {
    if (!confirm(`Deactivate "${u.username}"? They will lose access immediately.`)) return
    try {
      await apiClient.delete(`/users/${u.id}/`)
      setMessage(`${u.username} has been deactivated.`)
      load()
    } catch (err) {
      setMessage(extractApiError(err, 'Failed to deactivate user.'))
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || [u.username, u.email, u.first_name, u.last_name, u.role_name].join(' ').toLowerCase().includes(q)
  })

  const summary = {
    total: users.length,
    byRole: roles.reduce((acc, r) => {
      acc[r.name] = users.filter(u => u.role_name === r.name).length
      return acc
    }, {} as Record<string, number>),
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="User Accounts"
        subtitle="Create and manage user accounts and passwords"
        icon="⚙️"
      />
      <div className="rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">User Management</h1>
            <p className="mt-1 text-sm text-slate-400">
              Create accounts and assign roles for staff who access this system
            </p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            + Add User
          </button>
        </div>
        {message && (
          <p className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
            {message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-500">Total Users</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.total}</p>
        </div>
        {roles.map(r => (
          <div key={r.id} className="rounded-2xl glass-panel p-5">
            <p className="text-xs uppercase text-slate-500">{ROLE_LABELS[r.name] ?? r.name}</p>
            <p className="mt-2 text-2xl font-bold text-white">{summary.byRole[r.name] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl glass-panel p-6">
        <div className="mb-4">
          <input
            className="w-full max-w-sm rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 placeholder:text-slate-600"
            placeholder="Search by name, username, email, or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500 text-sm">Loading users…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-200">
              <thead>
                <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-5 text-left">Name</th>
                  <th className="pb-3 pr-5 text-left">Username</th>
                  <th className="pb-3 pr-5 text-left">Email</th>
                  <th className="pb-3 pr-5 text-left">Phone</th>
                  <th className="pb-3 pr-5 text-left">Role</th>
                  <th className="pb-3 pr-5 text-left">Last Login</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      {search ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pr-5">
                      <div className="font-medium text-white">
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : <span className="text-slate-500 italic">No name</span>}
                      </div>
                      {u.is_staff && <span className="text-xs text-slate-600">Staff</span>}
                    </td>
                    <td className="py-3 pr-5 font-mono text-xs text-slate-400">{u.username}</td>
                    <td className="py-3 pr-5 text-slate-400">{u.email || <span className="text-slate-600">—</span>}</td>
                    <td className="py-3 pr-5 text-slate-400">{u.phone || <span className="text-slate-600">—</span>}</td>
                    <td className="py-3 pr-5">
                      {u.role_name ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role_name] ?? 'bg-slate-700 text-slate-300'}`}>
                          {ROLE_LABELS[u.role_name] ?? u.role_name}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-300">No Role</span>
                      )}
                    </td>
                    <td className="py-3 pr-5 text-xs text-slate-500">{u.last_login ?? 'Never'}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(u)} className="text-xs text-slate-400 hover:text-white transition">Edit</button>
                        <button onClick={() => handleDeactivate(u)} className="text-xs text-red-400 hover:text-red-300 transition">Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl glass-panel p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Role Permissions Reference</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { name: 'TENANT_SUPER_ADMIN', label: 'Tenant Super Admin', desc: 'Full access to all modules, settings, and user management. Can configure the entire school system.' },
            { name: 'ADMIN', label: 'School Administrator', desc: 'Full access to all modules and reports. Cannot manage user accounts or system-level settings.' },
            { name: 'ACCOUNTANT', label: 'Finance Manager', desc: 'Access to Finance module only — invoices, payments, cashbook, vote heads, reports, and student accounts.' },
            { name: 'TEACHER', label: 'Teaching Staff', desc: 'Access to Academics, Students, and Attendance modules. Read-only access to class lists and grade entry.' },
            { name: 'PARENT', label: 'Parent / Guardian', desc: 'Access to the Parent Portal only — view their child\'s grades, attendance, fees, assignments and timetable.' },
            { name: 'STUDENT', label: 'Student', desc: 'Access to the Student Portal only — grades, timetable, assignments, e-learning materials, and attendance.' },
          ].map(r => (
            <div key={r.name} className="flex gap-3 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
              <span className={`mt-0.5 h-fit rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[r.name]}`}>{r.label}</span>
              <p className="text-xs text-slate-400">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-semibold text-white">
              {editing ? `Edit User: ${editing.username}` : 'Add New User'}
            </h2>
            {saveError && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{saveError}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">First Name</label>
                  <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Last Name</label>
                  <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              {!editing && (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Username <span className="text-red-400">*</span></label>
                  <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-slate-400">Email</label>
                <input type="email" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Phone</label>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  {editing ? 'New Password (leave blank to keep current)' : 'Password'} {!editing && <span className="text-red-400">*</span>}
                </label>
                <input type="password" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Role <span className="text-red-400">*</span></label>
                <select className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}>
                  <option value="">— Select a role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</option>
                  ))}
                </select>
                {form.role_id && (
                  <p className="mt-1 text-xs text-slate-500">
                    {roles.find(r => String(r.id) === form.role_id)?.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
