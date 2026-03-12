import { useEffect, useMemo, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'

type Tenant = {
  id: number
  name: string
  schema_name: string
}

type Plan = {
  id: number
  code: string
  name: string
  monthly_price: string
  annual_price: string
  max_students: number
  max_storage_gb: number
}

type Invoice = {
  id: number
  tenant: number
  tenant_name: string
  invoice_number: string
  status: string
  billing_cycle: string
  total_amount: string
  due_date: string
}

export default function PlatformBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filters, setFilters] = useState({ tenant: '', status: '' })
  const [payingId, setPayingId] = useState<number | null>(null)

  const loadBilling = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [planRes, tenantRes, invoiceRes] = await Promise.all([
        publicApiClient.get('/platform/plans/'),
        publicApiClient.get('/platform/tenants/'),
        publicApiClient.get('/platform/subscription-invoices/', {
          params: {
            tenant_id: filters.tenant || undefined,
            status: filters.status || undefined,
          },
        }),
      ])
      setPlans(normalizePaginatedResponse<Plan>(planRes.data).items)
      setTenants(normalizePaginatedResponse<Tenant>(tenantRes.data).items)
      setInvoices(normalizePaginatedResponse<Invoice>(invoiceRes.data).items)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load billing module data.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadBilling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.tenant, filters.status])

  const totals = useMemo(() => {
    let total = 0
    let paidCount = 0
    for (const row of invoices) {
      total += Number(row.total_amount || 0)
      if (row.status === 'PAID') paidCount += 1
    }
    return { total: total.toFixed(2), paidCount, count: invoices.length }
  }, [invoices])

  const recordPayment = async (invoice: Invoice) => {
    const amount = window.prompt(`Record payment amount for ${invoice.invoice_number}`, invoice.total_amount)
    if (!amount) return
    setPayingId(invoice.id)
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/subscription-invoices/${invoice.id}/record-payment/`, {
        amount: Number(amount),
        method: 'MANUAL',
      })
      setMessage(`Payment recorded for invoice ${invoice.invoice_number}.`)
      await loadBilling()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to record invoice payment.'))
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Subscription & Billing"
        subtitle="Plans, billing cycles, invoice tracking, and manual payment capture."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Active Plans</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">{plan.code}</p>
              <p className="mt-1 font-semibold text-white">{plan.name}</p>
              <p className="mt-2 text-slate-300">${plan.monthly_price}/month</p>
              <p className="text-slate-400">${plan.annual_price}/year</p>
              <p className="mt-2 text-xs text-slate-400">{plan.max_students} students | {plan.max_storage_gb}GB</p>
            </article>
          ))}
          {!isLoading && plans.length === 0 ? <p className="text-sm text-slate-400">No plans found.</p> : null}
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={filters.tenant} onChange={(e) => setFilters((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">All tenants</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All statuses</option>
            {['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void loadBilling()}>
            Refresh
          </button>
          <p className="ml-auto text-xs text-slate-400">
            Invoices: {totals.count} | Paid: {totals.paidCount} | Total: ${totals.total}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Cycle</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={7}>Loading billing records...</td></tr> : null}
              {invoices.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{row.invoice_number}</td>
                  <td className="px-3 py-2">{row.tenant_name}</td>
                  <td className="px-3 py-2">{row.billing_cycle}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">${row.total_amount}</td>
                  <td className="px-3 py-2">{row.due_date}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border border-white/[0.09] px-2 py-1 text-xs disabled:opacity-60"
                      disabled={row.status === 'PAID' || payingId === row.id}
                      onClick={() => void recordPayment(row)}
                    >
                      {payingId === row.id ? 'Saving...' : 'Record Payment'}
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && invoices.length === 0 ? <tr><td className="px-3 py-4 text-slate-400" colSpan={7}>No invoices found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

