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
  description?: string
  monthly_price: string
  annual_price: string
  max_students: number
  max_storage_gb: number
}

type Subscription = {
  id: number
  tenant: number
  tenant_name: string
  plan: number
  plan_detail: Plan | null
  billing_cycle: string
  status: string
  starts_on: string | null
  ends_on: string | null
  is_current: boolean
  created_at: string
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

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const SELECT_CLS = 'rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm'

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-emerald-500/20 text-emerald-300',
  TRIAL:     'bg-sky-500/20 text-sky-300',
  SUSPENDED: 'bg-amber-500/20 text-amber-300',
  CANCELLED: 'bg-rose-500/20 text-rose-300',
}

export default function PlatformBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [invoiceFilters, setInvoiceFilters] = useState({ tenant: '', status: '' })
  const [subFilters, setSubFilters] = useState({ tenant: '', plan: '', status: '' })
  const [payingId, setPayingId] = useState<number | null>(null)

  const [subForm, setSubForm] = useState({ tenant: '', plan: '', billing_cycle: 'ANNUAL' })
  const [isCreatingSub, setIsCreatingSub] = useState(false)

  const loadBilling = async () => {
    setIsLoading(true)
    setError(null)
    const [planResult, tenantResult, invoiceResult, subResult] = await Promise.allSettled([
      publicApiClient.get('/platform/plans/'),
      publicApiClient.get('/platform/tenants/'),
      publicApiClient.get('/platform/subscription-invoices/', {
        params: {
          tenant_id: invoiceFilters.tenant || undefined,
          status: invoiceFilters.status || undefined,
        },
      }),
      publicApiClient.get('/platform/subscriptions/', {
        params: {
          tenant_id: subFilters.tenant || undefined,
          plan_id: subFilters.plan || undefined,
          status: subFilters.status || undefined,
        },
      }),
    ])
    if (planResult.status === 'fulfilled') setPlans(normalizePaginatedResponse<Plan>(planResult.value.data).items)
    if (tenantResult.status === 'fulfilled') setTenants(normalizePaginatedResponse<Tenant>(tenantResult.value.data).items)
    if (invoiceResult.status === 'fulfilled') setInvoices(normalizePaginatedResponse<Invoice>(invoiceResult.value.data).items)
    if (subResult.status === 'fulfilled') setSubscriptions(normalizePaginatedResponse<Subscription>(subResult.value.data).items)
    const firstError = [planResult, tenantResult, invoiceResult, subResult].find(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    )
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load some billing data.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadBilling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceFilters.tenant, invoiceFilters.status, subFilters.tenant, subFilters.plan, subFilters.status])

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

  const createSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subForm.tenant || !subForm.plan) {
      setError('Please select both a tenant and a plan.')
      return
    }
    setIsCreatingSub(true)
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/subscriptions/', {
        tenant: Number(subForm.tenant),
        plan: Number(subForm.plan),
        billing_cycle: subForm.billing_cycle,
      })
      setMessage('Subscription created successfully.')
      setSubForm({ tenant: '', plan: '', billing_cycle: 'ANNUAL' })
      await loadBilling()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create subscription.'))
    } finally {
      setIsCreatingSub(false)
    }
  }

  const selectedPlan = plans.find((p) => String(p.id) === subForm.plan)

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Subscription & Billing"
        subtitle="Plans, subscriptions, billing cycles, invoice tracking, and payment capture."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}

      {/* ── Subscription Plans (cards) ─────────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Subscription Plans</h2>
            <p className="text-xs text-slate-400 mt-0.5">KES 300/student/year base pricing · M-Pesa Paybill 522522</p>
          </div>
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const TIER_EXTRAS: Record<string, { perStudent: number; freeSms: number; color: string }> = {
              STARTER:    { perStudent: 300, freeSms: 100,  color: 'border-slate-600/60' },
              GROWTH:     { perStudent: 280, freeSms: 500,  color: 'border-sky-500/30' },
              PRO:        { perStudent: 260, freeSms: 2000, color: 'border-violet-500/30' },
              PROFESSIONAL: { perStudent: 260, freeSms: 2000, color: 'border-violet-500/30' },
              ENTERPRISE: { perStudent: 240, freeSms: 5000, color: 'border-amber-500/30' },
              UNLIMITED:  { perStudent: 220, freeSms: 10000, color: 'border-emerald-500/30' },
            }
            const extras = TIER_EXTRAS[plan.code] ?? { perStudent: 300, freeSms: 100, color: 'border-white/[0.07]' }
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
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  { plan: 'Starter',    students: '1 – 50',    fee: 'KES 15,000',  rate: 'KES 300', sms: '100'    },
                  { plan: 'Growth',     students: '51 – 200',  fee: 'KES 60,000',  rate: 'KES 280', sms: '500'    },
                  { plan: 'Pro',        students: '201 – 500', fee: 'KES 150,000', rate: 'KES 260', sms: '2,000'  },
                  { plan: 'Enterprise', students: '500+',      fee: 'Custom',      rate: 'KES 240', sms: '5,000+' },
                ].map(r => (
                  <tr key={r.plan} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 font-medium text-white">{r.plan}</td>
                    <td className="py-2 pr-4 text-slate-400">{r.students}</td>
                    <td className="py-2 pr-4 text-right text-emerald-400">{r.fee}</td>
                    <td className="py-2 pr-4 text-right">{r.rate}</td>
                    <td className="py-2 pr-4 text-right">{r.sms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Create Subscription ────────────────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <h2 className="text-lg font-semibold">Assign / Create Subscription</h2>
        <p className="mt-0.5 text-xs text-slate-400">Select a tenant and a billing plan to activate or update their subscription.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={(e) => void createSubscription(e)}>
          <select
            className={SELECT_CLS}
            value={subForm.tenant}
            onChange={(e) => setSubForm((p) => ({ ...p, tenant: e.target.value }))}
            required
          >
            <option value="">Select tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            className={SELECT_CLS}
            value={subForm.plan}
            onChange={(e) => setSubForm((p) => ({ ...p, plan: e.target.value }))}
            required
          >
            <option value="">Select billing plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — ≤{plan.max_students === 9999 ? '500+' : plan.max_students} students · KES {Number(plan.annual_price).toLocaleString()}/yr
              </option>
            ))}
          </select>

          <select
            className={SELECT_CLS}
            value={subForm.billing_cycle}
            onChange={(e) => setSubForm((p) => ({ ...p, billing_cycle: e.target.value }))}
          >
            <option value="ANNUAL">Annual (recommended)</option>
            <option value="MONTHLY">Monthly</option>
          </select>

          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
            disabled={isCreatingSub}
          >
            {isCreatingSub ? 'Creating...' : 'Create Subscription'}
          </button>
        </form>

        {selectedPlan ? (
          <div className="mt-3 flex flex-wrap items-start gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-300 text-sm">{selectedPlan.name} Plan selected</p>
              {selectedPlan.description ? <p className="mt-0.5 text-slate-400">{selectedPlan.description}</p> : null}
            </div>
            <div className="flex flex-wrap gap-4 text-slate-300 shrink-0">
              <div className="text-center">
                <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Annual Fee</p>
                <p className="font-bold text-white">KES {Number(selectedPlan.annual_price).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Monthly</p>
                <p className="font-bold text-white">KES {Number(selectedPlan.monthly_price).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Max Students</p>
                <p className="font-bold text-white">{selectedPlan.max_students === 9999 ? '500+' : selectedPlan.max_students}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Storage</p>
                <p className="font-bold text-white">{selectedPlan.max_storage_gb} GB</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Active Subscriptions ───────────────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold mr-2">Active Subscriptions</h2>
          <select className={SELECT_CLS} value={subFilters.tenant} onChange={(e) => setSubFilters((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">All tenants</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className={SELECT_CLS} value={subFilters.plan} onChange={(e) => setSubFilters((p) => ({ ...p, plan: e.target.value }))}>
            <option value="">All plans</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={SELECT_CLS} value={subFilters.status} onChange={(e) => setSubFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All statuses</option>
            {['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-white" onClick={() => void loadBilling()}>
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Cycle</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Starts</th>
                <th className="px-3 py-2">Ends</th>
                <th className="px-3 py-2">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={7}>Loading subscriptions...</td></tr> : null}
              {subscriptions.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2 font-medium text-white">{row.tenant_name}</td>
                  <td className="px-3 py-2">{row.plan_detail?.name ?? row.plan}</td>
                  <td className="px-3 py-2">{row.billing_cycle}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[row.status] ?? 'bg-white/[0.06] text-slate-300'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{row.starts_on ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-400">{row.ends_on ?? '—'}</td>
                  <td className="px-3 py-2">
                    {row.is_current ? <span className="text-emerald-400 text-xs">✓ Current</span> : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                </tr>
              ))}
              {!isLoading && subscriptions.length === 0 ? (
                <tr><td className="px-3 py-4 text-slate-400" colSpan={7}>No subscriptions found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Invoice Management ─────────────────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold mr-2">Invoice Management</h2>
          <select className={SELECT_CLS} value={invoiceFilters.tenant} onChange={(e) => setInvoiceFilters((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">All tenants</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <select className={SELECT_CLS} value={invoiceFilters.status} onChange={(e) => setInvoiceFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All statuses</option>
            {['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-white" onClick={() => void loadBilling()}>
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
