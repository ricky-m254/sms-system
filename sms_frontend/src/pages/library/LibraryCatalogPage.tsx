import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search, Grid3X3, List, BookOpen } from 'lucide-react'
import PageHero from '../../components/PageHero'

const CATEGORIES = ['All', 'Textbooks', 'Literature', 'Reference', 'Science', 'Humanities', 'Language', 'Mathematics', 'Technology', 'Fiction']

/* ISBNs that have real Open Library covers are marked with real-world ISBNs */
const BOOKS = [
  /* ── KLB Mathematics ── */
  { id: 1,  title: 'KLB Mathematics Form 1', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Mathematics', isbn: '9789966100237', year: 2022, copies: 8, available: 5, from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  { id: 2,  title: 'KLB Mathematics Form 2', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Mathematics', isbn: '9789966100244', year: 2022, copies: 8, available: 3, from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  { id: 3,  title: 'KLB Mathematics Form 3', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Mathematics', isbn: '9789966100251', year: 2022, copies: 5, available: 2, from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  { id: 4,  title: 'KLB Mathematics Form 4', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Mathematics', isbn: '9789966100268', year: 2023, copies: 5, available: 4, from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  /* ── KLB Science ── */
  { id: 5,  title: 'KLB Biology Form 1', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Biology', isbn: '9789966100275', year: 2022, copies: 8, available: 6, from: '#166534', to: '#22c55e', icon: '🧬' },
  { id: 6,  title: 'KLB Biology Form 2', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Biology', isbn: '9789966100282', year: 2022, copies: 8, available: 3, from: '#166534', to: '#22c55e', icon: '🧬' },
  { id: 7,  title: 'KLB Biology Form 3', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Biology', isbn: '9789966100299', year: 2023, copies: 6, available: 4, from: '#166534', to: '#22c55e', icon: '🧬' },
  { id: 8,  title: 'KLB Chemistry Form 2', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Chemistry', isbn: '9789966100312', year: 2022, copies: 7, available: 2, from: '#581c87', to: '#a855f7', icon: '⚗️' },
  { id: 9,  title: 'KLB Chemistry Form 3', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Chemistry', isbn: '9789966100329', year: 2023, copies: 6, available: 2, from: '#581c87', to: '#a855f7', icon: '⚗️' },
  { id: 10, title: 'KLB Physics Form 2', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Physics', isbn: '9789966100336', year: 2022, copies: 7, available: 4, from: '#0c4a6e', to: '#0ea5e9', icon: '⚡' },
  { id: 11, title: 'KLB Physics Form 3', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Physics', isbn: '9789966100343', year: 2023, copies: 6, available: 0, from: '#0c4a6e', to: '#0ea5e9', icon: '⚡' },
  /* ── African / Kenyan Literature — REAL ISBNs → Open Library covers ── */
  { id: 12, title: 'Things Fall Apart', author: 'Chinua Achebe', category: 'Literature', subject: 'English', isbn: '9780385474542', year: 1958, copies: 4, available: 1, from: '#065f46', to: '#10b981', icon: '📖' },
  { id: 13, title: 'A Grain of Wheat', author: 'Ngũgĩ wa Thiong\'o', category: 'Literature', subject: 'English', isbn: '9780435906856', year: 1967, copies: 3, available: 0, from: '#065f46', to: '#10b981', icon: '🌾' },
  { id: 14, title: 'The River Between', author: 'Ngũgĩ wa Thiong\'o', category: 'Literature', subject: 'English', isbn: '9780435908843', year: 1965, copies: 3, available: 2, from: '#065f46', to: '#10b981', icon: '🌊' },
  { id: 15, title: 'Blossoms of the Savannah', author: 'Henry R. Ole Kulet', category: 'Literature', subject: 'English', isbn: '9789966254313', year: 2008, copies: 6, available: 4, from: '#065f46', to: '#10b981', icon: '🌸' },
  { id: 16, title: 'Weep Not, Child', author: 'Ngũgĩ wa Thiong\'o', category: 'Literature', subject: 'English', isbn: '9780435906863', year: 1964, copies: 4, available: 3, from: '#065f46', to: '#10b981', icon: '📚' },
  { id: 17, title: 'The Caucasian Chalk Circle', author: 'Bertolt Brecht', category: 'Literature', subject: 'English', isbn: '9780140481570', year: 1944, copies: 3, available: 2, from: '#065f46', to: '#10b981', icon: '🎭' },
  { id: 18, title: 'I Will Marry When I Want', author: 'Ngũgĩ wa Thiong\'o', category: 'Literature', subject: 'Kiswahili', isbn: '9780435908874', year: 1977, copies: 3, available: 1, from: '#92400e', to: '#f59e0b', icon: '💍' },
  /* ── Classic World Literature — REAL ISBNs ── */
  { id: 19, title: 'Animal Farm', author: 'George Orwell', category: 'Fiction', subject: 'English', isbn: '9780451526342', year: 1945, copies: 5, available: 3, from: '#713f12', to: '#eab308', icon: '🐷' },
  { id: 20, title: 'The Merchant of Venice', author: 'William Shakespeare', category: 'Literature', subject: 'English', isbn: '9780521535175', year: 1600, copies: 4, available: 2, from: '#292524', to: '#78716c', icon: '⚖️' },
  { id: 21, title: 'Lord of the Flies', author: 'William Golding', category: 'Fiction', subject: 'English', isbn: '9780571191475', year: 1954, copies: 3, available: 1, from: '#7c2d12', to: '#f97316', icon: '🐚' },
  { id: 22, title: 'The Old Man and the Sea', author: 'Ernest Hemingway', category: 'Fiction', subject: 'English', isbn: '9780684801223', year: 1952, copies: 3, available: 2, from: '#1e3a5f', to: '#64748b', icon: '🎣' },
  { id: 23, title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Fiction', subject: 'English', isbn: '9780141439518', year: 1813, copies: 2, available: 2, from: '#065f46', to: '#10b981', icon: '💝' },
  /* ── Kiswahili ── */
  { id: 24, title: 'Kiswahili Sanifu Form 3', author: 'Oxford University Press', category: 'Textbooks', subject: 'Kiswahili', isbn: '9780195730883', year: 2021, copies: 6, available: 0, from: '#92400e', to: '#f59e0b', icon: '🗣️' },
  { id: 25, title: 'Kigogo', author: 'Ganzel Mwangi', category: 'Literature', subject: 'Kiswahili', isbn: '9789966468956', year: 2010, copies: 4, available: 3, from: '#92400e', to: '#f59e0b', icon: '🦁' },
  { id: 26, title: 'Tumbo Lisiloshiba', author: 'Ben J. Hanson', category: 'Literature', subject: 'Kiswahili', isbn: '9789966254689', year: 2009, copies: 3, available: 2, from: '#92400e', to: '#f59e0b', icon: '🍲' },
  /* ── Humanities ── */
  { id: 27, title: 'Longman History & Govt Form 3', author: 'Longman Kenya', category: 'Textbooks', subject: 'History', isbn: '9789966451186', year: 2022, copies: 5, available: 3, from: '#7c2d12', to: '#f97316', icon: '🏛️' },
  { id: 28, title: 'Oxford Geography Form 3', author: 'Oxford Kenya', category: 'Textbooks', subject: 'Geography', isbn: '9780195476804', year: 2022, copies: 5, available: 2, from: '#14532d', to: '#84cc16', icon: '🌍' },
  { id: 29, title: 'Kenya Schools Atlas', author: 'Macmillan Kenya', category: 'Reference', subject: 'Geography', isbn: '9789966190970', year: 2021, copies: 3, available: 2, from: '#14532d', to: '#84cc16', icon: '🗺️' },
  { id: 30, title: 'CRE Form 3', author: 'Longman Kenya', category: 'Textbooks', subject: 'CRE', isbn: '9789966451230', year: 2022, copies: 4, available: 3, from: '#713f12', to: '#eab308', icon: '✝️' },
  { id: 31, title: 'Agriculture Form 2', author: 'KICD Kenya', category: 'Textbooks', subject: 'Agriculture', isbn: '9789966451056', year: 2021, copies: 4, available: 2, from: '#052e16', to: '#16a34a', icon: '🌱' },
  /* ── Technology & Business ── */
  { id: 32, title: 'Computer Studies for Secondary', author: 'KICD Kenya', category: 'Technology', subject: 'Computer Studies', isbn: '9789966451001', year: 2023, copies: 4, available: 3, from: '#1e1b4b', to: '#6366f1', icon: '💻' },
  { id: 33, title: 'Business Studies Form 4', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'Business', isbn: '9789966100789', year: 2022, copies: 4, available: 2, from: '#1e3a5f', to: '#64748b', icon: '💼' },
  { id: 34, title: 'Entrepreneurship Form 3', author: 'KICD Kenya', category: 'Textbooks', subject: 'Business', isbn: '9789966451063', year: 2022, copies: 3, available: 3, from: '#1e3a5f', to: '#64748b', icon: '💡' },
  /* ── Reference ── */
  { id: 35, title: 'The Oxford English Dictionary', author: 'Oxford University Press', category: 'Reference', subject: 'English', isbn: '9780198611868', year: 2020, copies: 2, available: 2, from: '#292524', to: '#78716c', icon: '📕' },
  { id: 36, title: 'Collins English Dictionary', author: 'Collins', category: 'Reference', subject: 'English', isbn: '9780008309374', year: 2019, copies: 3, available: 3, from: '#292524', to: '#78716c', icon: '📗' },
  { id: 37, title: 'Oxford Dictionary of Mathematics', author: 'Oxford University Press', category: 'Reference', subject: 'Mathematics', isbn: '9780199679591', year: 2014, copies: 2, available: 2, from: '#1d4ed8', to: '#3b82f6', icon: '📘' },
  { id: 38, title: 'Oral Literature in Africa', author: 'Ruth Finnegan', category: 'Reference', subject: 'English', isbn: '9780198121497', year: 2012, copies: 2, available: 0, from: '#292524', to: '#78716c', icon: '📜' },
  { id: 39, title: 'The Golden Drum', author: 'Various Authors', category: 'Fiction', subject: 'English', isbn: '9789966251671', year: 2015, copies: 3, available: 2, from: '#713f12', to: '#eab308', icon: '🥁' },
  { id: 40, title: 'Longman English Form 4', author: 'Longman Kenya', category: 'Textbooks', subject: 'English', isbn: '9789966451414', year: 2022, copies: 5, available: 3, from: '#065f46', to: '#10b981', icon: '📖' },
  /* ── Additional books for 42 total ── */
  { id: 41, title: 'KLB English Form 3', author: 'Kenya Literature Bureau', category: 'Textbooks', subject: 'English', isbn: '9789966100350', year: 2022, copies: 6, available: 4, from: '#065f46', to: '#10b981', icon: '📝' },
  { id: 42, title: 'A Doll\'s House', author: 'Henrik Ibsen', category: 'Literature', subject: 'English', isbn: '9780486270623', year: 1879, copies: 3, available: 2, from: '#1e1b4b', to: '#6366f1', icon: '🏠' },
]

type ViewMode = 'grid' | 'list'

function BookCoverImage({ isbn, title, icon, from, to }: {
  isbn: string; title: string; icon: string; from: string; to: string
}) {
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading')
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`

  return (
    <div className="relative w-full h-full overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}>
      {imgState !== 'error' && (
        <img
          src={url}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: imgState === 'ok' ? 1 : 0 }}
          onLoad={() => setImgState('ok')}
          onError={() => setImgState('error')}
        />
      )}
      {imgState !== 'ok' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <span className="text-4xl drop-shadow-md">{icon}</span>
        </div>
      )}
    </div>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

export default function LibraryCatalogPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [view, setView] = useState<ViewMode>('grid')

  const filtered = BOOKS.filter(b => {
    const matchCat = category === 'All' || b.category === category
    const matchSearch = search === '' ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.subject.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleSearch = (e: FormEvent) => e.preventDefault()
  const totalCopies = BOOKS.reduce((s, b) => s + b.copies, 0)

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
            {BOOKS.length} titles · {totalCopies} copies total · With Open Library covers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('grid')} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={view === 'grid' ? { background: '#6366f1', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setView('list')} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={view === 'list' ? { background: '#6366f1', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, author, or subject…"
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
      </form>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize"
            style={category === c
              ? { background: '#6366f1', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
            {c}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-400">{filtered.length} results</p>

      {/* Grid View */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(b => (
            <div key={b.id}
              className="rounded-2xl border overflow-hidden hover:border-indigo-500/40 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Cover */}
              <div className="h-48 relative">
                <BookCoverImage isbn={b.isbn} title={b.title} icon={b.icon} from={b.from} to={b.to} />
                {/* Availability badge */}
                <div className="absolute top-2 right-2">
                  <span className="px-1.5 py-0.5 rounded-md text-xs font-bold backdrop-blur-sm"
                    style={b.available > 0
                      ? { background: 'rgba(0,0,0,0.55)', color: '#34d399' }
                      : { background: 'rgba(0,0,0,0.55)', color: '#f87171' }}>
                    {b.available > 0 ? `${b.available} avail` : 'All Out'}
                  </span>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2 capitalize">{b.title}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{b.author}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-600">{b.year}</span>
                  <button className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={b.available > 0
                      ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#475569' }}>
                    {b.available > 0 ? 'Borrow' : 'Reserve'}
                  </button>
                </div>
              </div>
            </div>
          ))}
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
              {filtered.map(b => (
                <tr key={b.id} className="border-t hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0">
                        <BookCoverImage isbn={b.isbn} title={b.title} icon={b.icon} from={b.from} to={b.to} />
                      </div>
                      <span className="font-semibold text-white capitalize">{b.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{b.author}</td>
                  <td className="px-4 py-3 text-slate-400">{b.subject}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>{b.category}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.year}</td>
                  <td className="px-4 py-3 text-slate-400">{b.available}/{b.copies}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={b.available > 0
                        ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                        : { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                      {b.available > 0 ? 'Available' : 'All Borrowed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Open Library attribution */}
      <p className="text-center text-xs text-slate-600 flex items-center justify-center gap-1.5">
        <BookOpen size={11} />
        Book covers sourced from Open Library — the world's largest open book catalog
      </p>
    </div>
  )
}
