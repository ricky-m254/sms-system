import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiClient } from '../../api/client'

type AcademicYear = { id: number; name: string; start_date: string; end_date: string }

type InvoiceRow = { invoice_number: string; student_name?: string; total_amount: number; status: string; issue_date: string; due_date: string }
type PaymentRow = { receipt_number: string; student_name?: string; amount: number; payment_date: string; payment_method: string }
type ExpenseRow = { description: string; category: string; amount: number; expense_date: string; vendor?: string; approval_status: string }
type BudgetRow = { name?: string; term_name?: string; monthly_budget: number; quarterly_budget: number; annual_budget: number }
type ArrearsRow = { invoice_number: string; student_name: string; balance_due: number; overdue_days: number; due_date: string; status: string }
type AssetRow = { name: string; category_name?: string; purchase_date: string; purchase_cost: number; current_value: number; useful_life_years?: number; depreciation_method?: string; is_active?: boolean }
type DepreciationRow = { asset_name?: string; depreciation_amount: number; accumulated_depreciation: number; period_label?: string }

const MANAGEMENT_REPORTS = [
  { key: 'income_statement', label: 'Income Statement (P&L)' },
  { key: 'revenue_summary', label: 'Revenue / Fees Billed' },
  { key: 'collection_report', label: 'Fee Collection Report' },
  { key: 'expense_summary', label: 'Expense Summary' },
  { key: 'budget_vs_actual', label: 'Budget vs Actual' },
  { key: 'arrears_report', label: 'Arrears / Outstanding Receivables' },
  { key: 'cash_flow', label: 'Cash Flow Summary' },
]

const IPSAS_REPORTS = [
  { key: 'ipsas1_financial_position', label: 'IPSAS 1 — Statement of Financial Position' },
  { key: 'ipsas2_cash_flow', label: 'IPSAS 2 — Statement of Cash Flows' },
  { key: 'ipsas17_ppe', label: 'IPSAS 17 — Property, Plant & Equipment Schedule' },
  { key: 'ipsas23_revenue', label: 'IPSAS 23 — Non-Exchange Revenue Disclosure' },
  { key: 'ipsas24_budget', label: 'IPSAS 24 — Budget vs Actual (IPSAS Format)' },
  { key: 'notes', label: 'Notes to Financial Statements' },
]

const ALL_REPORTS = [...MANAGEMENT_REPORTS, ...IPSAS_REPORTS]

function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pdfHeader(doc: jsPDF, title: string, subtitle: string, pageW: number) {
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(52, 211, 153)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('RYNATY SCHOOL MANAGEMENT SYSTEM', 14, 10)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.text(title, 14, 20)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 14, 27)
  doc.setTextColor(30, 41, 59)
}

function sectionBar(doc: jsPDF, label: string, y: number, pageW: number) {
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, pageW - 28, 7, 'F')
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(label.toUpperCase(), 17, y + 5)
  return y + 10
}

function lastY(doc: jsPDF, fallback: number): number {
  return (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? fallback
}

export default function FinanceAuditReportsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedReports, setSelectedReports] = useState<Set<string>>(
    new Set(ALL_REPORTS.map((r) => r.key))
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    apiClient.get<{ results?: AcademicYear[] } | AcademicYear[]>('/academics/years/').then((r) => {
      const items = Array.isArray(r.data) ? r.data : (r.data as { results?: AcademicYear[] }).results ?? []
      setAcademicYears(items)
      if (items.length) {
        const yr = items[0]
        setSelectedYear(String(yr.id))
        setDateFrom(yr.start_date?.slice(0, 10) ?? '')
        setDateTo(yr.end_date?.slice(0, 10) ?? '')
      }
    }).catch(() => {})
  }, [])

  function toggle(key: string) {
    setSelectedReports((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleGroup(keys: string[]) {
    const allOn = keys.every((k) => selectedReports.has(k))
    setSelectedReports((prev) => { const n = new Set(prev); keys.forEach((k) => allOn ? n.delete(k) : n.add(k)); return n })
  }

  function extract<T>(res: PromiseSettledResult<{ data: { results?: T[] } | T[] }>): T[] {
    if (res.status !== 'fulfilled') return []
    const d = res.value.data
    return Array.isArray(d) ? d : ((d as { results?: T[] }).results ?? [])
  }

  async function fetchData() {
    const p: Record<string, string> = {}
    if (selectedYear) p.academic_year = selectedYear
    if (dateFrom) p.date_from = dateFrom
    if (dateTo) p.date_to = dateTo

    const [invoices, payments, expenses, budgets, arrears, assets, depreciations] = await Promise.allSettled([
      apiClient.get<{ results?: InvoiceRow[] } | InvoiceRow[]>('/finance/invoices/', { params: { ...p, page_size: 5000 } }),
      apiClient.get<{ results?: PaymentRow[] } | PaymentRow[]>('/finance/payments/', { params: { ...p, page_size: 5000 } }),
      apiClient.get<{ results?: ExpenseRow[] } | ExpenseRow[]>('/finance/expenses/', { params: { page_size: 5000, ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) } }),
      apiClient.get<{ results?: BudgetRow[] } | BudgetRow[]>('/finance/budgets/', { params: { academic_year: selectedYear } }),
      apiClient.get<{ results?: ArrearsRow[] } | ArrearsRow[]>('/finance/arrears/', { params: { page_size: 5000 } }),
      apiClient.get<{ results?: AssetRow[] } | AssetRow[]>('/assets/', { params: { page_size: 5000 } }),
      apiClient.get<{ results?: DepreciationRow[] } | DepreciationRow[]>('/assets/depreciation/', { params: { page_size: 5000 } }),
    ])

    return {
      invoices: extract<InvoiceRow>(invoices as PromiseSettledResult<{ data: { results?: InvoiceRow[] } | InvoiceRow[] }>),
      payments: extract<PaymentRow>(payments as PromiseSettledResult<{ data: { results?: PaymentRow[] } | PaymentRow[] }>),
      expenses: extract<ExpenseRow>(expenses as PromiseSettledResult<{ data: { results?: ExpenseRow[] } | ExpenseRow[] }>),
      budgets: extract<BudgetRow>(budgets as PromiseSettledResult<{ data: { results?: BudgetRow[] } | BudgetRow[] }>),
      arrears: extract<ArrearsRow>(arrears as PromiseSettledResult<{ data: { results?: ArrearsRow[] } | ArrearsRow[] }>),
      assets: extract<AssetRow>(assets as PromiseSettledResult<{ data: { results?: AssetRow[] } | AssetRow[] }>),
      depreciations: extract<DepreciationRow>(depreciations as PromiseSettledResult<{ data: { results?: DepreciationRow[] } | DepreciationRow[] }>),
    }
  }

  async function handleGenerate() {
    if (selectedReports.size === 0) { setError('Select at least one report.'); return }
    setIsGenerating(true); setError(null); setStatusMsg('Fetching data…')
    try {
      const data = await fetchData()
      setStatusMsg('Compiling IPSAS-aligned PDF…')

      const yearObj = academicYears.find((y) => String(y.id) === selectedYear)
      const yearLabel = yearObj?.name ?? 'All Periods'
      const periodLabel = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : yearLabel
      const generatedAt = new Date().toLocaleString()

      const totalBilled = data.invoices.reduce((s, r) => s + Number(r.total_amount || 0), 0)
      const totalCollected = data.payments.reduce((s, r) => s + Number(r.amount || 0), 0)
      const totalExpenses = data.expenses.reduce((s, r) => s + Number(r.amount || 0), 0)
      const totalArrears = data.arrears.reduce((s, r) => s + Number(r.balance_due || 0), 0)
      const totalPPECost = data.assets.reduce((s, a) => s + Number(a.purchase_cost || 0), 0)
      const totalPPECarrying = data.assets.reduce((s, a) => s + Number(a.current_value || 0), 0)
      const totalAccumDep = data.depreciations.reduce((s, d) => s + Number(d.accumulated_depreciation || 0), 0)
      const totalAnnualBudget = data.budgets.reduce((s, b) => s + Number(b.annual_budget || 0), 0)
      const netSurplus = totalCollected - totalExpenses
      const receivables = totalBilled - totalCollected

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      let isFirst = true

      function newPage(title: string) {
        if (!isFirst) doc.addPage()
        isFirst = false
        pdfHeader(doc, title, `Period: ${periodLabel}  |  Generated: ${generatedAt}`, pageW)
      }

      // ─── COVER PAGE ─────────────────────────────────────────────────────────
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F')
      doc.setFillColor(52, 211, 153)
      doc.rect(0, 0, pageW, 4, 'F')
      doc.setTextColor(52, 211, 153)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('RYNATY SCHOOL MANAGEMENT SYSTEM', 14, 50)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22); doc.setFont('helvetica', 'bold')
      doc.text('ANNUAL FINANCIAL REPORT', 14, 65)
      doc.setFontSize(14)
      doc.text('IPSAS-Compliant Auditor Package', 14, 76)
      doc.setFillColor(52, 211, 153)
      doc.rect(14, 82, 60, 0.5, 'F')
      doc.setTextColor(148, 163, 184); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text(`Financial Year: ${yearLabel}`, 14, 94)
      doc.text(`Period: ${periodLabel}`, 14, 102)
      doc.text(`Prepared: ${generatedAt}`, 14, 110)
      doc.text(`Reports Included: ${selectedReports.size} of ${ALL_REPORTS.length}`, 14, 118)
      doc.setTextColor(52, 211, 153); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
      doc.text('IPSAS Standards Applied:', 14, 135)
      doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      const ipsasApplied = [
        'IPSAS 1 — Presentation of Financial Statements',
        'IPSAS 2 — Cash Flow Statements',
        'IPSAS 17 — Property, Plant and Equipment',
        'IPSAS 23 — Revenue from Non-Exchange Transactions',
        'IPSAS 24 — Presentation of Budget Information',
      ]
      ipsasApplied.forEach((line, i) => doc.text(`• ${line}`, 16, 143 + i * 7))
      doc.setTextColor(100, 116, 139); doc.setFontSize(7)
      doc.text('CONFIDENTIAL — FOR AUDIT USE ONLY', 14, doc.internal.pageSize.getHeight() - 12)
      doc.text('This report is prepared on an accrual basis in accordance with applicable IPSAS standards.', 14, doc.internal.pageSize.getHeight() - 7)
      isFirst = false

      // ─── MANAGEMENT REPORTS ─────────────────────────────────────────────────
      if (selectedReports.has('income_statement')) {
        newPage('Income Statement (Statement of Financial Performance)')
        let y = 36
        y = sectionBar(doc, 'IPSAS 1 — Statement of Financial Performance', y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Item', 'Amount']],
          body: [
            ['REVENUE', ''],
            ['Fee Income (Non-Exchange Revenue — IPSAS 23)', fmtMoney(totalBilled)],
            ['Cash Collected', fmtMoney(totalCollected)],
            ['', ''],
            ['EXPENDITURE', ''],
            ['Total Operating Expenses', fmtMoney(totalExpenses)],
            ['', ''],
            ['SURPLUS / (DEFICIT) FOR THE PERIOD', fmtMoney(netSurplus)],
            ['Outstanding Receivables', fmtMoney(receivables)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('revenue_summary')) {
        newPage('Revenue / Fees Billed Report')
        let y = 36
        const byStatus: Record<string, number> = {}
        data.invoices.forEach((r) => { byStatus[r.status] = (byStatus[r.status] ?? 0) + Number(r.total_amount || 0) })
        y = sectionBar(doc, `Total Records: ${data.invoices.length}  |  Total Billed: ${fmtMoney(totalBilled)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Status', 'Amount']], body: Object.entries(byStatus).map(([s, a]) => [s, fmtMoney(a)]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
        let y2 = lastY(doc, y + 30) + 8
        y2 = sectionBar(doc, 'Invoice Detail (max 200 rows)', y2, pageW)
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Invoice #', 'Student', 'Issue Date', 'Due Date', 'Amount', 'Status']],
          body: data.invoices.slice(0, 200).map((r) => [r.invoice_number, r.student_name ?? '--', r.issue_date?.slice(0, 10) ?? '--', r.due_date?.slice(0, 10) ?? '--', fmtMoney(Number(r.total_amount)), r.status]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 }, columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('collection_report')) {
        newPage('Fee Collection Report')
        let y = 36
        const byMethod: Record<string, number> = {}
        data.payments.forEach((p) => { byMethod[p.payment_method || 'Unknown'] = (byMethod[p.payment_method || 'Unknown'] ?? 0) + Number(p.amount || 0) })
        y = sectionBar(doc, `Total Payments: ${data.payments.length}  |  Total Collected: ${fmtMoney(totalCollected)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Payment Method', 'Amount Collected']], body: Object.entries(byMethod).map(([m, a]) => [m, fmtMoney(a)]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
        let y2 = lastY(doc, y + 30) + 8
        y2 = sectionBar(doc, 'Payment Detail', y2, pageW)
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Receipt #', 'Student', 'Date', 'Method', 'Amount']],
          body: data.payments.slice(0, 200).map((r) => [r.receipt_number, r.student_name ?? '--', r.payment_date?.slice(0, 10) ?? '--', r.payment_method, fmtMoney(Number(r.amount))]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 }, columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('expense_summary')) {
        newPage('Expense Summary Report')
        let y = 36
        const byCategory: Record<string, number> = {}
        data.expenses.forEach((e) => { byCategory[e.category || 'Uncategorized'] = (byCategory[e.category || 'Uncategorized'] ?? 0) + Number(e.amount || 0) })
        y = sectionBar(doc, `Items: ${data.expenses.length}  |  Total: ${fmtMoney(totalExpenses)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Category', 'Total Amount', '% of Total']],
          body: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => [cat, fmtMoney(amt), totalExpenses ? `${((amt / totalExpenses) * 100).toFixed(1)}%` : '0%']),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        })
        let y2 = lastY(doc, y + 30) + 8
        y2 = sectionBar(doc, 'Expense Detail', y2, pageW)
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Date', 'Description', 'Category', 'Vendor', 'Amount', 'Status']],
          body: data.expenses.slice(0, 200).map((r) => [r.expense_date?.slice(0, 10) ?? '--', r.description, r.category, r.vendor ?? '--', fmtMoney(Number(r.amount)), r.approval_status]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 }, columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('budget_vs_actual')) {
        newPage('Budget vs Actual Report')
        let y = 36
        y = sectionBar(doc, `Budget Records: ${data.budgets.length}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Budget Name', 'Term', 'Monthly', 'Quarterly', 'Annual']],
          body: data.budgets.map((b) => [b.name ?? 'General Budget', b.term_name ?? '--', fmtMoney(Number(b.monthly_budget)), fmtMoney(Number(b.quarterly_budget)), fmtMoney(Number(b.annual_budget))]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        })
        let y2 = lastY(doc, y + 30) + 8
        y2 = sectionBar(doc, 'Budget Summary vs Actual', y2, pageW)
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Metric', 'Amount']],
          body: [
            ['Total Annual Budget', fmtMoney(totalAnnualBudget)],
            ['Total Actual Expenses', fmtMoney(totalExpenses)],
            ['Variance (Budget − Actual)', fmtMoney(totalAnnualBudget - totalExpenses)],
            ['Utilisation', totalAnnualBudget > 0 ? `${((totalExpenses / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('arrears_report')) {
        newPage('Arrears & Outstanding Receivables')
        let y = 36
        y = sectionBar(doc, `Outstanding: ${data.arrears.length}  |  Total Arrears: ${fmtMoney(totalArrears)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Invoice #', 'Student', 'Due Date', 'Days Overdue', 'Balance Due', 'Status']],
          body: data.arrears.slice(0, 200).map((r) => [r.invoice_number, r.student_name, r.due_date?.slice(0, 10) ?? '--', String(r.overdue_days ?? '--'), fmtMoney(Number(r.balance_due)), r.status]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 }, columnStyles: { 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('cash_flow')) {
        newPage('Cash Flow Summary')
        let y = 36
        y = sectionBar(doc, `Financial Year: ${yearLabel}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Cash Flow Item', 'Amount']],
          body: [
            ['Cash Inflows — Fee Collections', fmtMoney(totalCollected)],
            ['Cash Outflows — Operational Expenses', fmtMoney(totalExpenses)],
            ['Net Cash Position', fmtMoney(totalCollected - totalExpenses)],
            ['Outstanding Receivables (not yet collected)', fmtMoney(receivables)],
            ['Total Arrears', fmtMoney(totalArrears)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      // ─── IPSAS STATEMENTS ───────────────────────────────────────────────────

      if (selectedReports.has('ipsas1_financial_position')) {
        newPage('IPSAS 1 — Statement of Financial Position')
        let y = 36
        y = sectionBar(doc, `As at: ${dateTo || new Date().toISOString().slice(0, 10)}  (Balance Sheet)`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Item', 'Amount']],
          body: [
            ['ASSETS', ''],
            ['CURRENT ASSETS', ''],
            ['Fee Receivables (Arrears)', fmtMoney(totalArrears)],
            ['Cash Collected (Receipted)', fmtMoney(totalCollected)],
            ['Total Current Assets', fmtMoney(totalArrears + totalCollected)],
            ['', ''],
            ['NON-CURRENT ASSETS', ''],
            ['Property, Plant & Equipment — Cost (IPSAS 17)', fmtMoney(totalPPECost)],
            ['Less: Accumulated Depreciation', `(${fmtMoney(totalAccumDep)})`],
            ['Property, Plant & Equipment — Carrying Value', fmtMoney(totalPPECarrying)],
            ['Total Non-Current Assets', fmtMoney(totalPPECarrying)],
            ['', ''],
            ['TOTAL ASSETS', fmtMoney(totalArrears + totalCollected + totalPPECarrying)],
            ['', ''],
            ['NET ASSETS', ''],
            ['Accumulated Surplus / (Deficit)', fmtMoney(netSurplus)],
            ['Surplus for the Period', fmtMoney(netSurplus)],
            ['', ''],
            ['Note: Liabilities data requires manual input from treasury/payroll systems.', ''],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('ipsas2_cash_flow')) {
        newPage('IPSAS 2 — Statement of Cash Flows')
        let y = 36
        y = sectionBar(doc, `For the period ended: ${dateTo || 'Current Date'}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Activity / Item', 'Amount']],
          body: [
            ['OPERATING ACTIVITIES', ''],
            ['Cash received from fee payers (students/guardians)', fmtMoney(totalCollected)],
            ['Cash paid to suppliers and employees (expenses)', `(${fmtMoney(totalExpenses)})`],
            ['Net Cash from Operating Activities', fmtMoney(totalCollected - totalExpenses)],
            ['', ''],
            ['INVESTING ACTIVITIES', ''],
            ['Acquisition of Property, Plant & Equipment', `(${fmtMoney(totalPPECost)})`],
            ['Net Cash used in Investing Activities', `(${fmtMoney(totalPPECost)})`],
            ['', ''],
            ['FINANCING ACTIVITIES', ''],
            ['Government Grants / Subsidies (enter manually)', '0.00'],
            ['Net Cash from Financing Activities', '0.00'],
            ['', ''],
            ['NET INCREASE / (DECREASE) IN CASH', fmtMoney(totalCollected - totalExpenses - totalPPECost)],
            ['', ''],
            ['Note: Opening cash balance requires input from the previous period close.', ''],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('ipsas17_ppe')) {
        newPage('IPSAS 17 — Property, Plant & Equipment Register')
        let y = 36
        y = sectionBar(doc, `Assets Registered: ${data.assets.length}  |  Cost: ${fmtMoney(totalPPECost)}  |  Net Book Value: ${fmtMoney(totalPPECarrying)}`, y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Asset', 'Category', 'Purchase Date', 'Cost', 'Carrying Value', 'Method', 'Life (Yrs)']],
          body: data.assets.slice(0, 200).map((a) => [
            a.name,
            a.category_name ?? '--',
            a.purchase_date?.slice(0, 10) ?? '--',
            fmtMoney(Number(a.purchase_cost)),
            fmtMoney(Number(a.current_value)),
            a.depreciation_method ?? 'None',
            String(a.useful_life_years ?? '--'),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
        })
        let y2 = lastY(doc, y + 60) + 8
        y2 = sectionBar(doc, 'IPSAS 17 — Summary (Cost Model)', y2, pageW)
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Description', 'Amount']],
          body: [
            ['Gross Cost (Historical Cost)', fmtMoney(totalPPECost)],
            ['Accumulated Depreciation', fmtMoney(totalAccumDep)],
            ['Net Book Value (Carrying Amount)', fmtMoney(totalPPECarrying)],
            ['Impairment Loss (enter manually if applicable)', '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, columnStyles: { 1: { halign: 'right' } },
        })
      }

      if (selectedReports.has('ipsas23_revenue')) {
        newPage('IPSAS 23 — Non-Exchange Revenue Disclosure')
        let y = 36
        y = sectionBar(doc, 'Revenue from Non-Exchange Transactions (School Fees)', y, pageW)
        const byStatus2: Record<string, { count: number; amount: number }> = {}
        data.invoices.forEach((r) => {
          if (!byStatus2[r.status]) byStatus2[r.status] = { count: 0, amount: 0 }
          byStatus2[r.status].count += 1
          byStatus2[r.status].amount += Number(r.total_amount || 0)
        })
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Revenue Type', 'Transaction Count', 'Total Amount', 'Nature']],
          body: [
            ['School Fee Income (Billed)', String(data.invoices.length), fmtMoney(totalBilled), 'Non-Exchange (Compulsory)'],
            ['Cash Collected', String(data.payments.length), fmtMoney(totalCollected), 'Non-Exchange Receipt'],
            ['Outstanding Receivables', String(data.arrears.length), fmtMoney(totalArrears), 'Non-Exchange Receivable'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 2: { halign: 'right' } },
        })
        let y2 = lastY(doc, y + 40) + 8
        y2 = sectionBar(doc, 'Revenue by Invoice Status', y2, pageW)
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Status', 'Count', 'Amount', '% of Total']],
          body: Object.entries(byStatus2).map(([s, d]) => [s, String(d.count), fmtMoney(d.amount), totalBilled ? `${((d.amount / totalBilled) * 100).toFixed(1)}%` : '0%']),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 }, columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
        })
        let y3 = lastY(doc, y2 + 40) + 8
        y3 = sectionBar(doc, 'IPSAS 23 Disclosure Note', y3, pageW)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 41, 59)
        const note = 'School fees are recognised as revenue in accordance with IPSAS 23 — Revenue from Non-Exchange Transactions. Fees are levied under statutory authority and are recognised when the receivable meets the definition of an asset and can be measured reliably. Conditions or restrictions on fee revenue are disclosed where applicable. Uncollected fees are recognised as receivables at nominal value, less any impairment.'
        doc.text(doc.splitTextToSize(note, pageW - 28), 14, y3)
      }

      if (selectedReports.has('ipsas24_budget')) {
        newPage('IPSAS 24 — Budget Information Comparison')
        let y = 36
        y = sectionBar(doc, 'IPSAS 24 — Comparison of Budget and Actual Amounts', y, pageW)
        autoTable(doc, {
          startY: y, margin: { left: 14, right: 14 },
          head: [['Line Item', 'Original Budget', 'Final Budget', 'Actual Amount', 'Variance', 'Var %']],
          body: [
            ['REVENUE', '', '', '', '', ''],
            ['Fee Income', fmtMoney(totalAnnualBudget), fmtMoney(totalAnnualBudget), fmtMoney(totalBilled), fmtMoney(totalBilled - totalAnnualBudget), totalAnnualBudget > 0 ? `${(((totalBilled - totalAnnualBudget) / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
            ['EXPENDITURE', '', '', '', '', ''],
            ['Operating Expenses', fmtMoney(totalAnnualBudget), fmtMoney(totalAnnualBudget), fmtMoney(totalExpenses), fmtMoney(totalAnnualBudget - totalExpenses), totalAnnualBudget > 0 ? `${(((totalAnnualBudget - totalExpenses) / totalAnnualBudget) * 100).toFixed(1)}%` : 'N/A'],
            ['NET SURPLUS / (DEFICIT)', '', '', fmtMoney(netSurplus), '', ''],
          ],
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        })
        let y2 = lastY(doc, y + 50) + 8
        y2 = sectionBar(doc, 'Budget by Record', y2, pageW)
        autoTable(doc, {
          startY: y2, margin: { left: 14, right: 14 },
          head: [['Budget Name', 'Term', 'Monthly Budget', 'Quarterly Budget', 'Annual Budget']],
          body: data.budgets.length ? data.budgets.map((b) => [b.name ?? 'General Budget', b.term_name ?? '--', fmtMoney(Number(b.monthly_budget)), fmtMoney(Number(b.quarterly_budget)), fmtMoney(Number(b.annual_budget))]) : [['No budget records found.', '', '', '', '']],
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        })
      }

      if (selectedReports.has('notes')) {
        newPage('Notes to the Financial Statements')
        let y = 36
        const notes = [
          {
            heading: 'Note 1 — Basis of Preparation',
            body: 'These financial statements have been prepared in accordance with the International Public Sector Accounting Standards (IPSAS) on an accrual basis of accounting. The financial statements are presented in the local currency. All amounts are rounded to two decimal places.',
          },
          {
            heading: 'Note 2 — Significant Accounting Policies',
            body: 'Revenue: School fees are recognised as non-exchange revenue in accordance with IPSAS 23 when the related receivable meets the definition of an asset and can be measured reliably. | Expenses: Expenses are recognised on an accrual basis when the economic benefit or service potential is consumed. | PPE: Property, Plant and Equipment is carried at cost less accumulated depreciation and impairment losses in accordance with IPSAS 17.',
          },
          {
            heading: 'Note 3 — Revenue from Non-Exchange Transactions (IPSAS 23)',
            body: `Total school fee revenue billed during the period: ${fmtMoney(totalBilled)}. Cash collected: ${fmtMoney(totalCollected)}. Outstanding receivables (arrears) at period end: ${fmtMoney(totalArrears)}. All fees are compulsory levies assessed per enrolled student.`,
          },
          {
            heading: 'Note 4 — Property, Plant and Equipment (IPSAS 17)',
            body: `Total assets registered: ${data.assets.length}. Gross cost: ${fmtMoney(totalPPECost)}. Accumulated depreciation: ${fmtMoney(totalAccumDep)}. Net carrying value: ${fmtMoney(totalPPECarrying)}. Depreciation methods applied include straight-line and declining balance where specified per asset class.`,
          },
          {
            heading: 'Note 5 — Budget Information (IPSAS 24)',
            body: `The approved annual budget for the period is ${fmtMoney(totalAnnualBudget)}. Actual expenditure was ${fmtMoney(totalExpenses)}. The variance of ${fmtMoney(totalAnnualBudget - totalExpenses)} represents underspend. The budget was prepared on the same accounting basis as these financial statements.`,
          },
          {
            heading: 'Note 6 — Comparative Figures',
            body: 'Prior-period comparative figures are not included in this automated report. Management should obtain and include comparative figures from the previous financial year financial statements to comply with IPSAS 1 paragraph 38.',
          },
          {
            heading: 'Note 7 — Contingencies and Commitments',
            body: 'No contingent liabilities or material capital commitments are recorded in the system. Management should disclose any known contingencies, legal proceedings or commitments not captured in this report.',
          },
          {
            heading: 'Note 8 — Going Concern',
            body: 'The school has been assessed as a going concern. Management is not aware of any material uncertainties that may cast significant doubt on the ability to continue as a going concern.',
          },
        ]

        for (const note of notes) {
          y = sectionBar(doc, note.heading, y, pageW)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(30, 41, 59)
          const lines = doc.splitTextToSize(note.body.replace(/\|/g, '\n'), pageW - 28)
          const lineH = 4.5
          if (y + lines.length * lineH > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage()
            pdfHeader(doc, 'Notes to the Financial Statements (continued)', `Period: ${periodLabel}`, pageW)
            y = 36
          }
          doc.text(lines, 14, y)
          y += lines.length * lineH + 7
        }
      }

      // Page numbers
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7); doc.setTextColor(148, 163, 184)
        doc.text(`Page ${i} of ${totalPages}  |  Rynaty School Management System  |  IPSAS-Compliant Audit Package  |  Confidential`, 14, doc.internal.pageSize.getHeight() - 6)
        doc.text(`Generated: ${generatedAt}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' })
      }

      const filename = `IPSAS_AuditReport_${yearLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)

      setPreview({ totalBilled, totalCollected, totalExpenses, netSurplus, totalArrears, totalPPECost, totalPPECarrying, totalAccumDep, totalAnnualBudget, invoiceCount: data.invoices.length, paymentCount: data.payments.length, expenseCount: data.expenses.length, assetCount: data.assets.length, yearLabel })
      setStatusMsg(`Downloaded: ${filename}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed.')
      setStatusMsg(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const yearObj = academicYears.find((y) => String(y.id) === selectedYear)
  const mgmtKeys = MANAGEMENT_REPORTS.map((r) => r.key)
  const ipsasKeys = IPSAS_REPORTS.map((r) => r.key)

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Audit Reports</h1>
        <p className="mt-2 text-sm text-slate-400">
          IPSAS-aligned financial report package for auditors. Includes management reports plus all required IPSAS statements.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['IPSAS 1', 'IPSAS 2', 'IPSAS 17', 'IPSAS 23', 'IPSAS 24'].map((s) => (
            <span key={s} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-300">{s}</span>
          ))}
        </div>
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
              if (yr) { setDateFrom(yr.start_date?.slice(0, 10) ?? ''); setDateTo(yr.end_date?.slice(0, 10) ?? '') }
            }}
          >
            <option value="">All Years</option>
            {academicYears.map((y) => <option key={y.id} value={String(y.id)}>{y.name}</option>)}
          </select>
        </label>

        {yearObj && <p className="text-xs text-slate-400">Year: {yearObj.start_date?.slice(0, 10)} — {yearObj.end_date?.slice(0, 10)}</p>}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-400 mb-1 block">Date From</span>
            <input type="date" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400 mb-1 block">Date To</span>
            <input type="date" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Management Reports</span>
            <button onClick={() => toggleGroup(mgmtKeys)} className="text-xs text-emerald-400 hover:text-emerald-300">
              {mgmtKeys.every((k) => selectedReports.has(k)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="space-y-2 mb-4">
            {MANAGEMENT_REPORTS.map((r) => (
              <label key={r.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={selectedReports.has(r.key)} onChange={() => toggle(r.key)} className="h-4 w-4 accent-emerald-500" />
                <span className={`text-sm ${selectedReports.has(r.key) ? 'text-white' : 'text-slate-400'}`}>{r.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">IPSAS Statements</span>
            <button onClick={() => toggleGroup(ipsasKeys)} className="text-xs text-emerald-400 hover:text-emerald-300">
              {ipsasKeys.every((k) => selectedReports.has(k)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="space-y-2">
            {IPSAS_REPORTS.map((r) => (
              <label key={r.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={selectedReports.has(r.key)} onChange={() => toggle(r.key)} className="h-4 w-4 accent-emerald-500" />
                <span className={`text-sm ${selectedReports.has(r.key) ? 'text-emerald-200' : 'text-slate-400'}`}>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
        {statusMsg && !error && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{statusMsg}</div>}

        <button onClick={handleGenerate} disabled={isGenerating || selectedReports.size === 0} className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60 transition">
          {isGenerating ? 'Generating IPSAS PDF…' : 'Download IPSAS Audit PDF'}
        </button>
      </section>

      <section className="col-span-12 lg:col-span-8 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-base font-semibold mb-4">Report Preview</h2>
          {!preview ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center">
              <p className="text-sm text-slate-400">Select settings and click <span className="text-emerald-400 font-semibold">Download IPSAS Audit PDF</span> to generate.</p>
              <p className="mt-2 text-xs text-slate-500">Includes a cover page + all selected IPSAS-compliant financial statements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'Financial Year', value: String(preview.yearLabel) },
                { label: 'Fees Billed', value: fmtMoney(Number(preview.totalBilled)) },
                { label: 'Cash Collected', value: fmtMoney(Number(preview.totalCollected)) },
                { label: 'Total Expenses', value: fmtMoney(Number(preview.totalExpenses)) },
                { label: 'Net Surplus', value: fmtMoney(Number(preview.netSurplus)) },
                { label: 'PPE Cost (IPSAS 17)', value: fmtMoney(Number(preview.totalPPECost)) },
                { label: 'PPE Carrying Value', value: fmtMoney(Number(preview.totalPPECarrying)) },
                { label: 'Total Arrears', value: fmtMoney(Number(preview.totalArrears)) },
                { label: 'Budget (Annual)', value: fmtMoney(Number(preview.totalAnnualBudget)) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-1 text-base font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-base font-semibold mb-1">IPSAS Compliance Coverage</h2>
          <p className="text-xs text-slate-400 mb-4">Standards addressed in this report package</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { std: 'IPSAS 1', name: 'Presentation of Financial Statements', key: 'ipsas1_financial_position', note: 'Statement of Financial Position' },
              { std: 'IPSAS 2', name: 'Cash Flow Statements', key: 'ipsas2_cash_flow', note: 'Operating / Investing / Financing' },
              { std: 'IPSAS 17', name: 'Property, Plant & Equipment', key: 'ipsas17_ppe', note: 'Asset Register + Depreciation' },
              { std: 'IPSAS 23', name: 'Non-Exchange Revenue', key: 'ipsas23_revenue', note: 'School Fees Disclosure' },
              { std: 'IPSAS 24', name: 'Budget Information', key: 'ipsas24_budget', note: 'Budget vs Actual Comparison' },
              { std: 'General', name: 'Notes to Financial Statements', key: 'notes', note: 'Accounting Policies + Disclosures' },
            ].map((item) => (
              <div key={item.key} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${selectedReports.has(item.key) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/40 opacity-50'}`}>
                <span className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${selectedReports.has(item.key) ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                <div>
                  <p className={`font-semibold text-xs ${selectedReports.has(item.key) ? 'text-emerald-300' : 'text-slate-400'}`}>{item.std} — {item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-2">Auditor Notes</p>
          <ul className="text-sm text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Prepared on <strong>accrual basis</strong> per IPSAS requirements.</li>
            <li>The <strong>Statement of Financial Position</strong> approximates liabilities — auditors should supplement with payroll accruals, creditors and government grant balances.</li>
            <li>The <strong>Cash Flow Statement</strong> uses a direct method; opening cash balance must be inserted manually.</li>
            <li><strong>Comparative figures</strong> (prior year) are not included — IPSAS 1 §38 requires them.</li>
            <li><strong>IPSAS 17</strong> impairment review and revaluation (if using revaluation model) must be performed separately.</li>
            <li>Maximum 200 detail rows per section — full data available via CSV export from Reports tab.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
