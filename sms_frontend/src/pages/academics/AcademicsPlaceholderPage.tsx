type AcademicsPlaceholderPageProps = {
  title: string
  description: string
}

export default function AcademicsPlaceholderPage({ title, description }: AcademicsPlaceholderPageProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Academics</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </header>
      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm text-slate-300">
          This submodule will be implemented in the next phase after Academic Structure.
        </p>
      </section>
    </div>
  )
}
