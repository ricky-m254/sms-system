import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

type Department = {
  id: number
  name: string
}

type EmployeeRow = {
  id: number
  employee_id: string
  full_name: string
  department: number | null
  department_name: string
}

type AttendanceRecord = {
  id: number
  employee: number
  employee_name: string
  date: string
  clock_in: string | null
  clock_out: string | null
  status: string
  hours_worked: string
  overtime_hours: string
}

type AttendanceSummary = {
  month: number
  year: number
  total_records: number
  present_count: number
  late_count: number
  absent_count: number
  average_overtime_hours: string
}

type AttendanceReportRow = {
  employee_id: string
  employee_name: string
  days: number
  present: number
  absent: number
  late: number
  average_hours: string
}

type WorkSchedule = {
  id: number
  employee: number | null
  employee_name: string
  department: number | null
  department_name: string
  shift_start: string
  shift_end: string
  working_days: string[]
  break_duration: number
  effective_from: string
  effective_to: string | null
}

type ScheduleForm = {
  id: number | null
  employee: string
  department: string
  shift_start: string
  shift_end: string
  working_days: string[]
  break_duration: string
  effective_from: string
  effective_to: string
}

const defaultSummary: AttendanceSummary = {
  month: 0,
  year: 0,
  total_records: 0,
  present_count: 0,
  late_count: 0,
  absent_count: 0,
  average_overtime_hours: '0.00',
}

const defaultScheduleForm: ScheduleForm = {
  id: null,
  employee: '',
  department: '',
  shift_start: '',
  shift_end: '',
  working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  break_duration: '60',
  effective_from: '',
  effective_to: '',
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const POLICY_THRESHOLD_KEY = 'hr:attendance:overtime_threshold_hours'
const POLICY_INCLUDE_BREAK_KEY = 'hr:attendance:include_break'

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvRows = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function HrAttendancePage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [reportRows, setReportRows] = useState<AttendanceReportRow[]>([])
  const [summary, setSummary] = useState<AttendanceSummary>(defaultSummary)
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('')
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [monthlyExportMonth, setMonthlyExportMonth] = useState(String(new Date().getMonth() + 1))
  const [monthlyExportYear, setMonthlyExportYear] = useState(String(new Date().getFullYear()))

  const [clockEmployee, setClockEmployee] = useState('')
  const [clockDate, setClockDate] = useState('')
  const [clockInTime, setClockInTime] = useState('')
  const [clockOutTime, setClockOutTime] = useState('')

  const [overtimeThresholdHours, setOvertimeThresholdHours] = useState('8')
  const [includeBreakInPolicy, setIncludeBreakInPolicy] = useState(false)

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(defaultScheduleForm)

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const storedThreshold = localStorage.getItem(POLICY_THRESHOLD_KEY)
    const storedIncludeBreak = localStorage.getItem(POLICY_INCLUDE_BREAK_KEY)
    if (storedThreshold) setOvertimeThresholdHours(storedThreshold)
    if (storedIncludeBreak) setIncludeBreakInPolicy(storedIncludeBreak === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem(POLICY_THRESHOLD_KEY, overtimeThresholdHours || '8')
    localStorage.setItem(POLICY_INCLUDE_BREAK_KEY, String(includeBreakInPolicy))
  }, [overtimeThresholdHours, includeBreakInPolicy])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParts = [
        selectedEmployeeFilter ? `employee=${selectedEmployeeFilter}` : '',
        selectedDepartmentFilter ? `department=${selectedDepartmentFilter}` : '',
        dateFrom ? `date_from=${dateFrom}` : '',
        dateTo ? `date_to=${dateTo}` : '',
      ].filter(Boolean)
      const attendanceQuery = queryParts.length ? `?${queryParts.join('&')}` : ''

      const summaryQueryParts = [
        `month=${monthlyExportMonth}`,
        `year=${monthlyExportYear}`,
        selectedEmployeeFilter ? `employee=${selectedEmployeeFilter}` : '',
        selectedDepartmentFilter ? `department=${selectedDepartmentFilter}` : '',
      ].filter(Boolean)

      const [departmentsRes, employeesRes, recordsRes, summaryRes, reportRes, schedulesRes] = await Promise.all([
        apiClient.get<Department[]>('/school/departments/'),
        apiClient.get<EmployeeRow[]>('/hr/employees/'),
        apiClient.get<AttendanceRecord[]>(`/hr/attendance/${attendanceQuery}`),
        apiClient.get<AttendanceSummary>(`/hr/attendance/summary/?${summaryQueryParts.join('&')}`),
        apiClient.get<AttendanceReportRow[]>(`/hr/attendance/report/${attendanceQuery}`),
        apiClient.get<WorkSchedule[]>('/hr/schedules/'),
      ])

      setDepartments(departmentsRes.data)
      setEmployees(employeesRes.data)
      setRecords(recordsRes.data)
      setSummary(summaryRes.data)
      setReportRows(reportRes.data)
      setSchedules(schedulesRes.data)
    } catch {
      setError('Unable to load attendance data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [selectedDepartmentFilter, selectedEmployeeFilter, dateFrom, dateTo, monthlyExportMonth, monthlyExportYear])

  const filteredEmployees = useMemo(() => {
    if (!selectedDepartmentFilter) return employees
    return employees.filter((employee) => String(employee.department ?? '') === selectedDepartmentFilter)
  }, [employees, selectedDepartmentFilter])

  const selectedClockEmployeeLabel = useMemo(() => {
    const match = employees.find((employee) => String(employee.id) === clockEmployee)
    return match ? `${match.employee_id} - ${match.full_name}` : ''
  }, [employees, clockEmployee])

  const policyOvertimePreview = useMemo(() => {
    const threshold = Number(overtimeThresholdHours || '8')
    const totalHours = records.reduce((sum, record) => sum + Number(record.hours_worked || '0'), 0)
    const entries = records.length || 1
    const averageHours = totalHours / entries
    const preview = Math.max(averageHours - threshold, 0)
    return preview.toFixed(2)
  }, [records, overtimeThresholdHours])

  const openCreateSchedule = () => {
    setScheduleForm(defaultScheduleForm)
    setShowScheduleModal(true)
  }

  const openEditSchedule = (schedule: WorkSchedule) => {
    setScheduleForm({
      id: schedule.id,
      employee: schedule.employee ? String(schedule.employee) : '',
      department: schedule.department ? String(schedule.department) : '',
      shift_start: schedule.shift_start?.slice(0, 5) ?? '',
      shift_end: schedule.shift_end?.slice(0, 5) ?? '',
      working_days: schedule.working_days ?? [],
      break_duration: String(schedule.break_duration ?? 60),
      effective_from: schedule.effective_from ?? '',
      effective_to: schedule.effective_to ?? '',
    })
    setShowScheduleModal(true)
  }

  const closeScheduleModal = () => {
    setShowScheduleModal(false)
    setScheduleForm(defaultScheduleForm)
  }

  const saveSchedule = async () => {
    if (!scheduleForm.shift_start || !scheduleForm.shift_end || !scheduleForm.effective_from) {
      setError('Shift start, shift end, and effective from are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        employee: scheduleForm.employee ? Number(scheduleForm.employee) : null,
        department: scheduleForm.department ? Number(scheduleForm.department) : null,
        shift_start: `${scheduleForm.shift_start}:00`,
        shift_end: `${scheduleForm.shift_end}:00`,
        working_days: scheduleForm.working_days,
        break_duration: Number(scheduleForm.break_duration || '60'),
        effective_from: scheduleForm.effective_from,
        effective_to: scheduleForm.effective_to || null,
      }
      if (scheduleForm.id) {
        await apiClient.patch(`/hr/schedules/${scheduleForm.id}/`, payload)
        setNotice('Work schedule updated.')
      } else {
        await apiClient.post('/hr/schedules/', payload)
        setNotice('Work schedule created.')
      }
      closeScheduleModal()
      await load()
    } catch {
      setError('Unable to save work schedule.')
    } finally {
      setWorking(false)
    }
  }

  const archiveSchedule = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await apiClient.delete(`/hr/schedules/${deleteTarget}/`)
      setNotice('Work schedule archived.')
      setDeleteTarget(null)
      await load()
    } catch {
      setDeleteError('Unable to archive schedule.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClockIn = async () => {
    if (!clockEmployee || !clockDate) {
      setError('Employee and date are required for clock-in.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/attendance/clock-in/', {
        employee: Number(clockEmployee),
        date: clockDate,
        clock_in: clockInTime ? `${clockInTime}:00` : undefined,
      })
      setNotice('Clock-in recorded.')
      await load()
    } catch {
      setError('Clock-in failed.')
    } finally {
      setWorking(false)
    }
  }

  const handleClockOut = async () => {
    if (!clockEmployee || !clockDate) {
      setError('Employee and date are required for clock-out.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/attendance/clock-out/', {
        employee: Number(clockEmployee),
        date: clockDate,
        clock_out: clockOutTime ? `${clockOutTime}:00` : undefined,
      })
      setNotice('Clock-out recorded.')
      await load()
    } catch {
      setError('Clock-out failed.')
    } finally {
      setWorking(false)
    }
  }

  const exportMonthlyAttendanceCsv = () => {
    const month = Number(monthlyExportMonth)
    const year = Number(monthlyExportYear)
    const monthlyRecords = records.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate.getUTCMonth() + 1 === month && recordDate.getUTCFullYear() === year
    })
    downloadCsv(
      `hr_attendance_${year}_${String(month).padStart(2, '0')}.csv`,
      ['Employee', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours Worked', 'Overtime Hours'],
      monthlyRecords.map((record) => [
        record.employee_name,
        record.date,
        record.clock_in ?? '',
        record.clock_out ?? '',
        record.status,
        record.hours_worked,
        record.overtime_hours,
      ]),
    )
  }

  const toggleScheduleDay = (day: string) => {
    setScheduleForm((prev) => {
      const hasDay = prev.working_days.includes(day)
      return {
        ...prev,
        working_days: hasDay ? prev.working_days.filter((item) => item !== day) : [...prev.working_days, day],
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Attendance & Time</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Time Tracking</h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Records</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.total_records}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Present</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.present_count}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Late</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.late_count}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Avg Overtime</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.average_overtime_hours}</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Filters & Monthly Export</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <select
            value={selectedDepartmentFilter}
            onChange={(event) => {
              setSelectedDepartmentFilter(event.target.value)
              setSelectedEmployeeFilter('')
            }}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            value={selectedEmployeeFilter}
            onChange={(event) => setSelectedEmployeeFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <option value="">All employees</option>
            {filteredEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_id} - {employee.full_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={12}
              value={monthlyExportMonth}
              onChange={(event) => setMonthlyExportMonth(event.target.value)}
              className="w-20 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-sm"
            />
            <input
              type="number"
              min={2000}
              max={2100}
              value={monthlyExportYear}
              onChange={(event) => setMonthlyExportYear(event.target.value)}
              className="w-24 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-sm"
            />
          </div>
          <button
            onClick={exportMonthlyAttendanceCsv}
            className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200"
          >
            Export Monthly CSV
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Overtime Policy Settings</h2>
        <p className="mt-1 text-xs text-slate-500">
          Policy settings are currently UI-level reporting controls and do not override backend attendance computation yet.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            min={0}
            step="0.5"
            value={overtimeThresholdHours}
            onChange={(event) => setOvertimeThresholdHours(event.target.value)}
            placeholder="Threshold hours"
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={includeBreakInPolicy}
              onChange={(event) => setIncludeBreakInPolicy(event.target.checked)}
            />
            Include break duration
          </label>
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
            Preview avg overtime by policy: <span className="font-semibold text-slate-100">{policyOvertimePreview}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Clock Actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={clockEmployee}
            onChange={(event) => setClockEmployee(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_id} - {employee.full_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={clockDate}
            onChange={(event) => setClockDate(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={clockInTime}
            onChange={(event) => setClockInTime(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={clockOutTime}
            onChange={(event) => setClockOutTime(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleClockIn}
              disabled={working}
              className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
            >
              Clock In
            </button>
            <button
              onClick={handleClockOut}
              disabled={working}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Clock Out
            </button>
          </div>
        </div>
        {selectedClockEmployeeLabel ? (
          <p className="mt-2 text-xs text-slate-400">Selected: {selectedClockEmployeeLabel}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <header className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Attendance Records</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Clock In</th>
                <th className="px-4 py-3 text-left">Clock Out</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : records).map((record) => (
                <tr key={record.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-100">{record.employee_name}</td>
                  <td className="px-4 py-3 text-slate-300">{record.date}</td>
                  <td className="px-4 py-3 text-slate-300">{record.clock_in ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{record.clock_out ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{record.status}</td>
                  <td className="px-4 py-3 text-slate-300">{record.hours_worked}</td>
                  <td className="px-4 py-3 text-slate-300">{record.overtime_hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <header className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Attendance Report (By Employee)</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee ID</th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Present</th>
                <th className="px-4 py-3 text-left">Absent</th>
                <th className="px-4 py-3 text-left">Late</th>
                <th className="px-4 py-3 text-left">Avg Hours</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : reportRows).map((row) => (
                <tr key={row.employee_id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-100">{row.employee_id}</td>
                  <td className="px-4 py-3 text-slate-300">{row.employee_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.days}</td>
                  <td className="px-4 py-3 text-slate-300">{row.present}</td>
                  <td className="px-4 py-3 text-slate-300">{row.absent}</td>
                  <td className="px-4 py-3 text-slate-300">{row.late}</td>
                  <td className="px-4 py-3 text-slate-300">{row.average_hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Work Schedules</h2>
          <button
            onClick={openCreateSchedule}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200"
          >
            Create
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Scope</th>
                <th className="px-4 py-3 text-left">Shift</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Break</th>
                <th className="px-4 py-3 text-left">Effective</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : schedules).map((schedule) => (
                <tr key={schedule.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-300">
                    {schedule.employee_name || schedule.department_name || 'Global'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {schedule.shift_start?.slice(0, 5)} - {schedule.shift_end?.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{(schedule.working_days || []).join(', ')}</td>
                  <td className="px-4 py-3 text-slate-300">{schedule.break_duration} min</td>
                  <td className="px-4 py-3 text-slate-300">
                    {schedule.effective_from}
                    {schedule.effective_to ? ` to ${schedule.effective_to}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditSchedule(schedule)}
                        className="text-xs text-emerald-300"
                        disabled={working}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(schedule.id)}
                        className="text-xs text-rose-300"
                        disabled={working}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showScheduleModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                {scheduleForm.id ? 'Edit Work Schedule' : 'Create Work Schedule'}
              </h2>
              <button onClick={closeScheduleModal} className="text-sm text-slate-400">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                value={scheduleForm.department}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, department: event.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">Department scope (optional)</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <select
                value={scheduleForm.employee}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, employee: event.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">Employee scope (optional)</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_id} - {employee.full_name}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={scheduleForm.shift_start}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, shift_start: event.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={scheduleForm.shift_end}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, shift_end: event.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={scheduleForm.break_duration}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, break_duration: event.target.value }))}
                placeholder="Break duration (minutes)"
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={scheduleForm.effective_from}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, effective_from: event.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={scheduleForm.effective_to}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, effective_to: event.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
              />
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Working Days</p>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <label
                      key={day}
                      className={`cursor-pointer rounded-lg border px-3 py-1 text-xs ${
                        scheduleForm.working_days.includes(day)
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                          : 'border-slate-700 bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={scheduleForm.working_days.includes(day)}
                        onChange={() => toggleScheduleDay(day)}
                        className="sr-only"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={saveSchedule}
                disabled={working}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Archive Work Schedule"
        description="Are you sure you want to archive this work schedule?"
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={archiveSchedule}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
