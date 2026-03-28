import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../utils/auth'
import { Search, X, User, FileText, Calendar, Users, Building2 } from 'lucide-react'

const ICONS = { students: User, submissions: FileText, interviews: Calendar, recruiters: Users, businessUnits: Building2 }
const COLORS = { students:'bg-blue-100 text-blue-600', submissions:'bg-purple-100 text-purple-600', interviews:'bg-amber-100 text-amber-600', recruiters:'bg-teal-100 text-teal-600', businessUnits:'bg-gray-100 text-gray-600' }

function getTitle(type, r) {
  if (type === 'students') return `${r.firstName} ${r.lastName || ''}`
  if (type === 'submissions') return r.clientName || 'Submission'
  if (type === 'interviews') return r.clientName || 'Interview'
  if (type === 'recruiters') return r.user?.name || r.name || 'Recruiter'
  if (type === 'businessUnits') return r.name || 'BU'
  return 'Record'
}

function getSub(type, r) {
  if (type === 'students') return [r.technology, r.marketingStatus].filter(Boolean).join(' · ')
  if (type === 'submissions') return [r.vendorCompany, r.rate ? `$${r.rate}/hr` : null].filter(Boolean).join(' · ')
  if (type === 'interviews') return [r.interviewType, r.finalStatus || 'Pending'].filter(Boolean).join(' · ')
  if (type === 'recruiters') return r.user?.email || r.email || ''
  return ''
}

export default function GlobalSearch({ basePath = '/head' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    const fn = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])

  useEffect(() => {
    if (query.length < 2) { setResults(null); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}&limit=8`, { headers: { Authorization: `Bearer ${getToken()}` } })
        setResults(await res.json()); setIdx(0)
      } catch {} finally { setLoading(false) }
    }, 280)
  }, [query])

  const close = () => { setOpen(false); setQuery(''); setResults(null) }

  const flat = results ? Object.entries(results.results || {}).flatMap(([type, g]) => g.records.map(r => ({ type, record: r }))) : []

  const select = (type, record) => {
    close()
    const map = { submissions: 'submissions', interviews: 'interviews', recruiters: 'recruiters', students: 'students', businessUnits: 'bus' }
    if (type === 'businessUnits') nav(`${basePath}/bus`)
    else nav(`${basePath}/records/${map[type]}/${record.id}`)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-gray-500 transition-colors">
        <Search size={13} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-600">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]" onClick={close}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-modal border border-gray-200 overflow-hidden anim-scale mx-4">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, flat.length - 1)) }
                  if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
                  if (e.key === 'Enter' && flat[idx]) select(flat[idx].type, flat[idx].record)
                }}
                placeholder="Search students, submissions, interviews..."
                className="flex-1 text-[13px] outline-none text-gray-900 placeholder-gray-400" />
              {query && <button onClick={() => { setQuery(''); setResults(null) }}><X size={14} className="text-gray-300 hover:text-gray-500" /></button>}
              {loading && <div className="w-4 h-4 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {results && !results.total && <p className="px-4 py-8 text-center text-[13px] text-gray-400">No results for "{query}"</p>}
              {results && Object.entries(results.results || {}).map(([type, group]) => {
                if (!group.count) return null
                const Icon = ICONS[type] || User
                const col = COLORS[type] || COLORS.students
                return (
                  <div key={type}>
                    <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{type.replace(/([A-Z])/g, ' $1')} ({group.count})</span>
                    </div>
                    {group.records.map((record, ri) => {
                      const gi = flat.findIndex(f => f.type === type && f.record.id === record.id)
                      return (
                        <button key={record.id} onClick={() => select(type, record)} onMouseEnter={() => setIdx(gi)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${gi === idx ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${col}`}><Icon size={13} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 truncate">{getTitle(type, record)}</p>
                            <p className="text-[11px] text-gray-400 truncate">{getSub(type, record)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
              {!results && query.length < 2 && <p className="px-4 py-8 text-center text-[13px] text-gray-400">Type at least 2 characters</p>}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex gap-4 text-[10px] text-gray-400">
              <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-500">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-500">↵</kbd> Open</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-500">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
