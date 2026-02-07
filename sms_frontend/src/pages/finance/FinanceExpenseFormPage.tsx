import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'

type Expense = {
  id: number
  category: string
  amount: number
  expense_date: string
  description?: string
}

export default function FinanceExpenseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState({
    category: '',
    amount: '',
    expense_date: '',
    description: '',
  })
  const isFormDisabled = isSubmitting || isLoading

  useEffect(() => {
    let isMounted = true
    const loadExpense = async () => {
      if (!isEdit || !id) {
        setIsLoading(false)
        return
      }
      try {
        const response = await apiClient.get<Expense>(`/finance/expenses/${id}/`)
        if (isMounted) {
          setFormState({
            category: response.data.category,
            amount: String(response.data.amount),
            expense_date: response.data.expense_date,
            description: response.data.description ?? '',
          })
        }
      } catch (err) {
        if (isMounted) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setFormError(detail ?? 'Unable to load expense.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadExpense()
    return () => {
      isMounted = false
    }
  }, [id, isEdit])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const nextErrors: Record<string, string> = {}
    if (!formState.category.trim()) nextErrors.category = 'Enter a category.'
    const amountValue = Number(formState.amount)
    if (!formState.amount || Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a valid amount.'
    }
    if (!formState.expense_date) nextErrors.expense_date = 'Choose an expense date.'
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    const payload = {
      category: formState.category.trim(),
      amount: Number(formState.amount),
      expense_date: formState.expense_date,
      description: formState.description.trim(),
    }

    setIsSubmitting(true)
    try {
      if (isEdit && id) {
        await apiClient.patch(`/finance/expenses/${id}/`, payload)
      } else {
        await apiClient.post('/finance/expenses/', payload)
      }
      navigate('/modules/finance/expenses', {
        state: { flash: isEdit ? 'Expense updated.' : 'Expense created.' },
      })
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      if (data && typeof data === 'object') {
        const nextErrors: Record<string, string> = {}
        const assign = (key: string) => {
          const value = data[key]
          if (Array.isArray(value)) {
            nextErrors[key] = value.join(' ')
          } else if (typeof value === 'string') {
            nextErrors[key] = value
          }
        }
        ;['category', 'amount', 'expense_date'].forEach(assign)
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors)
          setFormError('Please correct the highlighted fields.')
          return
        }
      }
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setFormError(detail ?? 'Unable to save expense.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">
          {isEdit ? 'Edit Expense' : 'Create Expense'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {isEdit ? 'Update an existing expense.' : 'Record a new expense.'}
        </p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-300">Loading expense...</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Category
            <input
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.category}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, category: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, category: '' }))
              }}
              placeholder="Utilities"
              disabled={isFormDisabled}
            />
            {fieldErrors.category ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.category}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Amount
            <input
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.amount}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, amount: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, amount: '' }))
              }}
              placeholder="200.00"
              disabled={isFormDisabled}
            />
            {fieldErrors.amount ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.amount}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Expense Date
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.expense_date}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, expense_date: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, expense_date: '' }))
              }}
              disabled={isFormDisabled}
            />
            {fieldErrors.expense_date ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.expense_date}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Description
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              disabled={isFormDisabled}
            />
          </label>
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update expense' : 'Create expense'}
            </button>
            <button
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
              type="button"
              onClick={() => navigate('/modules/finance/expenses')}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
