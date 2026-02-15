import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

type Department = { id: number; name: string }
type Position = { id: number; title: string; department: number }
type JobPosting = {
  id: number
  title: string
  department: number | null
  department_name: string
  position: number | null
  position_title: string
  employment_type: string
  status: string
  deadline: string | null
}
type JobApplication = {
  id: number
  job_posting: number
  job_title: string
  applicant_name: string
  email: string
  status: string
}
type Interview = {
  id: number
  application: number
  applicant_name: string
  interview_date: string
  interview_type: string
  status: string
  score: string | null
}

const defaultPostingForm = {
  title: '',
  department: '',
  position: '',
  employment_type: 'Full-time',
  deadline: '',
  description: '',
  requirements: '',
}

const defaultApplicationForm = {
  job_posting: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  cover_letter: '',
}

const defaultInterviewForm = {
  application: '',
  interview_date: '',
  interview_type: 'In-person',
  location: '',
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function HrRecruitmentPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])

  const [postingForm, setPostingForm] = useState(defaultPostingForm)
  const [applicationForm, setApplicationForm] = useState(defaultApplicationForm)
  const [interviewForm, setInterviewForm] = useState(defaultInterviewForm)

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [departmentsRes, positionsRes, postingsRes, applicationsRes, interviewsRes] = await Promise.all([
        apiClient.get<Department[] | { results: Department[] }>('/hr/departments/'),
        apiClient.get<Position[] | { results: Position[] }>('/hr/positions/'),
        apiClient.get<JobPosting[] | { results: JobPosting[] }>('/hr/job-postings/'),
        apiClient.get<JobApplication[] | { results: JobApplication[] }>('/hr/applications/'),
        apiClient.get<Interview[] | { results: Interview[] }>('/hr/interviews/'),
      ])
      setDepartments(asArray(departmentsRes.data))
      setPositions(asArray(positionsRes.data))
      setPostings(asArray(postingsRes.data))
      setApplications(asArray(applicationsRes.data))
      setInterviews(asArray(interviewsRes.data))
    } catch {
      setError('Unable to load recruitment data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createPosting = async () => {
    if (!postingForm.title) {
      setError('Job title is required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/job-postings/', {
        title: postingForm.title.trim(),
        department: postingForm.department ? Number(postingForm.department) : null,
        position: postingForm.position ? Number(postingForm.position) : null,
        employment_type: postingForm.employment_type,
        deadline: postingForm.deadline || null,
        description: postingForm.description,
        requirements: postingForm.requirements,
      })
      setPostingForm(defaultPostingForm)
      setNotice('Job posting created.')
      await load()
    } catch {
      setError('Unable to create job posting.')
    } finally {
      setWorking(false)
    }
  }

  const publishPosting = async (id: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/job-postings/${id}/publish/`, {})
      setNotice('Job posting published.')
      await load()
    } catch {
      setError('Unable to publish job posting.')
    } finally {
      setWorking(false)
    }
  }

  const createApplication = async () => {
    if (!applicationForm.job_posting || !applicationForm.first_name || !applicationForm.last_name || !applicationForm.email) {
      setError('Job posting, name, and email are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/applications/', {
        job_posting: Number(applicationForm.job_posting),
        first_name: applicationForm.first_name.trim(),
        last_name: applicationForm.last_name.trim(),
        email: applicationForm.email.trim(),
        phone: applicationForm.phone.trim(),
        cover_letter: applicationForm.cover_letter,
      })
      setApplicationForm(defaultApplicationForm)
      setNotice('Application submitted.')
      await load()
    } catch {
      setError('Unable to submit application.')
    } finally {
      setWorking(false)
    }
  }

  const shortlistApplication = async (id: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/applications/${id}/shortlist/`, {})
      setNotice('Candidate shortlisted.')
      await load()
    } catch {
      setError('Unable to shortlist candidate.')
    } finally {
      setWorking(false)
    }
  }

  const rejectApplication = async (id: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/applications/${id}/reject/`, { notes: 'Not selected in current cycle' })
      setNotice('Candidate rejected.')
      await load()
    } catch {
      setError('Unable to reject candidate.')
    } finally {
      setWorking(false)
    }
  }

  const hireApplication = async (id: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/applications/${id}/hire/`, {})
      setNotice('Candidate hired and onboarding started.')
      await load()
    } catch {
      setError('Unable to hire candidate.')
    } finally {
      setWorking(false)
    }
  }

  const scheduleInterview = async () => {
    if (!interviewForm.application || !interviewForm.interview_date) {
      setError('Application and interview date are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/interviews/', {
        application: Number(interviewForm.application),
        interview_date: interviewForm.interview_date,
        interview_type: interviewForm.interview_type,
        location: interviewForm.location,
        interviewers: [],
      })
      setInterviewForm(defaultInterviewForm)
      setNotice('Interview scheduled.')
      await load()
    } catch {
      setError('Unable to schedule interview.')
    } finally {
      setWorking(false)
    }
  }

  const saveFeedback = async (id: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/interviews/${id}/feedback/`, { feedback: 'Strong candidate', score: 4.0, status: 'Completed' })
      setNotice('Interview feedback submitted.')
      await load()
    } catch {
      setError('Unable to submit feedback.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recruitment & ATS</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Job Postings, Applications, Interviews</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Job Posting</h2>
          <div className="mt-3 space-y-2 text-xs">
            <input value={postingForm.title} onChange={(e) => setPostingForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <select value={postingForm.department} onChange={(e) => setPostingForm((p) => ({ ...p, department: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={postingForm.position} onChange={(e) => setPostingForm((p) => ({ ...p, position: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Position</option>
              {positions.map((pos) => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
            </select>
            <input type="date" value={postingForm.deadline} onChange={(e) => setPostingForm((p) => ({ ...p, deadline: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createPosting} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60">Save Posting</button>
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Submit Application</h2>
          <div className="mt-3 space-y-2 text-xs">
            <select value={applicationForm.job_posting} onChange={(e) => setApplicationForm((p) => ({ ...p, job_posting: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Job posting</option>
              {postings.map((post) => <option key={post.id} value={post.id}>{post.title}</option>)}
            </select>
            <input value={applicationForm.first_name} onChange={(e) => setApplicationForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="First name" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input value={applicationForm.last_name} onChange={(e) => setApplicationForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input value={applicationForm.email} onChange={(e) => setApplicationForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createApplication} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60">Submit</button>
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Schedule Interview</h2>
          <div className="mt-3 space-y-2 text-xs">
            <select value={interviewForm.application} onChange={(e) => setInterviewForm((p) => ({ ...p, application: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Application</option>
              {applications.map((app) => <option key={app.id} value={app.id}>{app.applicant_name} - {app.job_title}</option>)}
            </select>
            <input type="datetime-local" value={interviewForm.interview_date} onChange={(e) => setInterviewForm((p) => ({ ...p, interview_date: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <select value={interviewForm.interview_type} onChange={(e) => setInterviewForm((p) => ({ ...p, interview_type: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option>In-person</option>
              <option>Video</option>
              <option>Phone</option>
            </select>
            <button onClick={scheduleInterview} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60">Schedule</button>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Job Postings</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400"><tr><th className="px-2 py-2">Title</th><th className="px-2 py-2">Department</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Deadline</th><th className="px-2 py-2">Action</th></tr></thead>
            <tbody>
              {postings.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-2 py-2">{row.title}</td><td className="px-2 py-2">{row.department_name}</td><td className="px-2 py-2">{row.status}</td><td className="px-2 py-2">{row.deadline ?? '-'}</td>
                  <td className="px-2 py-2"><button onClick={() => void publishPosting(row.id)} className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200">Publish</button></td>
                </tr>
              ))}
              {!loading && postings.length === 0 ? <tr><td colSpan={5} className="px-2 py-3 text-slate-400">No job postings.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Applications</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400"><tr><th className="px-2 py-2">Candidate</th><th className="px-2 py-2">Job</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Actions</th></tr></thead>
              <tbody>
                {applications.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="px-2 py-2">{row.applicant_name}</td><td className="px-2 py-2">{row.job_title}</td><td className="px-2 py-2">{row.status}</td>
                    <td className="px-2 py-2"><div className="flex gap-2"><button onClick={() => void shortlistApplication(row.id)} className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200">Shortlist</button><button onClick={() => void rejectApplication(row.id)} className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200">Reject</button><button onClick={() => void hireApplication(row.id)} className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Hire</button></div></td>
                  </tr>
                ))}
                {!loading && applications.length === 0 ? <tr><td colSpan={4} className="px-2 py-3 text-slate-400">No applications.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Interviews</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400"><tr><th className="px-2 py-2">Candidate</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Feedback</th></tr></thead>
              <tbody>
                {interviews.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="px-2 py-2">{row.applicant_name}</td><td className="px-2 py-2">{new Date(row.interview_date).toLocaleString()}</td><td className="px-2 py-2">{row.interview_type}</td><td className="px-2 py-2">{row.status}</td>
                    <td className="px-2 py-2"><button onClick={() => void saveFeedback(row.id)} className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200">Record</button></td>
                  </tr>
                ))}
                {!loading && interviews.length === 0 ? <tr><td colSpan={5} className="px-2 py-3 text-slate-400">No interviews.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}
