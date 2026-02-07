import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'

type InvoiceAdjustment = {
  id: number
  invoice: number
  amount: number
  reason: string
  adjusted_by?: number
  adjusted_by_name?: string
  created_at: string
}

export default function FinanceAdjustmentsPage() {
  const navigate = useNavigate()
  const [adjustments, setAdjustments] = useState<InvoiceAdjustment[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [invoiceFilter, setInvoiceFilter] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const response = await apiClient.get<
          InvoiceAdjustment[] | { results: InvoiceAdjustment[]; count: number }
        >('/finance/invoice-adjustments/', {
          params: {
            page,
            search: query.trim() || undefined,
            invoice: invoiceFilter.trim() || undefined,
            min_amount: minAmount || undefined,
            max_amount: maxAmount || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
        })
        if (isMounted) {
          const normalized = normalizePaginatedResponse(response.data)
          setAdjustments(normalized.items)
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
            setError('Adjustments endpoint not found (404). Verify tenant routing.')
          } else {
            setError('Unable to load adjustments. Please try again.')
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
  }, [page, query, invoiceFilter, minAmount, maxAmount, dateFrom, dateTo])

  const filteredAdjustments = useMemo(() => {
    const term = query.trim().toLowerCase()
    const minValue = minAmount ? Number(minAmount) : null
    const maxValue = maxAmount ? Number(maxAmount) : null
    const fromValue = dateFrom ? new Date(dateFrom) : null
    const toValue = dateTo ? new Date(dateTo) : null

    return adjustments.filter((adj) => {
      if (invoiceFilter && String(adj.invoice) !== invoiceFilter) return false
      if (term) {
        const reason = adj.reason.toLowerCase()
        if (
          !String(adj.invoice).includes(term) &&
          !reason.includes(term) &&
          !String(adj.amount).includes(term)
        ) {
          return false
        }
      }
      const amountValue = Number(adj.amount)
      if (minValue !== null && amountValue < minValue) return false
      if (maxValue !== null && amountValue > maxValue) return false
      if (fromValue || toValue) {
        const created = new Date(adj.created_at)
        if (fromValue && created < fromValue) return false
        if (toValue && created > toValue) return false
      }
      return true
    })
  }, [adjustments, dateFrom, dateTo, invoiceFilter, maxAmount, minAmount, query])

  const pagedAdjustments = useMemo(() => {
    if (isServerPaginated) return filteredAdjustments
    const start = (page - 1) * pageSize
    return filteredAdjustments.slice(start, start + pageSize)
  }, [filteredAdjustments, page, isServerPaginated])

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredAdjustments.length) / pageSize),
  )

  const summary = useMemo(() => {
    const total = filteredAdjustments.reduce((sum, adj) => sum + Number(adj.amount || 0), 0)
    const count = filteredAdjustments.length
    const average = count > 0 ? total / count : 0
    const now = new Date()
    const last30 = filteredAdjustments.filter((adj) => {
      const created = new Date(adj.created_at)
      const diff = now.getTime() - created.getTime()
      return diff <= 30 * 24 * 60 * 60 * 1000
    }).length
    return { total, count, average, last30 }
  }, [filteredAdjustments])

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Invoice Adjustments</h1>
        <p className="mt-2 text-sm text-slate-400">
          Credit notes and waivers applied to invoices.
        </p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading adjustments...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      <section className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Adjustments</p>
          <p className="mt-2 text-xl font-display font-semibold">{summary.count}</p>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Amount</p>
          <p className="mt-2 text-xl font-display font-semibold">
            {summary.total.toLocaleString()}
          </p>
        </div>
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg Adjustment</p>
          <p className="mt-2 text-xl font-display font-semibold">
            {summary.average.toLocaleString()}
          </p>
        </div>
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-slate-900/60 p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Last 30 Days</p>
          <p className="mt-2 text-xl font-display font-semibold">{summary.last30}</p>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Adjustment list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/invoice-adjustments/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search invoice, amount, reason"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
            <input
              className="w-28 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Invoice #"
              value={invoiceFilter}
              onChange={(event) => {
                setInvoiceFilter(event.target.value)
                setPage(1)
              }}
            />
            <input
              className="w-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Min"
              value={minAmount}
              onChange={(event) => {
                setMinAmount(event.target.value)
                setPage(1)
              }}
            />
            <input
              className="w-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Max"
              value={maxAmount}
              onChange={(event) => {
                setMaxAmount(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPage(1)
              }}
            />
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => navigate('/modules/finance/adjustments/new')}
            >
              Create adjustment
            </button>
          </div>
        </div>
        {isServerPaginated ? (
          <p className="mt-3 text-xs text-slate-500">
            Filters and summaries apply to the current page only while pagination is enabled.
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Adjusted By</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedAdjustments.map((adj) => (
                <tr key={adj.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">INV-{adj.invoice}</td>
                  <td className="px-4 py-3">{Number(adj.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{adj.reason}</td>
                  <td className="px-4 py-3">{adj.adjusted_by_name ?? adj.adjusted_by ?? '--'}</td>
                  <td className="px-4 py-3">{adj.created_at}</td>
                </tr>
              ))}
              {pagedAdjustments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                    No adjustments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
