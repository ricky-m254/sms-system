import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export default function ParentPortalFinancePage() {
  const [summary, setSummary] = useState<any>({})
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/finance/summary/'),
      apiClient.get('/parent-portal/finance/invoices/'),
      apiClient.get('/parent-portal/finance/payments/'),
    ])
      .then(([s, i, p]) => {
        setSummary(s.data ?? {})
        setInvoices(i.data ?? [])
        setPayments(p.data ?? [])
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl glass-panel p-6">
        <h1 className="text-xl font-display font-semibold">Financial Information</h1>
      </header>
      <section className="rounded-xl glass-panel p-4 text-sm text-slate-300">
        Billed: {summary.total_billed ?? 0} | Paid: {summary.total_paid ?? 0} | Outstanding: {summary.outstanding_balance ?? 0}
      </section>
      <section className="rounded-xl glass-panel p-4 text-sm text-slate-300">
        Invoices: {invoices.length} | Payments: {payments.length}
      </section>
    </div>
  )
}

