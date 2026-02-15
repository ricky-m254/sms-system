import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type FinanceSummary = {
  revenue_billed: number
  cash_collected: number
  total_expenses: number
  net_profit: number
  outstanding_receivables: number
  active_students_count?: number
}

type Invoice = {
  id: number
  total_amount: number
  due_date: string
  created_at?: string
  balance_due?: number
}

type Payment = {
  id: number
  amount: number
  payment_date: string
  payment_method?: string
}

type Expense = {
  id: number
  amount: number
  expense_date: string
}

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
    const first = Object.values(data as Record<string, unknown>).find((value) =>
      Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0,
    )
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

const safeMonthKey = (value?: string) => {
  if (!value) return null
  try {
    const date = parseISO(value)
    if (Number.isNaN(date.getTime())) return null
    return format(date, 'MMM yyyy')
  } catch {
    return null
  }
}

const safeDate = (value?: string) => {
  if (!value) return null
  try {
    const parsed = parseISO(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

export default function FinanceSummaryPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true)
    else setIsRefreshing(true)
    setError(null)
    try {
      const [summaryRes, invoicesRes, paymentsRes, expensesRes] = await Promise.all([
        apiClient.get<FinanceSummary>('/finance/summary/'),
        apiClient.get<Invoice[] | { results: Invoice[]; count: number }>('/finance/invoices/'),
        apiClient.get<Payment[] | { results: Payment[]; count: number }>('/finance/payments/'),
        apiClient.get<Expense[] | { results: Expense[]; count: number }>('/finance/expenses/'),
      ])
      setSummary(summaryRes.data)
      setInvoices(normalizePaginatedResponse(invoicesRes.data).items)
      setPayments(normalizePaginatedResponse(paymentsRes.data).items)
      setExpenses(normalizePaginatedResponse(expensesRes.data).items)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setError('Session expired. Please log in again.')
      } else if (status === 403) {
        setError('Access denied. Ensure this user has the FINANCE module and proper role.')
      } else if (status === 404) {
        setError('Finance endpoints not found (404). Verify tenant routing.')
      } else {
        setError(extractApiError(err, 'Unable to load finance data. Please try again.'))
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData(true)
  }, [])

  const paymentsByMonth = useMemo(() => {
    const bucket = new Map<string, number>()
    for (const payment of payments) {
      const key = safeMonthKey(payment.payment_date)
      if (!key) continue
      bucket.set(key, (bucket.get(key) ?? 0) + Number(payment.amount))
    }
    return Array.from(bucket.entries()).map(([month, total]) => ({
      month,
      payments: total,
    }))
  }, [payments])

  const operatingCashflow = useMemo(() => {
    const bucket = new Map<string, { inflow: number; outflow: number }>()
    for (const payment of payments) {
      const key = safeMonthKey(payment.payment_date)
      if (!key) continue
      const current = bucket.get(key) ?? { inflow: 0, outflow: 0 }
      current.inflow += Number(payment.amount)
      bucket.set(key, current)
    }
    for (const expense of expenses) {
      const key = safeMonthKey(expense.expense_date)
      if (!key) continue
      const current = bucket.get(key) ?? { inflow: 0, outflow: 0 }
      current.outflow += Number(expense.amount)
      bucket.set(key, current)
    }
    return Array.from(bucket.entries()).map(([month, values]) => ({
      month,
      inflow: values.inflow,
      outflow: values.outflow,
      net: values.inflow - values.outflow,
    }))
  }, [expenses, payments])

  const debtorsAging = useMemo(() => {
    const buckets = [
      { label: '0-30', value: 0 },
      { label: '31-60', value: 0 },
      { label: '61-90', value: 0 },
      { label: '90+', value: 0 },
    ]
    const today = new Date()
    invoices.forEach((invoice) => {
      const due = safeDate(invoice.due_date)
      if (!due) return
      const balance = Number(
        invoice.balance_due ?? invoice.total_amount ?? 0,
      )
      if (balance <= 0) return
      const daysPastDue = differenceInCalendarDays(today, due)
      if (daysPastDue <= 30) buckets[0].value += balance
      else if (daysPastDue <= 60) buckets[1].value += balance
      else if (daysPastDue <= 90) buckets[2].value += balance
      else buckets[3].value += balance
    })
    return buckets
  }, [invoices])

  const paymentsByMethod = useMemo(() => {
    const bucket = new Map<string, number>()
    payments.forEach((payment) => {
      const method = payment.payment_method?.trim() || 'Unknown'
      bucket.set(method, (bucket.get(method) ?? 0) + Number(payment.amount))
    })
    return Array.from(bucket.entries()).map(([method, total]) => ({
      method,
      total,
    }))
  }, [payments])

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance Dashboard</p>
            <h1 className="mt-2 text-2xl font-display font-semibold">Summary Overview</h1>
            <p className="mt-2 text-sm text-slate-400">High-level financial health and trends.</p>
          </div>
          <button
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
            onClick={() => void loadData(false)}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading finance data...</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Revenue billed</p>
          <p className="mt-3 text-2xl font-display font-semibold">
            {summary?.revenue_billed?.toLocaleString() ?? 0}
          </p>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cash collected</p>
          <p className="mt-3 text-2xl font-display font-semibold">
            {summary?.cash_collected?.toLocaleString() ?? 0}
          </p>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Expenses</p>
          <p className="mt-3 text-2xl font-display font-semibold">
            {summary?.total_expenses?.toLocaleString() ?? 0}
          </p>
        </div>
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-slate-900/60 p-6 md:col-span-6 lg:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Receivables</p>
          <p className="mt-3 text-2xl font-display font-semibold">
            {summary?.outstanding_receivables?.toLocaleString() ?? 0}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-7">
          <h2 className="text-lg font-display font-semibold">Cashflow from Operating Activities</h2>
          <p className="mt-1 text-sm text-slate-400">
            Payments collected vs operating spend with net movement.
          </p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={operatingCashflow}>
                <defs>
                  <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }}
                  formatter={(value: number) => Number(value).toLocaleString()}
                />
                <Legend />
                <Area type="monotone" dataKey="inflow" stroke="#22c55e" fill="url(#inflow)" />
                <Area type="monotone" dataKey="outflow" stroke="#ef4444" fill="url(#outflow)" />
                <Area type="monotone" dataKey="net" stroke="#f59e0b" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-5">
          <h2 className="text-lg font-display font-semibold">Debtors aging report</h2>
          <p className="mt-1 text-sm text-slate-400">Outstanding balances by aging bucket.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtorsAging}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }}
                  formatter={(value: number) => Number(value).toLocaleString()}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {debtorsAging.map((entry) => {
                    const color =
                      entry.label === '0-30'
                        ? '#22c55e'
                        : entry.label === '31-60'
                          ? '#f59e0b'
                          : entry.label === '61-90'
                            ? '#f97316'
                            : '#ef4444'
                    return <Cell key={entry.label} fill={color} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-7">
          <h2 className="text-lg font-display font-semibold">Payments by Method</h2>
          <p className="mt-1 text-sm text-slate-400">Revenue mix across payment channels.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentsByMethod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="method" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }}
                  formatter={(value: number) => Number(value).toLocaleString()}
                />
                <Bar dataKey="total" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-5">
          <h2 className="text-lg font-display font-semibold">Payments volume</h2>
          <p className="mt-1 text-sm text-slate-400">Monthly payment totals.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }}
                  formatter={(value: number) => Number(value).toLocaleString()}
                />
                <Bar dataKey="payments" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  )
}

