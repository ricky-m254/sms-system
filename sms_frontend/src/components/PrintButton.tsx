interface PrintButtonProps {
  printId?: string
  label?: string
  title?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function PrintButton({ printId, label = 'Print', title, className, size = 'sm' }: PrintButtonProps) {
  const handlePrint = () => {
    if (!printId) { window.print(); return }
    const el = document.getElementById(printId)
    if (!el) { window.print(); return }

    const win = window.open('', '_blank', 'width=960,height=720')
    if (!win) { window.print(); return }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title || label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: white; padding: 24px; }
    h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #333; }
    h3 { font-size: 13px; font-weight: 600; margin: 12px 0 6px; }
    p { margin-bottom: 4px; color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f0f0f0; border: 1px solid #ccc; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    td { border: 1px solid #ddd; padding: 6px 10px; font-size: 12px; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; border: 1px solid #ddd; }
    .badge-pass, .badge-green { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
    .badge-fail, .badge-red { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    .badge-pending, .badge-amber { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .badge-blue { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
    .meta { display: flex; flex-wrap: wrap; gap: 20px; margin: 10px 0 16px; font-size: 11px; color: #555; }
    .meta span strong { color: #111; }
    hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
    .print-header { border-bottom: 2px solid #111; margin-bottom: 16px; padding-bottom: 10px; }
    .print-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: right; }
    @media print { body { padding: 12px; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  ${el.innerHTML}
  <div class="print-footer">Printed on ${new Date().toLocaleString('en-KE')} — Rynaty School Management System</div>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 800); }<\/script>
</body>
</html>`)
    win.document.close()
  }

  const baseClass = size === 'sm'
    ? 'flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition'
    : 'flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition'

  return (
    <button onClick={handlePrint} className={className ?? baseClass}>
      🖨 {label}
    </button>
  )
}
