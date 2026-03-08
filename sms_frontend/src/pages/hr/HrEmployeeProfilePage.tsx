import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import ConfirmDialog from '../../components/ConfirmDialog'

type Employee = {
  id: number
  employee_id: string
  full_name: string
  department_name: string
  position_title: string
  status: string
  employment_type: string
  join_date: string
  work_location: string
}

type EmergencyContact = {
  id: number
  employee: number
  name: string
  relationship: string
  phone_primary: string
  phone_alt: string
  address: string
  is_primary: boolean
}

type EmployeeDocument = {
  id: number
  employee: number
  employee_name: string
  document_type: string
  file: string
  file_name: string
  description: string
  issue_date: string | null
  expiry_date: string | null
  uploaded_at: string
}

const defaultContactForm = {
  name: '',
  relationship: '',
  phone_primary: '',
  phone_alt: '',
  address: '',
  is_primary: true,
}

const defaultDocumentForm = {
  document_type: 'Other',
  description: '',
  issue_date: '',
  expiry_date: '',
  file: null as File | null,
}

export default function HrEmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const employeeId = Number(id)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [expiringDocuments, setExpiringDocuments] = useState<EmployeeDocument[]>([])
  const [contactForm, setContactForm] = useState(defaultContactForm)
  const [documentForm, setDocumentForm] = useState(defaultDocumentForm)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deleteContactTarget, setDeleteContactTarget] = useState<number | null>(null)
  const [deleteDocTarget, setDeleteDocTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const canLoad = useMemo(() => Number.isFinite(employeeId) && employeeId > 0, [employeeId])

  const load = async () => {
    if (!canLoad) {
      setError('Invalid employee ID.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [employeeRes, contactsRes, docsRes, expiringRes] = await Promise.all([
        apiClient.get<Employee>(`/hr/employees/${employeeId}/`),
        apiClient.get<EmergencyContact[]>(`/hr/emergency-contacts/?employee=${employeeId}`),
        apiClient.get<EmployeeDocument[]>(`/hr/documents/?employee=${employeeId}`),
        apiClient.get<EmployeeDocument[]>(`/hr/documents/expiring/?days=45&employee=${employeeId}`),
      ])
      setEmployee(employeeRes.data)
      setContacts(contactsRes.data)
      setDocuments(docsRes.data)
      setExpiringDocuments(expiringRes.data)
    } catch {
      setError('Unable to load employee profile details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [employeeId])

  const handleAddContact = async () => {
    if (!contactForm.name || !contactForm.relationship || !contactForm.phone_primary) {
      setError('Contact name, relationship, and primary phone are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/emergency-contacts/', {
        employee: employeeId,
        ...contactForm,
      })
      setContactForm(defaultContactForm)
      setNotice('Emergency contact saved.')
      await load()
    } catch {
      setError('Failed to save emergency contact.')
    } finally {
      setWorking(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!deleteContactTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await apiClient.delete(`/hr/emergency-contacts/${deleteContactTarget}/`)
      setNotice('Emergency contact archived.')
      setDeleteContactTarget(null)
      await load()
    } catch {
      setDeleteError('Failed to archive emergency contact.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUploadDocument = async () => {
    if (!documentForm.file) {
      setError('Select a file to upload.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const payload = new FormData()
      payload.append('employee', String(employeeId))
      payload.append('document_type', documentForm.document_type)
      payload.append('file', documentForm.file)
      payload.append('description', documentForm.description)
      if (documentForm.issue_date) payload.append('issue_date', documentForm.issue_date)
      if (documentForm.expiry_date) payload.append('expiry_date', documentForm.expiry_date)
      await apiClient.post('/hr/documents/upload/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocumentForm(defaultDocumentForm)
      setNotice('Document uploaded.')
      await load()
    } catch {
      setError('Failed to upload document.')
    } finally {
      setWorking(false)
    }
  }

  const handleDownloadDocument = async (documentId: number, fileName: string) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const response = await apiClient.get(`/hr/documents/${documentId}/download/`, {
        responseType: 'blob',
      })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        fileName || `document-${documentId}`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to download document.'))
    } finally {
      setWorking(false)
    }
  }

  const handleDeleteDocument = async () => {
    if (!deleteDocTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await apiClient.delete(`/hr/documents/${deleteDocTarget}/`)
      setNotice('Document archived.')
      setDeleteDocTarget(null)
      await load()
    } catch {
      setDeleteError('Failed to archive document.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Employee Profile</p>
            <h1 className="mt-2 text-2xl font-display font-semibold">{employee?.full_name || 'Loading...'}</h1>
          </div>
          <Link
            to="/modules/hr/employees"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-100"
          >
            Back to directory
          </Link>
        </div>
        {employee ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="text-slate-500">Employee ID:</span> {employee.employee_id}
            </p>
            <p>
              <span className="text-slate-500">Department:</span> {employee.department_name || 'Unassigned'}
            </p>
            <p>
              <span className="text-slate-500">Position:</span> {employee.position_title || 'Unassigned'}
            </p>
            <p>
              <span className="text-slate-500">Status:</span> {employee.status}
            </p>
            <p>
              <span className="text-slate-500">Type:</span> {employee.employment_type}
            </p>
            <p>
              <span className="text-slate-500">Join Date:</span> {employee.join_date}
            </p>
            <p className="sm:col-span-2">
              <span className="text-slate-500">Work Location:</span> {employee.work_location || '-'}
            </p>
          </div>
        ) : null}
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

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Emergency Contacts</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={contactForm.name}
              onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Contact name"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.relationship}
              onChange={(event) => setContactForm((prev) => ({ ...prev, relationship: event.target.value }))}
              placeholder="Relationship"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.phone_primary}
              onChange={(event) => setContactForm((prev) => ({ ...prev, phone_primary: event.target.value }))}
              placeholder="Primary phone"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.phone_alt}
              onChange={(event) => setContactForm((prev) => ({ ...prev, phone_alt: event.target.value }))}
              placeholder="Alternate phone"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={contactForm.address}
              onChange={(event) => setContactForm((prev) => ({ ...prev, address: event.target.value }))}
              placeholder="Address"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={contactForm.is_primary}
                onChange={(event) => setContactForm((prev) => ({ ...prev, is_primary: event.target.checked }))}
              />
              Primary contact
            </label>
            <button
              onClick={handleAddContact}
              disabled={working}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
            >
              Add Contact
            </button>
          </div>
          <div className="space-y-2">
            {(loading ? [] : contacts).map((contact) => (
              <div key={contact.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-slate-100">
                    {contact.name} ({contact.relationship}) {contact.is_primary ? '• Primary' : ''}
                  </p>
                  <button
                    onClick={() => setDeleteContactTarget(contact.id)}
                    className="text-xs text-rose-300"
                  >
                    Archive
                  </button>
                </div>
                <p className="mt-1 text-slate-400">{contact.phone_primary}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Employee Documents</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={documentForm.document_type}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_type: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="Resume">Resume</option>
              <option value="Certificate">Certificate</option>
              <option value="License">License</option>
              <option value="ID">ID</option>
              <option value="Contract">Contract</option>
              <option value="Medical">Medical</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="file"
              onChange={(event) =>
                setDocumentForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))
              }
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={documentForm.description}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description"
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              type="date"
              value={documentForm.issue_date}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, issue_date: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={documentForm.expiry_date}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, expiry_date: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
            <button
              onClick={handleUploadDocument}
              disabled={working}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
            >
              Upload Document
            </button>
          </div>

          {expiringDocuments.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              {expiringDocuments.length} document(s) expiring within 45 days.
            </div>
          ) : null}

          <div className="space-y-2">
            {(loading ? [] : documents).map((document) => (
              <div key={document.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-slate-100">{document.file_name}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => void handleDownloadDocument(document.id, document.file_name)}
                      disabled={working}
                      className="text-xs text-emerald-300"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => setDeleteDocTarget(document.id)}
                      className="text-xs text-rose-300"
                    >
                      Archive
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-slate-400">
                  {document.document_type}
                  {document.expiry_date ? ` • Expiry ${document.expiry_date}` : ''}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <ConfirmDialog
        open={deleteContactTarget !== null}
        title="Archive Emergency Contact"
        description="Are you sure you want to archive this emergency contact?"
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteContact}
        onCancel={() => {
          setDeleteContactTarget(null)
          setDeleteError(null)
        }}
      />

      <ConfirmDialog
        open={deleteDocTarget !== null}
        title="Archive Document"
        description="Are you sure you want to archive this document?"
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteDocument}
        onCancel={() => {
          setDeleteDocTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
