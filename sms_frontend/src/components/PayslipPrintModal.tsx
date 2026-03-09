import { useRef } from 'react'
import { X, Printer } from 'lucide-react'

type ComponentItem = {
  name: string
  component_type: 'Allowance' | 'Deduction'
  amount_type: string
  amount: number
  is_taxable: boolean
}

type PayslipData = {
  id: number
  employee_name: string
  employee_id_str: string
  department_name: string
  position_name: string
  currency: string
  pay_frequency: string
  payroll_month: number
  payroll_year: number
  payroll_payment_date: string | null
  basic_salary: string
  total_allowances: string
  total_deductions: string
  gross_salary: string
  net_salary: string
  days_worked: string
  overtime_hours: string
  components: ComponentItem[]
}

type Props = {
  payslip: PayslipData
  schoolName: string
  onClose: () => void
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmtKes(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `Ksh ${(isNaN(num) ? 0 : num).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

export default function PayslipPrintModal({ payslip, schoolName, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <title>Payslip – ${payslip.employee_name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff}
        .payslip{width:100%;max-width:800px;margin:0 auto;padding:24px}
        .header{border-bottom:3px solid #047857;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start}
        .school-name{font-size:18px;font-weight:700;color:#047857}
        .school-sub{font-size:11px;color:#555;margin-top:2px}
        .slip-title{font-size:14px;font-weight:700;text-align:right;color:#111}
        .slip-period{font-size:11px;color:#555;text-align:right}
        .employee-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;margin-bottom:16px}
        .emp-field{margin-bottom:4px}
        .emp-label{font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:#555}
        .emp-value{font-size:11px;font-weight:600;color:#111}
        .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#047857;background:#f0fdf4;padding:4px 8px;border-left:3px solid #047857;margin-bottom:8px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th{background:#f0fdf4;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:#555;padding:5px 8px;text-align:left;border-bottom:2px solid #bbf7d0}
        td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}
        td:last-child,th:last-child{text-align:right}
        .subtotal{font-weight:600;background:#f9fafb}
        .net-box{border:2px solid #047857;border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .net-label{font-size:14px;font-weight:700;color:#047857}
        .net-value{font-size:18px;font-weight:700;color:#111}
        .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px}
        .sig-box{border-top:1px solid #111;padding-top:4px;font-size:10px;color:#555}
        .footer{margin-top:24px;font-size:9px;color:#aaa;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}
        @media print{body{margin:0}button{display:none}}
      </style></head><body>
      <div class="payslip">${content.innerHTML}</div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 400)
  }

  const allowances = payslip.components.filter((c) => c.component_type === 'Allowance')
  const deductions = payslip.components.filter((c) => c.component_type === 'Deduction')
  const periodLabel = `${MONTH_NAMES[payslip.payroll_month] ?? payslip.payroll_month} ${payslip.payroll_year}`
  const currency = payslip.currency === 'KES' ? 'Ksh' : payslip.currency

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Payslip — {payslip.employee_name}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Printer size={13} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-6 text-slate-800">
          <div className="mb-4 flex items-start justify-between border-b-2 border-emerald-700 pb-3">
            <div>
              <p className="text-xl font-bold text-emerald-700">{schoolName || 'Rynaty School Management System'}</p>
              <p className="mt-0.5 text-xs text-slate-500">Powered by Rynatyspace Technologies</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">PAYSLIP</p>
              <p className="text-xs text-slate-500">Period: {periodLabel}</p>
              {payslip.payroll_payment_date && (
                <p className="text-xs text-slate-500">Payment Date: {payslip.payroll_payment_date}</p>
              )}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Employee Name</p>
              <p className="text-xs font-semibold text-slate-800">{payslip.employee_name}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Employee ID</p>
              <p className="text-xs font-semibold text-slate-800">{payslip.employee_id_str || '—'}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Department</p>
              <p className="text-xs font-semibold text-slate-800">{payslip.department_name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Position</p>
              <p className="text-xs font-semibold text-slate-800">{payslip.position_name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Days Worked</p>
              <p className="text-xs font-semibold text-slate-800">{payslip.days_worked}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Pay Frequency</p>
              <p className="text-xs font-semibold text-slate-800">{payslip.pay_frequency}</p>
            </div>
          </div>

          <p className="mb-2 border-l-4 border-emerald-600 bg-emerald-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
            Earnings
          </p>
          <table className="mb-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-emerald-50 text-[9px] uppercase tracking-wide text-slate-500">
                <th className="border-b-2 border-emerald-200 px-2 py-2 text-left">Description</th>
                <th className="border-b-2 border-emerald-200 px-2 py-2 text-left">Type</th>
                <th className="border-b-2 border-emerald-200 px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-2 py-1.5 font-medium text-slate-700">Basic Salary</td>
                <td className="px-2 py-1.5 text-slate-500">Fixed</td>
                <td className="px-2 py-1.5 text-right font-medium text-slate-800">{fmtKes(payslip.basic_salary)}</td>
              </tr>
              {allowances.map((item, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-700">{item.name}</td>
                  <td className="px-2 py-1.5 text-slate-500">{item.amount_type === 'Percentage' ? `% of Basic` : 'Fixed'}</td>
                  <td className="px-2 py-1.5 text-right text-slate-800">{fmtKes(item.amount)}</td>
                </tr>
              ))}
              {allowances.length === 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-400" colSpan={3}>No allowances</td>
                </tr>
              )}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-2 py-2 text-slate-700" colSpan={2}>Gross Earnings</td>
                <td className="px-2 py-2 text-right text-slate-900">{fmtKes(payslip.gross_salary)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-2 border-l-4 border-rose-500 bg-rose-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-rose-700">
            Deductions
          </p>
          <table className="mb-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-rose-50 text-[9px] uppercase tracking-wide text-slate-500">
                <th className="border-b-2 border-rose-200 px-2 py-2 text-left">Description</th>
                <th className="border-b-2 border-rose-200 px-2 py-2 text-left">Type</th>
                <th className="border-b-2 border-rose-200 px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((item, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-700">{item.name}{item.is_taxable ? ' *' : ''}</td>
                  <td className="px-2 py-1.5 text-slate-500">{item.amount_type === 'Percentage' ? `% of Basic` : 'Fixed'}</td>
                  <td className="px-2 py-1.5 text-right text-rose-700">({fmtKes(item.amount)})</td>
                </tr>
              ))}
              {deductions.length === 0 && (
                <tr className="border-b border-slate-100">
                  <td className="px-2 py-1.5 text-slate-400" colSpan={3}>No deductions</td>
                </tr>
              )}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-2 py-2 text-slate-700" colSpan={2}>Total Deductions</td>
                <td className="px-2 py-2 text-right text-rose-700">({fmtKes(payslip.total_deductions)})</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-5 flex items-center justify-between rounded-lg border-2 border-emerald-600 bg-emerald-50 px-5 py-3">
            <p className="text-sm font-bold text-emerald-700">Net Pay ({currency})</p>
            <p className="text-xl font-bold text-slate-900">{fmtKes(payslip.net_salary)}</p>
          </div>

          {deductions.some((d) => d.is_taxable) && (
            <p className="mb-4 text-[9px] text-slate-400">* Taxable deduction</p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-10">
            <div>
              <div className="border-t border-slate-800 pt-1">
                <p className="text-[9px] text-slate-500">Prepared by</p>
                <p className="mt-4 text-[9px] text-slate-400">Signature & Date</p>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1">
                <p className="text-[9px] text-slate-500">Received by (Employee)</p>
                <p className="mt-4 text-[9px] text-slate-400">Signature & Date</p>
              </div>
            </div>
          </div>

          <p className="mt-6 border-t border-slate-200 pt-2 text-center text-[8px] text-slate-400">
            This payslip is computer-generated and valid without a signature. For queries contact HR.
            Generated by Rynaty School Management System · Rynatyspace Technologies
          </p>
        </div>
      </div>
    </div>
  )
}
