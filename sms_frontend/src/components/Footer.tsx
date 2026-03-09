export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
        <p className="text-[11px] text-slate-500">
          &copy; {year}{' '}
          <span className="font-semibold text-slate-400">Rynatyspace Technologies</span>
          . All rights reserved.
        </p>
        <p className="hidden text-[11px] text-slate-600 sm:block">
          Rynaty School Management System &mdash; v1.0
        </p>
      </div>
    </footer>
  )
}
