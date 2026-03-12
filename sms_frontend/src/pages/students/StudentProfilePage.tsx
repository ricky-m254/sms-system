import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { buildPrintDocument, openPrintWindow, type TenantPrintMeta } from '../../utils/printTemplate'
import { downloadBlob, extractFilename } from '../../utils/download'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

const tabs = [
  'Personal',
  'Guardians',
  'Enrollment',
  'Academics',
  'Attendance',
  'Behavior',
  'Medical',
  'Documents',
]

type Guardian = {
  id: number
  name: string
  relationship?: string
  phone?: string
  email?: string
  is_active?: boolean
}

type StudentDetail = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  date_of_birth?: string
  gender?: string
  is_active?: boolean
  photo?: string | null
  uploaded_documents?: Array<{ id: number; name: string; url: string }>
  guardians?: Guardian[]
}

type Enrollment = {
  id: number
  student: number
  school_class?: number
  class_name?: string
  term?: number
  term_name?: string
  enrollment_date?: string
}

type AttendanceSummary = {
  attendance_rate?: number
  present?: number
  absent?: number
  late?: number
  period_label?: string
}

type AttendanceRecord = {
  id: number
  date: string
  status: string
  notes?: string
}

type BehaviorIncident = {
  id: number
  incident_type: string
  category: string
  incident_date: string
  severity?: string
}

type AcademicRecord = {
  id: number
  subject: string
  score?: number
  grade?: string
  term?: string
}

type MedicalRecord = {
  id: number
  student: number
  blood_type?: string
  allergies?: string
  chronic_conditions?: string
  current_medications?: string
  doctor_name?: string
  doctor_phone?: string
  notes?: string
  last_visit?: string | null
}

type ClinicVisit = {
  id: number
  visit_date: string
  complaint?: string
  treatment?: string
  severity?: string
  parent_notified?: boolean
}

type StudentOperationalSummary = {
  attendance: {
    summary: AttendanceSummary
    records: AttendanceRecord[]
  }
  behavior: BehaviorIncident[]
  academics: AcademicRecord[]
  medical: {
    record: MedicalRecord | null
    visits: ClinicVisit[]
  }
}

type StudentReport = {
  student: {
    id: number
    admission_number: string
    first_name: string
    last_name: string
    gender?: string | null
    date_of_birth?: string | null
    photo?: string | null
  }
  guardians: Array<{
    id: number
    name: string
    relationship: string
    phone?: string | null
    email?: string | null
  }>
  enrollment: {
    class_id?: number | null
    term_id?: number | null
    enrollment_date?: string | null
  }
  attendance: {
    attendance_rate: number
    present: number
    absent: number
    late: number
  }
  behavior: Array<{
    incident_type: string
    category: string
    incident_date: string
    severity?: string | null
    description?: string | null
  }>
  medical: {
    record?: {
      blood_type?: string | null
      allergies?: string | null
      chronic_conditions?: string | null
      current_medications?: string | null
      doctor_name?: string | null
      doctor_phone?: string | null
    } | null
    visits?: Array<{
      visit_date: string
      complaint?: string | null
      treatment?: string | null
      severity?: string | null
      parent_notified?: boolean | null
    }>
  }
  documents: Array<{
    id: number
    name: string
    url: string
    uploaded_at?: string | null
  }>
}

type SchoolProfileResponse = {
  tenant?: {
    name?: string | null
    schema?: string | null
  } | null
  profile?: {
    school_name?: string | null
    address?: string | null
    phone?: string | null
    logo_url?: string | null
  } | null
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState('Personal')
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [behaviorIncidents, setBehaviorIncidents] = useState<BehaviorIncident[]>([])
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([])
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null)
  const [clinicVisits, setClinicVisits] = useState<ClinicVisit[]>([])
  const [dataNotice, setDataNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const [tenantMeta, setTenantMeta] = useState<TenantPrintMeta | null>(null)
  const [printError, setPrintError] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const [deleteDocTarget, setDeleteDocTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let isMounted = true
    const loadProfile = async () => {
      try {
        const [studentRes, enrollmentRes] = await Promise.all([
          apiClient.get<StudentDetail>(`/students/${id}/`),
          apiClient.get<Enrollment[] | { results: Enrollment[]; count: number }>(
            '/enrollments/',
            { params: { student: id } },
          ),
        ])
        if (!isMounted) return
        setStudent(studentRes.data)
        const enrollmentItems = normalizePaginatedResponse(enrollmentRes.data).items
        setEnrollments(enrollmentItems.filter((entry) => String(entry.student) === String(id)))
        setDataNotice(null)
      } catch (err) {
        if (!isMounted) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          setError('Session expired. Please log in again.')
        } else if (status === 403) {
          setError('Access denied. Ensure this user has the STUDENTS module and proper role.')
        } else if (status === 404) {
          setError('Student record not found.')
        } else {
          setError('Unable to load student profile.')
        }
        setStudent(null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    let isMounted = true
    const loadProfileMeta = async () => {
      try {
        const profileRes = await apiClient.get<SchoolProfileResponse>('/school/profile/')
        if (!isMounted) return
        const payload = profileRes.data
        const name = payload.profile?.school_name ?? payload.tenant?.name ?? payload.tenant?.schema ?? undefined
        setTenantMeta({
          name,
          address: payload.profile?.address,
          phone: payload.profile?.phone,
          logoUrl: payload.profile?.logo_url ?? undefined,
          schema: payload.tenant?.schema,
        })
      } catch {
        const fallbackTenant = localStorage.getItem('sms_tenant_id')
        if (!isMounted) return
        setTenantMeta(fallbackTenant ? { name: fallbackTenant, schema: fallbackTenant } : null)
      }
    }
    loadProfileMeta()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let isMounted = true
    const loadStudentOperationalData = async () => {
      try {
        const response = await apiClient.get<StudentOperationalSummary>(`/students/${id}/operational-summary/`)
        if (isMounted) {
          setAttendanceSummary(response.data.attendance?.summary ?? null)
          setAttendanceRecords(response.data.attendance?.records ?? [])
          setBehaviorIncidents(response.data.behavior ?? [])
          setAcademicRecords(response.data.academics ?? [])
          setMedicalRecord(response.data.medical?.record ?? null)
          setClinicVisits(response.data.medical?.visits ?? [])
          setDataNotice(null)
        }
      } catch {
        if (isMounted) {
          setAttendanceSummary(null)
          setAttendanceRecords([])
          setBehaviorIncidents([])
          setAcademicRecords([])
          setMedicalRecord(null)
          setClinicVisits([])
          setDataNotice('Operational student data unavailable.')
        }
      }
    }
    loadStudentOperationalData()
    return () => {
      isMounted = false
    }
  }, [id])

  const activeEnrollment = useMemo(() => {
    if (enrollments.length === 0) return null
    return enrollments[0]
  }, [enrollments])

  const handlePhotoUpload = async (file: File) => {
    if (!id) return
    setUploadingPhoto(true)
    setDocError(null)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await apiClient.post<{ photo: string }>(`/students/${id}/photo/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStudent((prev) => (prev ? { ...prev, photo: res.data.photo } : prev))
    } catch {
      setDocError('Unable to upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDocumentsUpload = async (files: FileList | null) => {
    if (!id || !files || files.length === 0) return
    setUploadingDocs(true)
    setDocError(null)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('documents', file))
      const res = await apiClient.post<{ documents: Array<{ id: number; name: string; url: string }> }>(
        `/students/${id}/documents/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              uploaded_documents: [
                ...(prev.uploaded_documents ?? []),
                ...res.data.documents,
              ],
            }
          : prev,
      )
    } catch {
      setDocError('Unable to upload documents.')
    } finally {
      setUploadingDocs(false)
    }
  }

  const handleDocumentDelete = async () => {
    if (!id || !deleteDocTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setDocError(null)
    try {
      await apiClient.delete(`/students/${id}/documents/${deleteDocTarget}/`)
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              uploaded_documents: (prev.uploaded_documents ?? []).filter((doc) => doc.id !== deleteDocTarget),
            }
          : prev,
      )
      setDeleteDocTarget(null)
    } catch {
      setDeleteError('Unable to delete document.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '--'
    return String(value)
  }

  const handleDownloadStudentReport = async (format: 'csv' | 'pdf') => {
    if (!id) return
    setPrintError(null)
    setIsDownloading(true)
    try {
      const response = await apiClient.get(`/students/${id}/report/export/${format}/`, {
        responseType: 'blob',
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName = format === 'csv' ? `student_report_${id}.csv` : `student_report_${id}.pdf`
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setPrintError(`Unable to download ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadOperationalReport = async (scope: 'attendance' | 'behavior', format: 'csv' | 'pdf') => {
    if (!id) return
    setPrintError(null)
    setIsDownloading(true)
    try {
      const endpoint =
        scope === 'attendance' ? `/attendance/records/export/${format}/` : `/behavior/incidents/export/${format}/`
      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
        params: { student: id },
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName =
        scope === 'attendance'
          ? format === 'csv'
            ? `student_${id}_attendance.csv`
            : `student_${id}_attendance.pdf`
          : format === 'csv'
            ? `student_${id}_behavior.csv`
            : `student_${id}_behavior.pdf`
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      const area = scope === 'attendance' ? 'attendance' : 'behavior'
      setPrintError(`Unable to download ${area} ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrintStudentReport = async () => {
    if (!id) return
    setPrintError(null)
    setIsPrinting(true)
    try {
      const response = await apiClient.get<StudentReport>(`/students/${id}/report/`)
      const report = response.data
      const html = `
        <h2>Student Overview</h2>
        <div class="card">
          <p>Name: ${report.student.first_name} ${report.student.last_name}</p>
          <p>Admission #: ${formatValue(report.student.admission_number)}</p>
          <p>Gender: ${formatValue(report.student.gender)}</p>
          <p>Date of Birth: ${formatValue(report.student.date_of_birth)}</p>
        </div>
        <div class="divider"></div>
        <h2>Guardians</h2>
        ${
          report.guardians.length > 0
            ? `<table><thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th></tr></thead><tbody>${report.guardians
                .map(
                  (guardian) =>
                    `<tr><td>${guardian.name}</td><td>${guardian.relationship}</td><td>${formatValue(
                      guardian.phone,
                    )}</td><td>${formatValue(guardian.email)}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : '<p class="muted">No guardians recorded.</p>'
        }
        <div class="divider"></div>
        <h2>Enrollment</h2>
        <div class="card">
          <p>Class ID: ${formatValue(report.enrollment.class_id)}</p>
          <p>Term ID: ${formatValue(report.enrollment.term_id)}</p>
          <p>Enrollment Date: ${formatValue(report.enrollment.enrollment_date)}</p>
        </div>
        <div class="divider"></div>
        <h2>Attendance</h2>
        <div class="card">
          <p>Attendance Rate: ${report.attendance.attendance_rate}%</p>
          <p>Present: ${report.attendance.present}</p>
          <p>Absent: ${report.attendance.absent}</p>
          <p>Late: ${report.attendance.late}</p>
        </div>
        <div class="divider"></div>
        <h2>Behavior (Latest)</h2>
        ${
          report.behavior.length > 0
            ? `<table><thead><tr><th>Type</th><th>Category</th><th>Date</th><th>Severity</th><th>Notes</th></tr></thead><tbody>${report.behavior
                .map(
                  (incident) =>
                    `<tr><td>${incident.incident_type}</td><td>${incident.category}</td><td>${incident.incident_date}</td><td>${formatValue(
                      incident.severity,
                    )}</td><td>${formatValue(incident.description)}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : '<p class="muted">No behavior incidents.</p>'
        }
        <div class="divider"></div>
        <h2>Medical</h2>
        <div class="card">
          <p>Blood Type: ${formatValue(report.medical.record?.blood_type)}</p>
          <p>Allergies: ${formatValue(report.medical.record?.allergies)}</p>
          <p>Chronic Conditions: ${formatValue(report.medical.record?.chronic_conditions)}</p>
          <p>Current Medications: ${formatValue(report.medical.record?.current_medications)}</p>
          <p>Doctor: ${formatValue(report.medical.record?.doctor_name)}</p>
          <p>Doctor Phone: ${formatValue(report.medical.record?.doctor_phone)}</p>
        </div>
        <h3>Recent Clinic Visits</h3>
        ${
          (report.medical.visits ?? []).length > 0
            ? `<table><thead><tr><th>Date</th><th>Complaint</th><th>Treatment</th><th>Severity</th><th>Parent Notified</th></tr></thead><tbody>${(
                report.medical.visits ?? []
              )
                .map(
                  (visit) =>
                    `<tr><td>${visit.visit_date}</td><td>${formatValue(visit.complaint)}</td><td>${formatValue(
                      visit.treatment,
                    )}</td><td>${formatValue(visit.severity)}</td><td>${visit.parent_notified ? 'Yes' : 'No'}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : '<p class="muted">No clinic visits recorded.</p>'
        }
        <div class="divider"></div>
        <h2>Documents</h2>
        ${
          report.documents.length > 0
            ? `<table><thead><tr><th>Name</th><th>Uploaded At</th></tr></thead><tbody>${report.documents
                .map((doc) => `<tr><td>${doc.name}</td><td>${formatValue(doc.uploaded_at)}</td></tr>`)
                .join('')}</tbody></table>`
            : '<p class="muted">No documents uploaded.</p>'
        }
      `
      const documentHtml = buildPrintDocument({
        title: `Student Report - ${report.student.first_name} ${report.student.last_name}`,
        header: {
          badge: 'Student Report',
          title: `${report.student.first_name} ${report.student.last_name}`,
          subtitle: `Admission #: ${formatValue(report.student.admission_number)}`,
          generatedAt: new Date().toLocaleString(),
          tenant: tenantMeta ?? undefined,
        },
        bodyHtml: html,
      })
      openPrintWindow(`Student Report - ${report.student.first_name} ${report.student.last_name}`, documentHtml)
    } catch {
      setPrintError('Unable to print student report.')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Student Profile"
        subtitle="Profile ID: {id ?? '--'}"
        icon="📋"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading student profile...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}
      {printError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{printError}</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-[240px]">
            <h2 className="text-lg font-display font-semibold">
              {student ? `${student.first_name} ${student.last_name}`.trim() : '--'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {student?.admission_number ?? '--'} - {activeEnrollment?.class_name ?? '--'} -{' '}
              {student?.is_active ? 'Active' : 'Inactive'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/[0.09] px-3 py-1">
                DOB: {student?.date_of_birth ?? '--'}
              </span>
              <span className="rounded-full border border-white/[0.09] px-3 py-1">
                Gender: {student?.gender ?? '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
              onClick={handlePrintStudentReport}
              disabled={isPrinting || isDownloading}
            >
              {isPrinting ? 'Preparing...' : 'Print report'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-70"
              onClick={() => handleDownloadStudentReport('csv')}
              disabled={isDownloading || isPrinting}
            >
              {isDownloading ? 'Working...' : 'Download CSV'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-70"
              onClick={() => handleDownloadStudentReport('pdf')}
              disabled={isDownloading || isPrinting}
            >
              {isDownloading ? 'Working...' : 'Download PDF'}
            </button>
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-950">
              {student?.photo ? (
                <img src={student.photo} alt="Student" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">
                  No photo
                </div>
              )}
            </div>
            <label className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200">
              {uploadingPhoto ? 'Uploading...' : 'Replace photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handlePhotoUpload(file)
                  event.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        </div>

        {!student ? (
          <p className="mt-3 text-xs text-amber-200">
            Student record unavailable. Verify the backend and permissions.
          </p>
        ) : null}
        {dataNotice ? (
          <p className="mt-2 text-xs text-amber-200">{dataNotice}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`rounded-xl px-3 py-1 text-xs ${
                activeTab === tab
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'border border-white/[0.07] text-slate-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-slate-950/60 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase text-slate-400">{activeTab}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {activeTab === 'Personal' ? (
              <>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Admission #</p>
                  <p>{student?.admission_number ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Class</p>
                  <p>{activeEnrollment?.class_name ?? '--'}</p>
                </div>
              </>
            ) : null}

            {activeTab === 'Guardians' ? (
              <div className="col-span-2 space-y-2">
                {(student?.guardians ?? []).map((guardian) => (
                  <div key={guardian.id} className="rounded-xl border border-white/[0.07] p-3 text-xs">
                    <p className="text-sm text-white">{guardian.name}</p>
                    <p className="text-[11px] text-slate-400">{guardian.relationship}</p>
                    <p className="text-[11px] text-slate-400">
                      {guardian.phone} | {guardian.email}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === 'Enrollment' ? (
              <div className="col-span-2 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Class</p>
                  <p>{activeEnrollment?.class_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Term</p>
                  <p>{activeEnrollment?.term_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Enrollment Date</p>
                  <p>{activeEnrollment?.enrollment_date ?? '--'}</p>
                </div>
              </div>
            ) : null}

            {activeTab === 'Attendance' ? (
              <div className="col-span-2 grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('attendance', 'csv')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Attendance CSV'}
                  </button>
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('attendance', 'pdf')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Attendance PDF'}
                  </button>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Attendance rate</p>
                  <p>{attendanceSummary?.attendance_rate ?? '--'}%</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Period</p>
                  <p>{attendanceSummary?.period_label ?? 'Last 30 days'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Present</p>
                  <p>{attendanceSummary?.present ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Absent</p>
                  <p>{attendanceSummary?.absent ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Late</p>
                  <p>{attendanceSummary?.late ?? '--'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase text-slate-400">Recent records</p>
                  <div className="mt-2 space-y-2 text-xs">
                    {attendanceRecords.length > 0 ? (
                      attendanceRecords.map((record) => (
                        <div key={record.id} className="rounded-lg border border-white/[0.07] p-2">
                          {record.date} - {record.status}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">No attendance records.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'Behavior' ? (
              <div className="col-span-2 space-y-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('behavior', 'csv')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Behavior CSV'}
                  </button>
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('behavior', 'pdf')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Behavior PDF'}
                  </button>
                </div>
                {behaviorIncidents.length > 0 ? (
                  behaviorIncidents.map((incident) => (
                    <div key={incident.id} className="rounded-lg border border-white/[0.07] p-2 text-xs">
                      <p className="text-sm text-white">
                        {incident.incident_type}: {incident.category}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {incident.incident_date} - {incident.severity ?? '--'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No behavior incidents.</p>
                )}
              </div>
            ) : null}

            {activeTab === 'Academics' ? (
              <div className="col-span-2 space-y-2">
                {academicRecords.length > 0 ? (
                  academicRecords.map((record) => (
                    <div key={record.id} className="rounded-lg border border-white/[0.07] p-2 text-xs">
                      <p className="text-sm text-white">{record.subject}</p>
                      <p className="text-[11px] text-slate-400">
                        Score: {record.score ?? '--'} | Grade: {record.grade ?? '--'} | Term:{' '}
                        {record.term ?? '--'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No academic records.</p>
                )}
              </div>
            ) : null}

            {activeTab === 'Medical' ? (
              <div className="col-span-2 space-y-3">
                <div className="rounded-xl border border-white/[0.07] p-4 text-xs">
                  <p className="text-xs uppercase text-slate-400">Medical profile</p>
                  {medicalRecord ? (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Blood type</p>
                        <p>{medicalRecord.blood_type ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Last visit</p>
                        <p>{medicalRecord.last_visit ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Allergies</p>
                        <p>{medicalRecord.allergies || '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Conditions</p>
                        <p>{medicalRecord.chronic_conditions || '--'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[11px] uppercase text-slate-400">Medications</p>
                        <p>{medicalRecord.current_medications || '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Doctor</p>
                        <p>{medicalRecord.doctor_name || '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Doctor phone</p>
                        <p>{medicalRecord.doctor_phone || '--'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[11px] uppercase text-slate-400">Notes</p>
                        <p>{medicalRecord.notes || '--'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No medical profile on record.</p>
                  )}
                </div>

                <div className="rounded-xl border border-white/[0.07] p-4 text-xs">
                  <p className="text-xs uppercase text-slate-400">Recent clinic visits</p>
                  <div className="mt-2 space-y-2">
                    {clinicVisits.length > 0 ? (
                      clinicVisits.map((visit) => (
                        <div key={visit.id} className="rounded-lg border border-white/[0.07] p-2">
                          <p className="text-sm text-white">{visit.visit_date}</p>
                          <p className="text-[11px] text-slate-400">
                            {visit.complaint || 'No complaint'} - {visit.severity || 'Unspecified'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Parent notified: {visit.parent_notified ? 'Yes' : 'No'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No clinic visits logged.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'Documents' ? (
              <div className="col-span-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">Upload student documents</p>
                  <label className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200">
                    {uploadingDocs ? 'Uploading...' : 'Add documents'}
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      disabled={uploadingDocs}
                      onChange={(event) => {
                        void handleDocumentsUpload(event.target.files)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                </div>
                {docError ? <p className="text-xs text-rose-300">{docError}</p> : null}
                {(student?.uploaded_documents ?? []).length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {(student?.uploaded_documents ?? []).map((doc) => (
                      <div key={doc.id} className="rounded-xl border border-white/[0.07] p-3 text-xs">
                        <p className="text-sm text-white">{doc.name}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <a
                            className="text-xs text-emerald-200 underline"
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                          <button
                            className="text-xs text-rose-200"
                            onClick={() => setDeleteDocTarget(doc.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No documents uploaded.</p>
                )}
              </div>
            ) : null}

          </div>
        </div>
      </section>

      <ConfirmDialog
        open={deleteDocTarget !== null}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDocumentDelete}
        onCancel={() => {
          setDeleteDocTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}



