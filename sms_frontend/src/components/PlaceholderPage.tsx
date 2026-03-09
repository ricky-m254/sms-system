export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
        <p className="text-slate-400">This page is coming soon.</p>
      </div>
    </div>
  );
}
