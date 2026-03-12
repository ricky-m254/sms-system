import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Search, Grid3X3, List, BookOpen, Loader2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

interface LibraryResource {
  id: number
  title: string
  subtitle: string
  authors: string
  publisher: string
  publication_year: number | null
  isbn: string
  resource_type: string
  subjects: string
  language: string
  category_name: string
  total_copies: number
  available_copies: number
  is_active: boolean
}

type ViewMode = 'grid' | 'list'

const SUBJECT_COLORS: Record<string, { from: string; to: string; icon: string }> = {
  'Mathematics':    { from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  'Biology':        { from: '#166534', to: '#22c55e', icon: '🧬' },
  'Chemistry':      { from: '#581c87', to: '#a855f7', icon: '⚗️' },
  'Physics':        { from: '#0c4a6e', to: '#0ea5e9', icon: '⚡' },
  'English':        { from: '#065f46', to: '#10b981', icon: '📖' },
  'Kiswahili':      { from: '#92400e', to: '#f59e0b', icon: '🗣️' },
  'History':        { from: '#7c2d12', to: '#f97316', icon: '🏛️' },
  'Geography':      { from: '#14532d', to: '#84cc16', icon: '🌍' },
  'Computer Studies': { from: '#1e1b4b', to: '#6366f1', icon: '💻' },
  'Business':       { from: '#1e3a5f', to: '#64748b', icon: '💼' },
  'Agriculture':    { from: '#052e16', to: '#16a34a', icon: '🌱' },
  'Literature':     { from: '#065f46', to: '#10b981', icon: '📚' },
  'Fiction':        { from: '#713f12', to: '#eab308', icon: '📕' },
  'Reference':      { from: '#292524', to: '#78716c', icon: '📕' },
}
const getColors = (subject: string, type: string) => {
  for (const [key, v] of Object.entries(SUBJECT_COLORS)) {
    if (subject?.toLowerCase().includes(key.toLowerCase()) || type?.toLowerCase().includes(key.toLowerCase())) return v
  }
  return { from: '#1e293b', to: '#475569', icon: '📖' }
}

function BookCoverImage({ isbn, title, icon, from: from_, to }: {
  isbn: string; title: string; icon: string; from: string; to: string
}) {
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading')
  const url = isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` : ''

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: `linear-gradient(160deg, ${from_}, ${to})` }}>
      {isbn && imgState !== 'error' && (
        <img
          src={url} alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: imgState === 'ok' ? 1 : 0 }}
          onLoad={() => setImgState('ok')}
          onError={() => setImgState('error')}
        />
      )}
      {(imgState !== 'ok' || !isbn) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <span className="text-4xl drop-shadow-md">{icon}</span>
        </div>
      )}
    </div>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

export default function LibraryCatalogPage() {
  const [books, setBooks] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [view, setView] = useState<ViewMode>('grid')

  useEffect(() => {
    apiClient.get('library/resources/?limit=200')
      .then(r => {
        const data = r.data
        setBooks(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category_name).filter(Boolean))).sort()]

  const filtered = books.filter(b => {
    const matchCat = category === 'All' || b.category_name === category
    const matchSearch = search === '' ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.authors.toLowerCase().includes(search.toLowerCase()) ||
      (b.subjects || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const totalCopies = books.reduce((s, b) => s + (b.total_copies || 0), 0)

  const handleSearch = (e: FormEvent) => e.preventDefault()

  return (
    <div className="space-y-6">
      <PageHero
        badge="LIBRARY"
        badgeColor="teal"
        title="Book Catalogue"
        subtitle="Search and browse the school library collection"
        icon="📚"
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white capitalize">Library Catalog</h1>
          <p className="text-slate-400 text-sm mt-1 capitalize">
            {loading ? '…' : books.length} titles · {loading ? '…' : totalCopies} copies total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('grid')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={view === 'grid' ? { background: '#6366f1', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={view === 'list' ? { background: '#6366f1', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, author, or subject…"
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </form>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <button
            key={c} onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize"
            style={category === c
              ? { background: '#6366f1', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} results</p>

          {/* Grid View */}
          {view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map(b => {
                const { from, to, icon } = getColors(b.subjects, b.resource_type)
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border overflow-hidden hover:border-indigo-500/40 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
                  >
                    <div className="h-48 relative">
                      <BookCoverImage isbn={b.isbn} title={b.title} icon={icon} from={from} to={to} />
                      <div className="absolute top-2 right-2">
                        <span
                          className="px-1.5 py-0.5 rounded-md text-xs font-bold backdrop-blur-sm"
                          style={b.available_copies > 0
                            ? { background: 'rgba(0,0,0,0.55)', color: '#34d399' }
                            : { background: 'rgba(0,0,0,0.55)', color: '#f87171' }}
                        >
                          {b.available_copies > 0 ? `${b.available_copies} avail` : 'All Out'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2 capitalize">{b.title}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{b.authors}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-600">{b.publication_year}</span>
                        <button
                          className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={b.available_copies > 0
                            ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }
                            : { background: 'rgba(255,255,255,0.05)', color: '#475569' }}
                        >
                          {b.available_copies > 0 ? 'Borrow' : 'Reserve'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* List View */
            <GlassCard className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Title', 'Author', 'Subject', 'Category', 'Year', 'Copies', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const { from, to, icon } = getColors(b.subjects, b.resource_type)
                    return (
                      <tr key={b.id} className="border-t hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0">
                              <BookCoverImage isbn={b.isbn} title={b.title} icon={icon} from={from} to={to} />
                            </div>
                            <span className="font-semibold text-white capitalize">{b.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{b.authors}</td>
                        <td className="px-4 py-3 text-slate-400">{b.subjects || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>{b.category_name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{b.publication_year}</td>
                        <td className="px-4 py-3 text-slate-400">{b.available_copies}/{b.total_copies}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={b.available_copies > 0
                              ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                              : { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
                          >
                            {b.available_copies > 0 ? 'Available' : 'All Borrowed'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </GlassCard>
          )}
        </>
      )}

      {/* Open Library attribution */}
      <p className="text-center text-xs text-slate-600 flex items-center justify-center gap-1.5">
        <BookOpen size={11} />
        Book covers sourced from Open Library — the world's largest open book catalog
      </p>
    </div>
  )
}
