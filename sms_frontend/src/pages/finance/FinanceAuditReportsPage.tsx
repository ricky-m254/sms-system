import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiClient } from '../../api/client'

type AcademicYear = { id: number; name: string; start_date: string; end_date: string }
type Term = { id: number; name: string; academic_year_id?: number; academic_year?: number; start_date?: string; end_date?: string }

type InvoiceRow = { invoice_number: string; student_name?: string; total_amount: number; status: string; issue_date: string; due_date: string }
type PaymentRow = { receipt_number: string; student_name?: string; amount: number; payment_date: string; payment_method: string }
type ExpenseRow = { description: string; category: string; amount: number; expense_date: string; vendor?: string; approval_status: string }
type BudgetRow = { name?: string; term_name?: string; monthly_budget: number; quarterly_budget: number; annual_budget: number }
type ArrearsRow = { invoice_number: string; student_name: string; balance_due: number; overdue_days: number; due_date: string; status: string }

const REPORT_TYPES = [
  { key: 'income_statement', label: 'Income Statement (P&L)' },
  { key: 'revenue_summary', label: 'Revenue / Fees Billed' },
  { key: 'collection_report', label: 'Fee Collection Report' },
  { key: 'expense_summary', label: 'Expense Summary' },
  { key: 'budget_vs_actual', label: 'Budget vs Actual' },
  { key: 'arrears_report', label: 'Arrears / Outstanding Receivables' },
  { key: 'cash_flow', label: 'Cash Flow Summary' },
]

function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addPageHeader(doc: jsPDF, title: string, subtitle: string, pageW: number) {
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(52, 211, 153)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('RYNATY SCHOOL MANAGEMENT SYSTEM', 14, 10)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.text(title, 14, 19)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 14, 25.5)
  doc.setTextColor(30, 41, 59)
}

function addSection(doc: jsPDF, label: string, y: number, pageW: number) {
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, pageW - 28, 7, 'F')
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(label.toUpperCase(), 17, y + 5)
  return y + 11
}

export default function FinanceAuditReportsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedReports, setSelectedReports] = useState<Set<string>>(
    new Set(REPORT_TYPES.map((r) => r.key)),
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    apiClient.get<{ results?: AcademicYear[]; count?: number } | AcademicYear[]>('/academics/years/').then((r) => {
      const items = Array.isArray(r.data) ? r.data : (r.data as { results?: AcademicYear[] }).results ?? []
      setAcademicYears(items)
      if (items.length) {
        const yr = items[0]
        setSelectedYear(String(yr.id))
        setDateFrom(yr.start_date?.slice(0, 10) ?? '')
        setDateTo(yr.end_date?.slice(0, 10) ?? '')
      }
    }).catch(() => {})

    apiClient.get<{ results?: Term[] } | Term[]>('/academics/terms/').then((r) => {
      const items = Array.isArray(r.data) ? r.data : (r.data as { results?: Term[] }).results ?? []
      setTerms(items)
    }).catch(() => {})
  }, [])

  function toggleReport(key: string) {
    setSelectedReports((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function selectAll() { setSelectedReports(new Set(REPORT_TYPES.map((r) => r.key))) }
  function selectNone() { setSelectedReports(new Set()) }

  async function fetchAll() {
    const params: Record<string, string> = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (selectedYear) {
      params.academic_year = selectedYear
    }

    const [invoices, payments, expenses, budgets, arrears] = await Promise.allSettled([
      apiClient.get<{ results?: InvoiceRow[] } | InvoiceRow[]>('/finance/invoices/', { params: { ...params, page_size: 5000 } }),
      apiClient.get<{ results?: PaymentRow[] } | PaymentRow[]>('/finance/payments/', { params: { ...params, page_size: 5000 } }),
      apiClient.get<{ results?: ExpenseRow[] } | ExpenseRow[]>('/finance/expenses/', { params: { page_size: 5000, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) } }),
      apiClient.get<{ results?: BudgetRow[] } | BudgetRow[]>('/finance/budgets/', { params: { academic_year: selectedYear } }),
      apiClient.get<{ results?: ArrearsRow[] } | ArrearsRow[]>('/finance/arrears/', { params: { page_size: 5000 } }),
    ])

    function extract<T>(res: PromiseSettledResult<{ data: { results?: T[] } | T[] }>): T[] {
      if (res.status !== 'fulfilled') return []
      const d = res.value.data
      return Array.isArray(d) ? d : ((d as { results?: T[] }).results ?? [])
    }

    return {
      invoices: extract<InvoiceRow>(invoices as PromiseSettledResult<{ data: { results?: InvoiceRow[] } | InvoiceRow[] }>),
      payments: extract<PaymentRow>(payments as PromiseSettledResult<{ data: { results?: PaymentRow[] } | PaymentRow[] }>),
      expenses: extract<ExpenseRow>(expenses as PromiseSettledResult<{ data: { results?: ExpenseRow[] } | ExpenseRow[] }>),
      budgets: extract<BudgetRow>(budgets as PromiseSettledResult<{ data: { results?: BudgetRow[] } | BudgetRow[] }>),
      arrears: extract<ArrearsRow>(arrears as PromiseSettledResult<{ data: { results?: ArrearsRow[] } | ArrearsRow[] }>),
    }
  }

  async function handleGenerate() {
    if (selectedReports.size === 0) {
      setError('Select at least one report to generate.')
      return
    }
    setIsGenerating(true)
    setError(null)
    setStatusMsg('Fetching financial data…')

    try {
      const data = await fetchAll()
      setStatusMsg('Compiling PDF…')

      const yearLabel = academicYears.find((y) => String(y.id) === selectedYear)?.name ?? 'All Periods'
      const periodLabel = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : yearLabel
      const generatedAt = new Date().toLocaleString()

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()

      let isFirst = true

      function newSection(title: string) {
        if (!isFirst) doc.addPage()
        isFirst = false
        addPageHeader(doc, title, `Period: ${periodLabel}  |  Generated: ${generatedAt}`, pageW)
      }

      const totalBilled = data.invoices.reduce((s, r) => s + Number(r.total_amount || 0), 0)
      const totalCollected = data.payments.reduce((s, r) => s + Number(r.amount || 0), 0)
      const totalExpenses = data.expenses.reduce((s, r) => s + Number(r.amount || 0), 0)
      const netSurplus = totalCollected - totalExpenses
      const totalArrears = data.arrears.reduce((s, r) => s + Number(r.balance_due || 0), 0)

      if (selectedReports.has('income_statement')) {
        newSection('Income Statement (Profit & Loss)')
        let y = 35
        y = addSection(doc, 'Summary', y, pageW)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(30, 41, 59)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Item', 'Amount']],
          body: [
            ['Total Fees Billed (Revenue)', fmtMoney(totalBilled)],
            ['Total Cash Collected', fmtMoney(totalCollected)],
            ['Total Expenses', fmtMoney(totalExpenses)],
            ['Net Surplus / (Deficit)', fmtMoney(netSurplus)],
            ['Outstanding Receivables', fmtMoney(totalBilled - totalCollected)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('revenue_summary')) {
        newSection('Revenue / Fees Billed Report')
        let y = 35
        y = addSection(doc, `Total Records: ${data.invoices.length}  |  Total Billed: ${fmtMoney(totalBilled)}`, y, pageW)
        const byStatus: Record<string, number> = {}
        data.invoices.forEach((inv) => {
          byStatus[inv.status] = (byStatus[inv.status] ?? 0) + Number(inv.total_amount || 0)
        })
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Status', 'Amount']],
          body: Object.entries(byStatus).map(([s, a]) => [s, fmtMoney(a)]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
        const afterSummary = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20
        y = afterSummary + 8
        y = addSection(doc, 'Invoice Detail', y, pageW)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Invoice #', 'Student', 'Issue Date', 'Due Date', 'Amount', 'Status']],
          body: data.invoices.slice(0, 200).map((r) => [
            r.invoice_number,
            r.student_name ?? '--',
            r.issue_date?.slice(0, 10) ?? '--',
            r.due_date?.slice(0, 10) ?? '--',
            fmtMoney(Number(r.total_amount)),
            r.status,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('collection_report')) {
        newSection('Fee Collection Report')
        let y = 35
        y = addSection(doc, `Total Payments: ${data.payments.length}  |  Total Collected: ${fmtMoney(totalCollected)}`, y, pageW)
        const byMethod: Record<string, number> = {}
        data.payments.forEach((p) => {
          byMethod[p.payment_method || 'Unknown'] = (byMethod[p.payment_method || 'Unknown'] ?? 0) + Number(p.amount || 0)
        })
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Payment Method', 'Amount Collected']],
          body: Object.entries(byMethod).map(([m, a]) => [m, fmtMoney(a)]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
        const afterSummary = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20
        y = afterSummary + 8
        y = addSection(doc, 'Payment Detail', y, pageW)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Receipt #', 'Student', 'Date', 'Method', 'Amount']],
          body: data.payments.slice(0, 200).map((r) => [
            r.receipt_number,
            r.student_name ?? '--',
            r.payment_date?.slice(0, 10) ?? '--',
            r.payment_method,
            fmtMoney(Number(r.amount)),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('expense_summary')) {
        newSection('Expense Summary Report')
        let y = 35
        const byCategory: Record<string, number> = {}
        data.expenses.forEach((e) => {
          byCategory[e.category || 'Uncategorized'] = (byCategory[e.category || 'Uncategorized'] ?? 0) + Number(e.amount || 0)
        })
        y = addSection(doc, `Total Expenses: ${data.expenses.length} items  |  Total Amount: ${fmtMoney(totalExpenses)}`, y, pageW)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Category', 'Total Amount', '% of Total']],
          body: Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]) => [cat, fmtMoney(amt), totalExpenses ? `${((amt / totalExpenses) * 100).toFixed(1)}%` : '0%']),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        })
        const afterSummary = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20
        y = afterSummary + 8
        y = addSection(doc, 'Expense Detail', y, pageW)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Date', 'Description', 'Category', 'Vendor', 'Amount', 'Status']],
          body: data.expenses.slice(0, 200).map((r) => [
            r.expense_date?.slice(0, 10) ?? '--',
            r.description,
            r.category,
            r.vendor ?? '--',
            fmtMoney(Number(r.amount)),
            r.approval_status,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('budget_vs_actual')) {
        newSection('Budget vs Actual Report')
        let y = 35
        y = addSection(doc, `Budget Records: ${data.budgets.length}`, y, pageW)
        const yearTerms = terms.filter((t) => !selectedYear || Number(t.academic_year_id ?? t.academic_year) === Number(selectedYear))
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Budget Name', 'Term', 'Monthly Budget', 'Quarterly Budget', 'Annual Budget']],
          body: data.budgets.map((b) => [
            b.name ?? 'General Budget',
            b.term_name ?? yearTerms.find(() => true)?.name ?? '--',
            fmtMoney(Number(b.monthly_budget)),
            fmtMoney(Number(b.quarterly_budget)),
            fmtMoney(Number(b.annual_budget)),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        })
        const afterTable = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20
        y = afterTable + 8
        y = addSection(doc, 'Budget Summary vs Actual Spend', y, pageW)
        const totalAnnualBudget = data.budgets.reduce((s, b) => s + Number(b.annual_budget || 0), 0)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Metric', 'Amount']],
          body: [
            ['Total Annual Budget', fmtMoney(totalAnnualBudget)],
            ['Total Actual Expenses', fmtMoney(totalExpenses)],
            ['Variance (Budget - Actual)', fmtMoney(totalAnnualBudget - totalExpenses)],
            ['Utilisation', totalAnnualBudget > 0 ? `${((totalExpenses / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('arrears_report')) {
        newSection('Arrears & Outstanding Receivables Report')
        let y = 35
        y = addSection(doc, `Outstanding Invoices: ${data.arrears.length}  |  Total Arrears: ${fmtMoney(totalArrears)}`, y, pageW)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Invoice #', 'Student', 'Due Date', 'Days Overdue', 'Balance Due', 'Status']],
          body: data.arrears.slice(0, 200).map((r) => [
            r.invoice_number,
            r.student_name,
            r.due_date?.slice(0, 10) ?? '--',
            String(r.overdue_days ?? '--'),
            fmtMoney(Number(r.balance_due)),
            r.status,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('cash_flow')) {
        newSection('Cash Flow Summary')
        let y = 35
        y = addSection(doc, `Financial Year: ${yearLabel}`, y, pageW)
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Cash Flow Item', 'Amount']],
          body: [
            ['Cash Inflows — Fee Collections', fmtMoney(totalCollected)],
            ['Cash Outflows — Operational Expenses', fmtMoney(totalExpenses)],
            ['Net Cash Position', fmtMoney(totalCollected - totalExpenses)],
            ['Outstanding Receivables (not yet collected)', fmtMoney(totalBilled - totalCollected)],
            ['Total Arrears', fmtMoney(totalArrears)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.text(`Page ${i} of ${totalPages}  |  Rynaty School Management System  |  Confidential — For Audit Use Only`, 14, doc.internal.pageSize.getHeight() - 6)
        doc.text(`Generated: ${generatedAt}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' })
      }

      const filename = `AuditReport_${yearLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)

      setPreview({
        totalBilled,
        totalCollected,
        totalExpenses,
        netSurplus,
        totalArrears,
        invoiceCount: data.invoices.length,
        paymentCount: data.payments.length,
        expenseCount: data.expenses.length,
        yearLabel,
      })
      setStatusMsg(`PDF generated: ${filename}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF generation failed.'
      setError(msg)
      setStatusMsg(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const yearObj = academicYears.find((y) => String(y.id) === selectedYear)

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slateald-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Audit Reports</h1>
        <p className="mt-2 text-sm text-slate-400">
          Generate comprehensive financial reports for auditors as PDF. Select a financial year and the reports to include.
        </p>
      </header>

      <section className="col-span-12 lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
        <h2 className="text-base font-semibold">Report Settings</h2>

        <label className="block">
          <span className="text-xs text-slate-400 mb-1 block">Financial / Academic Year</span>
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value)
              const yr = academicYears.find((y) => String(y.id) === e.target.value)
              if (yr) {
                setDateFrom(yr.start_date?.slice(0, 10) ?? '')
                setDateTo(yr.end_date?.slice(0, 10) ?? '')
              }
            }}
          >
            <option value="">All Years</option>
            {academicYears.map((y) => (
              <option key={y.id} value={String(y.id)}>{y.name}</option>
            ))}
          </select>
        </label>

        {yearObj && (
          <p className="text-xs text-slate-400">
            Year period: {yearObj.start_date?.slice(0, 10)} — {yearObj.end_date?.slice(0, 10)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-400 mb-1 block">Date From</span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400 mb-1 block">Date To</span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Reports to Include</span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-emerald-400 hover:text-emerald-300">All</button>
              <span className="text-slate-600">|</span>
              <button onClick={selectNone} className="text-xs text-slate-400 hover:text-white">None</button>
            </div>
          </div>
          <div className="space-y-2">
            {REPORT_TYPES.map((r) => (
              <label key={r.key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedReports.has(r.key)}
                  onChange={() => toggleReport(r.key)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 accent-emerald-500"
                />
                <span className={`text-sm transition ${selectedReports.has(r.key) ? 'text-white' : 'text-slate-400'}`}>
                  {r.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {statusMsg && !error && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {statusMsg}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || selectedReports.size === 0}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60 transition"
        >
          {isGenerating ? 'Generating PDF…' : 'Download Audit PDF'}
        </button>
      </section>

      <section className="col-span-12 lg:col-span-8 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-base font-semibold mb-4">Report Preview</h2>

          {!preview ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center">
              <p className="text-sm text-slate-400">
                Select your settings and click <span className="text-emerald-400 font-semibold">Download Audit PDF</span> to generate the report.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                The PDF will include all selected report sections for the chosen period.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'Financial Year', value: String(preview.yearLabel) },
                { label: 'Fees Billed', value: fmtMoney(Number(preview.totalBilled)) },
                { label: 'Cash Collected', value: fmtMoney(Number(preview.totalCollected)) },
                { label: 'Total Expenses', value: fmtMoney(Number(preview.totalExpenses)) },
                { label: 'Net Surplus', value: fmtMoney(Number(preview.netSurplus)) },
                { label: 'Total Arrears', value: fmtMoney(Number(preview.totalArrears)) },
                { label: 'Invoices', value: String(preview.invoiceCount) },
                { label: 'Payments', value: String(preview.paymentCount) },
                { label: 'Expenses', value: String(preview.expenseCount) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-base font-semibold mb-3">What's Included</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {REPORT_TYPES.map((r) => (
              <div
                key={r.key}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  selectedReports.has(r.key)
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}
              >
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${selectedReports.has(r.key) ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                {r.label}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-1">Audit Notice</p>
          <p className="text-sm text-slate-300">
            All reports are generated from live financial data. PDFs are marked <span className="text-amber-300 font-medium">Confidential — For Audit Use Only</span> with generation timestamp and page numbers.
            Maximum of 200 detail rows per section are included. For larger datasets, export individual reports from the Reports tab.
          </p>
        </div>
      </section>
    </div>
  )
}
