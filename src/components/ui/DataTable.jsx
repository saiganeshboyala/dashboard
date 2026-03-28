import { useState, useEffect, useCallback } from 'react'
import {
  Search, X, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Download,
} from 'lucide-react'

/**
 * DataTable — production-grade sortable, searchable, paginated table.
 *
 * Props:
 *   columns          array  — [{ key, label, render?, sortable? }]
 *   rows / data      array  — record array (accepts either prop name)
 *   onRowClick       fn     — called with row object
 *   searchable       bool   — show built-in search (default true)
 *   pageSize         number — rows per page (default 20)
 *   loading          bool   — show skeleton
 *   emptyText        string — empty state message
 *   actions          node   — extra elements in the header bar
 *   selectable       bool   — show checkboxes
 *   onSelectionChange fn    — called with selected row array
 *   exportFilename   string — if set, shows Export CSV button
 *   stickyHeader     bool   — sticky column headers
 */
export function DataTable({
  columns = [],
  rows,
  data,                       // alias for rows — normalize below
  onRowClick,
  searchable = true,
  pageSize = 20,
  loading = false,
  emptyText = 'No records found',
  actions,
  selectable = false,
  onSelectionChange,
  exportFilename,
  stickyHeader = false,
}) {
  // Accept both "rows" and "data" props — always normalize to array
  const allRows = Array.isArray(rows) ? rows : Array.isArray(data) ? data : []

  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(0)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [selected, setSelected] = useState(new Set())

  // Reset to page 0 whenever search or data changes
  useEffect(() => { setPage(0) }, [search, allRows.length])

  const filtered = (() => {
    let d = [...allRows]
    if (searchable && search.trim()) {
      const q = search.toLowerCase()
      d = d.filter(r => JSON.stringify(r).toLowerCase().includes(q))
    }
    if (sortKey) {
      d.sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return d
  })()

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice(page * pageSize, (page + 1) * pageSize)

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleAll() {
    const pageIdxs = new Set(paginated.map((_, i) => i + page * pageSize))
    const allSelected = paginated.every((_, i) => selected.has(i + page * pageSize))
    const next = new Set(selected)
    if (allSelected) pageIdxs.forEach(i => next.delete(i))
    else             pageIdxs.forEach(i => next.add(i))
    setSelected(next)
    onSelectionChange?.(Array.from(next).map(i => allRows[i]).filter(Boolean))
  }

  function toggleRow(globalIdx) {
    const next = new Set(selected)
    if (next.has(globalIdx)) next.delete(globalIdx)
    else                     next.add(globalIdx)
    setSelected(next)
    onSelectionChange?.(Array.from(next).map(i => allRows[i]).filter(Boolean))
  }

  // Export CSV
  const handleExport = useCallback(() => {
    const visibleCols = columns.filter(c => c.key !== 'actions')
    const header = visibleCols.map(c => c.label).join(',')
    const body   = filtered.map(row =>
      visibleCols.map(c => {
        const v = row[c.key]
        if (v == null) return ''
        const s = String(v).replace(/"/g, '""')
        return s.includes(',') ? `"${s}"` : s
      }).join(',')
    ).join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${exportFilename || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered, columns, exportFilename])

  // Page number window (max 7 buttons)
  const pageButtons = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
    const start = Math.max(0, Math.min(page - 3, totalPages - 7))
    return Array.from({ length: 7 }, (_, i) => start + i)
  })()

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* ── Toolbar ── */}
      {(searchable || actions || exportFilename) && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50 flex-wrap">
          {searchable && (
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          <span className="text-[11px] text-gray-400 ml-auto tabular-nums">
            {filtered.length.toLocaleString()} record{filtered.length !== 1 ? 's' : ''}
          </span>
          {exportFilename && (
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
              <Download size={13} />
              Export
            </button>
          )}
          {actions}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-white' : ''}>
            <tr className="border-b border-gray-100">
              {selectable && (
                <th className="table-th w-10">
                  <input
                    type="checkbox"
                    onChange={toggleAll}
                    checked={paginated.length > 0 && paginated.every((_, i) => selected.has(i + page * pageSize))}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map(c => (
                <th key={c.key} className="table-th">
                  {c.sortable !== false ? (
                    <button onClick={() => toggleSort(c.key)}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors whitespace-nowrap">
                      {c.label}
                      <span className="text-gray-300">
                        {sortKey === c.key
                          ? sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                          : <ArrowUpDown size={10} />}
                      </span>
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((row, i) => {
              const globalIdx = i + page * pageSize
              return (
                <tr
                  key={row.id ?? globalIdx}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'transition-colors group',
                    onRowClick ? 'cursor-pointer hover:bg-brand-50/40' : 'hover:bg-gray-50/60',
                    selected.has(globalIdx) ? 'bg-brand-50/30' : '',
                  ].join(' ')}
                >
                  {selectable && (
                    <td className="table-td w-10" onClick={e => { e.stopPropagation(); toggleRow(globalIdx) }}>
                      <input type="checkbox" checked={selected.has(globalIdx)} onChange={() => {}}
                        className="rounded border-gray-300" />
                    </td>
                  )}
                  {columns.map(c => (
                    <td key={c.key} className="table-td">
                      {c.render
                        ? c.render(row[c.key], row)
                        : row[c.key] != null
                          ? String(row[c.key])
                          : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              )
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-16 text-center">
                  <p className="text-[13px] text-gray-400">{emptyText}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 flex-wrap gap-2">
          <span className="text-[11px] text-gray-400 tabular-nums">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            {/* First */}
            <button onClick={() => setPage(0)} disabled={page === 0}
              className="px-2 py-1 text-[11px] rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              «
            </button>
            {/* Prev */}
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={13} />
            </button>

            {/* Ellipsis left */}
            {pageButtons[0] > 0 && <span className="px-1 text-gray-400 text-[11px]">…</span>}

            {/* Page number buttons */}
            {pageButtons.map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={[
                  'w-7 h-7 text-[11px] rounded border font-medium transition-colors',
                  p === page
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                ].join(' ')}>
                {p + 1}
              </button>
            ))}

            {/* Ellipsis right */}
            {pageButtons[pageButtons.length - 1] < totalPages - 1 &&
              <span className="px-1 text-gray-400 text-[11px]">…</span>}

            {/* Next */}
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={13} />
            </button>
            {/* Last */}
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
              className="px-2 py-1 text-[11px] rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
