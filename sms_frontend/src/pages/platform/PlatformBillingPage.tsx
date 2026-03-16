import { useEffect, useMemo, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Subscription Plans</h2>
            <p className="text-xs text-slate-400 mt-0.5">KES 300/student/year base pricing · M-Pesa Paybill 522522</p>
          </div>
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const TIER_EXTRAS: Record<string, { perStudent: number; freeSms: number; acctPrefix: string; color: string }> = {
              STARTER:    { perStudent: 300, freeSms: 100,  acctPrefix: 'SUB-', color: 'border-slate-600/60' },
              GROWTH:     { perStudent: 280, freeSms: 500,  acctPrefix: 'SUB-', color: 'border-sky-500/30' },
              PRO:        { perStudent: 260, freeSms: 2000, acctPrefix: 'SUB-', color: 'border-violet-500/30' },
              ENTERPRISE: { perStudent: 240, freeSms: 5000, acctPrefix: 'SUB-', color: 'border-amber-500/30' },
            }
            const extras = TIER_EXTRAS[plan.code] ?? { perStudent: 300, freeSms: 100, acctPrefix: 'SUB-', color: 'border-white/[0.07]' }
            return (
              <article key={plan.id} className={`rounded-xl border ${extras.color} bg-slate-950/60 p-4 text-sm`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">{plan.code}</p>
                    <p className="font-bold text-white text-base">{plan.name}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">ACTIVE</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  KES {Number(plan.annual_price).toLocaleString()}
                  <span className="text-sm font-normal text-slate-500">/yr</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">KES {Number(plan.monthly_price).toLocaleString()}/month</p>
                <div className="mt-3 space-y-1 text-xs text-slate-400 border-t border-white/[0.07] pt-3">
                  <div className="flex justify-between">
                    <span>Students</span>
                    <span className="text-white">≤ {plan.max_students === 9999 ? '500+' : plan.max_students}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Per-student rate</span>
                    <span className="text-white">KES {extras.perStudent}/yr</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Free SMS credits</span>
                    <span className="text-white">{extras.freeSms.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage</span>
                    <span className="text-white">{plan.max_storage_gb} GB</span>
                  </div>
                </div>
              </article>
            )
          })}
          {!isLoading && plans.length === 0 ? <p className="col-span-4 text-sm text-slate-400">No plans found.</p> : null}
        </div>

        {/* Pricing reference */}
        <div className="mt-6 rounded-xl border border-white/[0.07] bg-slate-950/40 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pricing Reference · KES 300/student/year</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/[0.07] text-slate-500 uppercase">
                  <th className="pb-2 pr-4 text-left">Plan</th>
                  <th className="pb-2 pr-4 text-left">Students</th>
                  <th className="pb-2 pr-4 text-right">Annual Fee</th>
                  <th className="pb-2 pr-4 text-right">Per-Student (Overage)</th>
                  <th className="pb-2 pr-4 text-right">Free SMS</th>
                  <th className="pb-2 text-left">Account Prefix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  { plan: 'Starter',    students: '1 – 50',   fee: 'KES 15,000',  rate: 'KES 300', sms: '100',    prefix: 'SUB-XXX' },
                  { plan: 'Growth',     students: '51 – 200', fee: 'KES 60,000',  rate: 'KES 280', sms: '500',    prefix: 'SUB-XXX' },
                  { plan: 'Pro',        students: '201 – 500',fee: 'KES 150,000', rate: 'KES 260', sms: '2,000',  prefix: 'SUB-XXX' },
                  { plan: 'Enterprise', students: '500+',     fee: 'Custom',      rate: 'KES 240', sms: '5,000+', prefix: 'SUB-XXX' },
                ].map(r => (
                  <tr key={r.plan} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 font-medium text-white">{r.plan}</td>
                    <td className="py-2 pr-4 text-slate-400">{r.students}</td>
                    <td className="py-2 pr-4 text-right text-emerald-400">{r.fee}</td>
                    <td className="py-2 pr-4 text-right">{r.rate}</td>
                    <td className="py-2 pr-4 text-right">{r.sms}</td>
                    <td className="py-2 font-mono text-slate-500">{r.prefix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            Invoices: {totals.count} | Paid: {totals.paidCount} | Total: KES {Number(totals.total).toLocaleString()}
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
                  <td className="px-3 py-2">KES {Number(row.total_amount).toLocaleString()}</td>
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

