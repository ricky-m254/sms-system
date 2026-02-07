import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { format, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Expense = {
  id: number
  category: string
  amount: number
  expense_date: string
  description?: string
}

type AcademicYear = {
  id: number
  name: string
}

type Term = {
  id: number
  name: string
  academic_year_id: number
}

type Budget = {
  id?: number
  academic_year: string
  term: number
  monthly_budget: number
  quarterly_budget: number
  annual_budget: number
  categories?: Array<{
    category: string
    limit: number
  }>
}

const mockBudgets: Budget[] = [
  {
    id: 1,
    academic_year: '2025',
    term: 1,
    monthly_budget: 15000,
    quarterly_budget: 45000,
    annual_budget: 180000,
    categories: [
      { category: 'Utilities', limit: 5000 },
      { category: 'Maintenance', limit: 4000 },
      { category: 'Supplies', limit: 3000 },
    ],
  },
]

export default function FinanceExpensesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expenseQuery, setExpenseQuery] = useState('')
  const [expensePage, setExpensePage] = useState(1)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetSource, setBudgetSource] = useState<'api' | 'mock'>('api')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [quarterlyBudget, setQuarterlyBudget] = useState('')
  const [annualBudget, setAnnualBudget] = useState('')
  const [budgetTouched, setBudgetTouched] = useState(false)
  const [isSavingBudget, setIsSavingBudget] = useState(false)
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null)
  const [trendGranularity, setTrendGranularity] = useState<'monthly' | 'weekly' | 'daily'>(
    'monthly',
  )
  const [trendCategory, setTrendCategory] = useState('all')
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )

  const pageSize = 8

  useEffect(() => {
    const state = location.state as { flash?: string } | null
    if (state?.flash) {
      setFlash(state.flash)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    let isMounted = true
    const loadReferences = async () => {
      try {
        const [yearRes, termRes] = await Promise.all([
          apiClient.get<AcademicYear[] | { results: AcademicYear[]; count: number }>(
            '/academics/ref/academic-years/',
          ),
          apiClient.get<Term[] | { results: Term[]; count: number }>('/academics/ref/terms/'),
        ])
        if (isMounted) {
          const yearItems = normalizePaginatedResponse(yearRes.data).items
          const termItems = normalizePaginatedResponse(termRes.data).items
          setAcademicYears(yearItems)
          setTerms(termItems)
          if (!selectedAcademicYear && yearItems.length > 0) {
            setSelectedAcademicYear(yearItems[0].name)
          }
          if (!selectedTerm && termItems.length > 0) {
            setSelectedTerm(String(termItems[0].id))
          }
        }
      } catch {
        if (isMounted) {
          if (!selectedAcademicYear) {
            setSelectedAcademicYear(String(new Date().getFullYear()))
          }
          if (!selectedTerm) {
            setSelectedTerm('1')
          }
        }
      }
    }
    loadReferences()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setMonthlyBudget(localStorage.getItem('finance:budget:monthly') ?? '')
    setQuarterlyBudget(localStorage.getItem('finance:budget:quarterly') ?? '')
    setAnnualBudget(localStorage.getItem('finance:budget:annual') ?? '')
  }, [])

  useEffect(() => {
    localStorage.setItem('finance:budget:monthly', monthlyBudget)
  }, [monthlyBudget])

  useEffect(() => {
    localStorage.setItem('finance:budget:quarterly', quarterlyBudget)
  }, [quarterlyBudget])

  useEffect(() => {
    localStorage.setItem('finance:budget:annual', annualBudget)
  }, [annualBudget])

  useEffect(() => {
    if (!selectedAcademicYear || !selectedTerm) return
    let isMounted = true
    const loadBudgets = async () => {
      setBudgetNotice(null)
      try {
        const response = await apiClient.get<Budget[] | { results: Budget[]; count: number }>(
          '/v1/finance/budgets',
          {
            params: { academicYear: selectedAcademicYear, term: selectedTerm },
          },
        )
        const items = normalizePaginatedResponse(response.data).items
        if (items.length === 0) {
          throw new Error('empty')
        }
        if (isMounted) {
          setBudgets(items)
          setBudgetSource('api')
        }
      } catch {
        if (!isMounted) return
        const storedMonthly = Number(localStorage.getItem('finance:budget:monthly') ?? 0)
        const storedQuarterly = Number(localStorage.getItem('finance:budget:quarterly') ?? 0)
        const storedAnnual = Number(localStorage.getItem('finance:budget:annual') ?? 0)
        if (storedMonthly || storedQuarterly || storedAnnual) {
          setBudgets([
            {
              academic_year: selectedAcademicYear,
              term: Number(selectedTerm),
              monthly_budget: storedMonthly,
              quarterly_budget: storedQuarterly,
              annual_budget: storedAnnual,
            },
          ])
        } else {
          const fallback = mockBudgets.filter(
            (budget) =>
              budget.academic_year === selectedAcademicYear &&
              String(budget.term) === String(selectedTerm),
          )
          setBudgets(fallback.length > 0 ? fallback : mockBudgets)
        }
        setBudgetSource('mock')
        setBudgetNotice('Budget API unavailable. Using mock/local values.')
      }
    }
    loadBudgets()
    return () => {
      isMounted = false
    }
  }, [selectedAcademicYear, selectedTerm])

  useEffect(() => {
    if (budgetTouched) return
    const budget = budgets[0]
    if (!budget) return
    setMonthlyBudget(budget.monthly_budget ? String(budget.monthly_budget) : '')
    setQuarterlyBudget(budget.quarterly_budget ? String(budget.quarterly_budget) : '')
    setAnnualBudget(budget.annual_budget ? String(budget.annual_budget) : '')
  }, [budgets, budgetTouched])

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const response = await apiClient.get<Expense[] | { results: Expense[]; count: number }>(
          '/finance/expenses/',
          { params: { page: expensePage, search: expenseQuery.trim() || undefined } },
        )
        if (isMounted) {
          const normalized = normalizePaginatedResponse(response.data)
          setExpenses(normalized.items)
          setTotalCount(normalized.totalCount)
          setIsServerPaginated(normalized.isPaginated)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the FINANCE module and proper role.')
          } else if (status === 404) {
            setError('Finance endpoints not found (404). Verify tenant routing.')
          } else {
            setError('Unable to load expenses. Please try again.')
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [expensePage, expenseQuery])

  const filteredExpenses = useMemo(() => {
    if (isServerPaginated) return expenses
    const term = expenseQuery.trim().toLowerCase()
    if (!term) return expenses
    return expenses.filter((expense) =>
      expense.category.toLowerCase().includes(term),
    )
  }, [expenseQuery, expenses])

  const totalSpend = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses],
  )

  const monthlySpendData = useMemo(() => {
    const grouped = new Map<string, number>()
    expenses.forEach((expense) => {
      if (!expense.expense_date) return
      try {
        const key = format(parseISO(expense.expense_date), 'yyyy-MM')
        grouped.set(key, (grouped.get(key) ?? 0) + Number(expense.amount || 0))
      } catch {
        return
      }
    })
    return grouped
  }, [expenses])

  const currentMonthKey = format(new Date(), 'yyyy-MM')
  const spendThisMonth = monthlySpendData.get(currentMonthKey) ?? 0
  const monthlyBudgetValue = Number(monthlyBudget) || 0
  const quarterlyBudgetValue = Number(quarterlyBudget) || 0
  const annualBudgetValue = Number(annualBudget) || 0
  const remainingMonthly = monthlyBudgetValue - spendThisMonth
  const utilization =
    monthlyBudgetValue > 0 ? Math.min(100, (spendThisMonth / monthlyBudgetValue) * 100) : 0

  const trendExpenses = useMemo(() => {
    if (trendCategory === 'all') return expenses
    return expenses.filter((expense) => expense.category === trendCategory)
  }, [expenses, trendCategory])

  const expenseCategories = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((expense) => {
      if (expense.category) {
        set.add(expense.category)
      }
    })
    return Array.from(set).sort()
  }, [expenses])

  const trendSeries = useMemo(() => {
    const grouped = new Map<string, number>()
    const formatKey = (date: Date) => {
      if (trendGranularity === 'daily') return format(date, 'yyyy-MM-dd')
      if (trendGranularity === 'weekly') return format(date, 'yyyy-ww')
      return format(date, 'yyyy-MM')
    }
    trendExpenses.forEach((expense) => {
      if (!expense.expense_date) return
      try {
        const key = formatKey(parseISO(expense.expense_date))
        grouped.set(key, (grouped.get(key) ?? 0) + Number(expense.amount || 0))
      } catch {
        return
      }
    })
    const entries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
    const limit = trendGranularity === 'daily' ? 14 : trendGranularity === 'weekly' ? 12 : 6
    const tail = entries.slice(-limit)
    return tail.map(([key, value]) => ({
      period: key,
      spend: value,
      budget: trendGranularity === 'monthly' ? monthlyBudgetValue || null : null,
    }))
  }, [trendExpenses, trendGranularity, monthlyBudgetValue])

  const pagedExpenses = useMemo(() => {
    if (isServerPaginated) return filteredExpenses
    const start = (expensePage - 1) * pageSize
    return filteredExpenses.slice(start, start + pageSize)
  }, [filteredExpenses, expensePage, isServerPaginated])

  const totalExpensePages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredExpenses.length) / pageSize),
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/finance/expenses/${deleteTarget.id}/`)
      setExpenses((prev) => prev.filter((expense) => expense.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setDeleteError(detail ?? 'Unable to delete expense.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveBudget = async () => {
    if (!selectedAcademicYear || !selectedTerm) return
    setIsSavingBudget(true)
    setBudgetNotice(null)
    const payload = {
      academic_year: selectedAcademicYear,
      term: Number(selectedTerm),
      monthly_budget: Number(monthlyBudget) || 0,
      quarterly_budget: Number(quarterlyBudget) || 0,
      annual_budget: Number(annualBudget) || 0,
    }
    try {
      if (budgets[0]?.id) {
        await apiClient.put(`/v1/finance/budgets/${budgets[0].id}/`, payload)
      } else {
        await apiClient.post('/v1/finance/budgets/', payload)
      }
      setBudgets([{ ...payload, id: budgets[0]?.id ?? undefined }])
      setBudgetSource('api')
      setBudgetNotice('Budget saved successfully.')
    } catch {
      setBudgets([{ ...payload, id: budgets[0]?.id ?? undefined }])
      setBudgetSource('mock')
      setBudgetNotice('Budget API unavailable. Saved locally only.')
    } finally {
      setIsSavingBudget(false)
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleExportCsv = () => {
    const rows = filteredExpenses.map((expense) => [
      expense.id,
      expense.category,
      expense.amount,
      expense.expense_date,
      expense.description ?? '',
    ])
    const header = ['id', 'category', 'amount', 'expense_date', 'description']
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadFile(csv, 'expenses-report.csv', 'text/csv')
  }

  const handleExportSummary = () => {
    const totalsByCategory = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] ?? 0) + Number(expense.amount || 0)
      return acc
    }, {})
    const payload = {
      generated_at: new Date().toISOString(),
      academic_year: selectedAcademicYear || null,
      term: selectedTerm || null,
      total_expenses: filteredExpenses.length,
      total_amount: filteredExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      ),
      totals_by_category: totalsByCategory,
    }
    downloadFile(JSON.stringify(payload, null, 2), 'expenses-summary.json', 'application/json')
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Expenses</h1>
        <p className="mt-2 text-sm text-slate-400">Track operational spend and categories.</p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading expenses...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-sm text-emerald-200">{flash}</p>
        </div>
      ) : null}

      <section className="col-span-12 grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">Total spend</p>
          <p className="mt-2 text-2xl font-semibold">{totalSpend.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-400">Based on loaded expenses.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">This month</p>
          <p className="mt-2 text-2xl font-semibold">{spendThisMonth.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-400">Month: {currentMonthKey}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">Remaining budget</p>
          <p className="mt-2 text-2xl font-semibold">
            {monthlyBudgetValue ? remainingMonthly.toLocaleString() : '--'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {monthlyBudgetValue ? `${utilization.toFixed(0)}% used` : 'Set monthly budget'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-3">
          <p className="text-xs uppercase text-slate-400">Budget planning</p>
          <div className="mt-3 grid gap-2 text-sm">
            <label className="block text-xs text-slate-400">
              Academic year
              <select
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-sm text-white"
                value={selectedAcademicYear}
                onChange={(event) => {
                  setSelectedAcademicYear(event.target.value)
                  setBudgetTouched(false)
                }}
              >
                {academicYears.length === 0 ? (
                  <option value={selectedAcademicYear || '2025'}>
                    {selectedAcademicYear || '2025'}
                  </option>
                ) : null}
                {academicYears.map((year) => (
                  <option key={year.id} value={year.name}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-400">
              Term
              <select
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-sm text-white"
                value={selectedTerm}
                onChange={(event) => {
                  setSelectedTerm(event.target.value)
                  setBudgetTouched(false)
                }}
              >
                {terms.length === 0 ? (
                  <option value={selectedTerm || '1'}>{selectedTerm || '1'}</option>
                ) : null}
                {terms
                  .filter((term) =>
                    selectedAcademicYear
                      ? academicYears.find((year) => year.name === selectedAcademicYear)?.id ===
                        term.academic_year_id
                      : true,
                  )
                  .map((term) => (
                    <option key={term.id} value={String(term.id)}>
                      {term.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Monthly</span>
              <input
                type="number"
                className="w-28 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-right text-sm text-white"
                value={monthlyBudget}
                onChange={(event) => {
                  setMonthlyBudget(event.target.value)
                  setBudgetTouched(true)
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Quarterly</span>
              <input
                type="number"
                className="w-28 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-right text-sm text-white"
                value={quarterlyBudget}
                onChange={(event) => {
                  setQuarterlyBudget(event.target.value)
                  setBudgetTouched(true)
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Annual</span>
              <input
                type="number"
                className="w-28 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-right text-sm text-white"
                value={annualBudget}
                onChange={(event) => {
                  setAnnualBudget(event.target.value)
                  setBudgetTouched(true)
                }}
              />
            </label>
            <div className="pt-1 text-[11px] text-slate-500">
              Quarterly: {quarterlyBudgetValue ? quarterlyBudgetValue.toLocaleString() : '--'} | Annual:{' '}
              {annualBudgetValue ? annualBudgetValue.toLocaleString() : '--'}
            </div>
            <button
              className="mt-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-70"
              onClick={handleSaveBudget}
              disabled={isSavingBudget}
            >
              {isSavingBudget ? 'Saving...' : 'Save budget'}
            </button>
            {budgetNotice ? (
              <p className="text-[11px] text-slate-400">{budgetNotice}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold">Spending trends</h2>
            <p className="mt-1 text-sm text-slate-400">
              Daily, weekly, or monthly breakdowns by category.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <select
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-white"
              value={trendGranularity}
              onChange={(event) =>
                setTrendGranularity(event.target.value as 'monthly' | 'weekly' | 'daily')
              }
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
            <select
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-white"
              value={trendCategory}
              onChange={(event) => setTrendCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <span>
              Monthly budget: {monthlyBudgetValue ? monthlyBudgetValue.toLocaleString() : 'Not set'}
            </span>
          </div>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="period" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value: number) => Number(value).toLocaleString()}
                contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }}
              />
              <Legend />
              <Bar dataKey="spend" name="Spend" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="budget" name="Budget" stroke="#22c55e" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Expense list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/expenses/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search category"
              value={expenseQuery}
              onChange={(event) => {
                setExpenseQuery(event.target.value)
                setExpensePage(1)
              }}
            />
            <button
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
              onClick={handleExportCsv}
            >
              Export CSV
            </button>
            <button
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
              onClick={handleExportSummary}
            >
              Export summary
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => navigate('/modules/finance/expenses/new')}
            >
              Create expense
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedExpenses.map((expense) => (
                <tr key={expense.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{expense.category}</td>
                  <td className="px-4 py-3">{Number(expense.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3">{expense.description ?? '--'}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                      onClick={() => navigate(`/modules/finance/expenses/${expense.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                      onClick={() => setDeleteTarget(expense)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {pagedExpenses.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                    No expenses found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {expensePage} of {totalExpensePages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={expensePage === 1}
              onClick={() => setExpensePage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={expensePage === totalExpensePages}
              onClick={() => setExpensePage((prev) => Math.min(totalExpensePages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-display font-semibold">Delete expense</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will permanently remove <strong>{deleteTarget.category}</strong>. Continue?
            </p>
            {deleteError ? <p className="mt-3 text-xs text-rose-300">{deleteError}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
