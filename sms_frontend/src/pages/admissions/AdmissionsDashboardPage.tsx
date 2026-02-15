import { Link } from 'react-router-dom'

export default function AdmissionsDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admissions</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Standalone admissions module is active. Use applications to manage intake.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-display font-semibold">Quick actions</h2>
        <div className="mt-4">
          <Link
            to="/modules/admissions/inquiries"
            className="mr-2 inline-flex rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            Open inquiries
          </Link>
          <Link
            to="/modules/admissions/applications"
            className="inline-flex rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            Open applications
          </Link>
          <Link
            to="/modules/admissions/assessments"
            className="ml-2 inline-flex rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            Open assessments
          </Link>
          <Link
            to="/modules/admissions/interviews"
            className="ml-2 inline-flex rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            Open interviews
          </Link>
          <Link
            to="/modules/admissions/decisions"
            className="ml-2 inline-flex rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            Open decisions
          </Link>
          <Link
            to="/modules/admissions/enrollment"
            className="ml-2 inline-flex rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            Open enrollment
          </Link>
          <Link
            to="/modules/admissions/analytics"
            className="ml-2 inline-flex rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            Open analytics
          </Link>
        </div>
      </section>
    </div>
  )
}
