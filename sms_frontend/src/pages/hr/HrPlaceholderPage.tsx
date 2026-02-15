type HrPlaceholderPageProps = {
  title: string
  description: string
}

export default function HrPlaceholderPage({ title, description }: HrPlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">HR Submodule</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </section>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        This submodule is scaffolded and route-ready. Next implementation slice should wire forms, workflow actions,
        and exports against the matching `/api/hr/*` endpoints.
      </section>
    </div>
  )
}
