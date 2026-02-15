import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'

type Department = { id: number; name: string }
type Position = { id: number; title: string }

type Employee = {
  id: number
  employee_id: string
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  department: number | null
  department_name: string
  position: number | null
  position_title: string
  employment_type: string
  status: string
  join_date: string
}

type NewEmployee = {
  first_name: string
  middle_name: string
  last_name: string
  date_of_birth: string
  gender: 'Male' | 'Female' | 'Other'
  marital_status: 'Single' | 'Married' | 'Divorced' | 'Widowed'
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Intern'
  status: 'Active' | 'On Leave' | 'Suspended' | 'Terminated' | 'Retired'
  join_date: string
  department: string
  position: string
  notice_period_days: string
}

const initialForm: NewEmployee = {
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'Female',
  marital_status: 'Single',
  employment_type: 'Full-time',
  status: 'Active',
  join_date: '',
  department: '',
  position: '',
  notice_period_days: '30',
}

export default function HrEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<NewEmployee>(initialForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [employeesRes, departmentsRes, positionsRes] = await Promise.all([
        apiClient.get<Employee[]>('/hr/employees/'),
        apiClient.get<Department[]>('/hr/departments/'),
        apiClient.get<Position[]>('/hr/positions/'),
      ])
      setEmployees(employeesRes.data)
      setDepartments(departmentsRes.data)
      setPositions(positionsRes.data)
    } catch {
      setError('Unable to load employee directory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((employee) => {
      const haystack = [
        employee.employee_id,
        employee.full_name,
        employee.department_name,
        employee.position_title,
        employee.status,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [employees, search])

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.date_of_birth || !form.join_date) {
      setError('First name, last name, date of birth and join date are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await apiClient.post('/hr/employees/', {
        ...form,
        department: form.department ? Number(form.department) : null,
        position: form.position ? Number(form.position) : null,
        notice_period_days: Number(form.notice_period_days || '30'),
      })
      setForm(initialForm)
      setShowCreate(false)
      await load()
    } catch {
      setError('Unable to create employee record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Employee Directory</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Staff Profiles</h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, department, position..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 sm:max-w-md"
          />
          <button
            onClick={() => setShowCreate((prev) => !prev)}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200"
          >
            {showCreate ? 'Close Form' : 'Create Employee'}
          </button>
        </div>

        {showCreate ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2">
            <input
              value={form.first_name}
              onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
              placeholder="First name"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            />
            <input
              value={form.middle_name}
              onChange={(event) => setForm((prev) => ({ ...prev, middle_name: event.target.value }))}
              placeholder="Middle name"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            />
            <input
              value={form.last_name}
              onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
              placeholder="Last name"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(event) => setForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.join_date}
              onChange={(event) => setForm((prev) => ({ ...prev, join_date: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            />
            <input
              value={form.notice_period_days}
              onChange={(event) => setForm((prev) => ({ ...prev, notice_period_days: event.target.value }))}
              placeholder="Notice period days"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            />
            <select
              value={form.gender}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, gender: event.target.value as NewEmployee['gender'] }))
              }
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={form.marital_status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, marital_status: event.target.value as NewEmployee['marital_status'] }))
              }
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
            <select
              value={form.employment_type}
              onChange={(event) =>
                setForm((prev) =>
                  ({ ...prev, employment_type: event.target.value as NewEmployee['employment_type'] }),
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Intern">Intern</option>
            </select>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as NewEmployee['status'] }))
              }
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Suspended">Suspended</option>
              <option value="Terminated">Terminated</option>
              <option value="Retired">Retired</option>
            </select>
            <select
              value={form.department}
              onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <option value="">Department (optional)</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <select
              value={form.position}
              onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <option value="">Position (optional)</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Join Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : filteredEmployees).map((employee) => (
                <tr key={employee.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-200">{employee.employee_id}</td>
                  <td className="px-4 py-3 text-slate-100">{employee.full_name}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.department_name || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.position_title || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.employment_type}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.status}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.join_date}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <Link className="text-emerald-300 hover:text-emerald-200" to={`/modules/hr/employees/${employee.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredEmployees.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">No employees found for the current filter.</p>
        ) : null}
      </section>
    </div>
  )
}
