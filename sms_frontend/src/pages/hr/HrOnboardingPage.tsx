import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Employee = {
  id: number
  employee_id: string
  full_name: string
  status: string
}

type OnboardingTask = {
  id: number
  employee: number
  employee_name: string
  task: string
  assigned_to_name: string
  due_date: string | null
  status: 'Pending' | 'In Progress' | 'Completed'
  completed_at: string | null
  notes: string
}

const defaultTaskForm = {
  employee: '',
  task: '',
  due_date: '',
  status: 'Pending',
  notes: '',
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function HrOnboardingPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadEmployees = async () => {
    const response = await apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/')
    const rows = asArray(response.data)
    setEmployees(rows)
    if (rows.length > 0) {
      setSelectedEmployee((current) => current || String(rows[0].id))
      setTaskForm((current) => ({ ...current, employee: current.employee || String(rows[0].id) }))
    }
  }

  const loadTasks = async (employeeId: string) => {
    if (!employeeId) {
      setTasks([])
      return
    }
    const response = await apiClient.get<OnboardingTask[]>(`/hr/onboarding/${employeeId}/`)
    setTasks(response.data)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      await loadEmployees()
    } catch {
      setError('Unable to load onboarding data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    void loadTasks(selectedEmployee)
  }, [selectedEmployee])

  const createTask = async () => {
    if (!taskForm.employee || !taskForm.task) {
      setError('Employee and task are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/onboarding/', {
        employee: Number(taskForm.employee),
        task: taskForm.task.trim(),
        due_date: taskForm.due_date || null,
        status: taskForm.status,
        notes: taskForm.notes,
      })
      setTaskForm((prev) => ({ ...defaultTaskForm, employee: prev.employee }))
      setNotice('Onboarding task created.')
      await loadTasks(taskForm.employee)
    } catch {
      setError('Unable to create onboarding task.')
    } finally {
      setWorking(false)
    }
  }

  const markComplete = async (taskId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.patch(`/hr/onboarding/${taskId}/complete/`, { notes: 'Completed by HR workflow' })
      setNotice('Task completed.')
      await loadTasks(selectedEmployee)
    } catch {
      setError('Unable to complete onboarding task.')
    } finally {
      setWorking(false)
    }
  }

  const pendingCount = tasks.filter((task) => task.status !== 'Completed').length
  const completedCount = tasks.filter((task) => task.status === 'Completed').length

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Onboarding</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Checklist Tracking and Task Completion</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Employee Checklist</h2>
          <div className="mt-3">
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value)
                setTaskForm((prev) => ({ ...prev, employee: e.target.value }))
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_id} - {employee.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-slate-300">
            <p>Pending tasks: <span className="font-semibold text-slate-100">{pendingCount}</span></p>
            <p>Completed tasks: <span className="font-semibold text-slate-100">{completedCount}</span></p>
            <p>Total tasks: <span className="font-semibold text-slate-100">{tasks.length}</span></p>
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-100">Create Onboarding Task</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300 sm:col-span-2">
              Task
              <input value={taskForm.task} onChange={(e) => setTaskForm((p) => ({ ...p, task: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-300">
              Due Date
              <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-300">
              Status
              <select value={taskForm.status} onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </label>
            <label className="text-xs text-slate-300 sm:col-span-2">
              Notes
              <textarea value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} className="mt-1 h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </label>
          </div>
          <button onClick={createTask} disabled={working} className="mt-4 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60">
            {working ? 'Saving...' : 'Create Task'}
          </button>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Onboarding Tasks</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Task</th>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Due</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Assigned</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-t border-slate-800">
                  <td className="px-2 py-2">{task.task}</td>
                  <td className="px-2 py-2">{task.employee_name}</td>
                  <td className="px-2 py-2">{task.due_date || '-'}</td>
                  <td className="px-2 py-2">{task.status}</td>
                  <td className="px-2 py-2">{task.assigned_to_name || '-'}</td>
                  <td className="px-2 py-2">
                    <button onClick={() => void markComplete(task.id)} className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200">
                      Complete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-slate-400">No tasks for selected employee.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
