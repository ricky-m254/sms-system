interface Props {
  label?: string
  className?: string
}

export default function PrintButton({ label = 'Print', className = '' }: Props) {
  return (
    <button
      onClick={() => window.print()}
      className={`flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-emerald-400 hover:text-emerald-400 transition ${className}`}
    >
      🖨 {label}
    </button>
  )
}
