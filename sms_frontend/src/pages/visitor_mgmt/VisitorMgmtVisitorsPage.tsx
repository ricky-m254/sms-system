import PageHero from '../../components/PageHero'
export default function VisitorMgmtVisitorsPage() {
  return (
    <div className="space-y-6">
      <PageHero
        badge="VISITORS"
        badgeColor="sky"
        title="Visitor Register"
        subtitle="Sign-in/out log for all school visitors"
        icon="🪪"
      />
      <header>
        <h1 className="text-2xl font-display font-bold text-white">Visitors</h1>
        <p className="text-slate-400">Manage school visitors and sign-in/out status</p>
      </header>
      <div className="glass-panel rounded-2xl p-12 text-center">
        <p className="text-slate-400">Visitor registry management interface</p>
      </div>
    </div>
  )
}
