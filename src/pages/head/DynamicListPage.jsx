import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Page, DataTable, Badge, Loading, Button } from '../../components/Shared'
import { get } from '../../utils/api'

const OBJECT_ICONS = {
  students: '👤', submissions: '📄', interviews: '📅', business_units: '🏢',
  recruiters: '👥', clusters: '🌐', placements: '💼', leads: '🎯',
  cases: '📋', campaigns: '📣', expenses: '💰',
}

const PAGE_SIZE = 50

export default function DynamicListPage() {
  const { objectName } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [objectLabel, setObjectLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '0'))

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortField: 'id',
        sortDir: 'desc',
        ...(search && { search }),
      })
      const res = await get(`/api/v1/dynamic/${objectName}?${params}`)
      setRecords(res?.records || [])
      setTotal(res?.total || 0)
      setObjectLabel(res?.objectLabel || objectName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    } catch (e) {
      console.error('Failed to load records:', e)
      setRecords([])
    }
    setLoading(false)
  }, [objectName, page, search])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // Sync page + search to URL
  useEffect(() => {
    const next = {}
    if (page > 0) next.page = String(page)
    if (search) next.search = search
    setSearchParams(next, { replace: true })
  }, [page, search, setSearchParams])

  // Auto-detect columns from first record
  const columns = records.length > 0
    ? Object.keys(records[0])
        .filter(k => !['tenant_id', 'password_hash', 'sf_id', 'created_by', 'owner_id', 'user_id'].includes(k))
        .slice(0, 10)
        .map(k => ({
          key: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            .replace(/^Id$/, 'ID').replace(/Bu /, 'BU '),
          render: (v) => {
            if (k === 'id') return (
              <span className="text-blue-600 font-semibold cursor-pointer hover:underline"
                onClick={(e) => { e.stopPropagation(); navigate(`/head/dynamic/${objectName}/${v}`) }}>
                #{v}
              </span>
            )
            if (v === null || v === undefined) return <span className="text-gray-300">—</span>
            if (typeof v === 'boolean') return <Badge color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Badge>
            if (k === 'is_active') return <Badge color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Badge>
            if (k.includes('status')) return <Badge color="blue">{String(v)}</Badge>
            if (k.includes('date') || k.includes('_at')) {
              try { return new Date(v).toLocaleDateString() } catch { return String(v) }
            }
            if (k.includes('rate') || k.includes('amount') || k.includes('salary')) {
              const num = Number(v)
              return isNaN(num) ? String(v) : `$${num.toLocaleString()}`
            }
            if (k.includes('email')) return <span className="text-blue-500">{String(v)}</span>
            const str = String(v)
            return str.length > 50 ? str.substring(0, 50) + '...' : str
          },
        }))
    : []

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const icon = OBJECT_ICONS[objectName] || '📦'

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0)
  }

  // Page number window: show up to 7 page buttons around current page
  const pageButtons = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
    const start = Math.max(0, Math.min(page - 3, totalPages - 7))
    return Array.from({ length: 7 }, (_, i) => start + i)
  })()

  return (
    <Page
      title={`${icon} ${objectLabel}`}
      subtitle={`${total.toLocaleString()} record${total !== 1 ? 's' : ''}`}
      actions={
        <Button onClick={() => navigate(`/head/dynamic/${objectName}/new`)}>+ New Record</Button>
      }
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${objectLabel}...`}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-64 outline-none focus:border-blue-400 bg-white"
          />
          <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition-colors">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setPage(0) }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 bg-white transition-colors">
              Clear
            </button>
          )}
        </form>
        <span className="text-[11px] text-gray-400 ml-auto">
          Showing {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
        </span>
      </div>

      {/* Table */}
      {loading ? <Loading /> : records.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-card">
          <div className="text-4xl mb-4">{icon}</div>
          <p className="text-gray-400 text-[13px]">
            No {objectLabel.toLowerCase()} found{search ? ` matching "${search}"` : ''}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={records}
          searchable={false}
          onRowClick={(row) => navigate(`/head/dynamic/${objectName}/${row.id}`)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button
            onClick={() => setPage(0)} disabled={page === 0}
            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            «
          </button>
          <button
            onClick={() => setPage(p => p - 1)} disabled={page === 0}
            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ‹ Prev
          </button>

          {pageButtons[0] > 0 && (
            <span className="px-2 text-gray-400 text-[12px]">…</span>
          )}
          {pageButtons.map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 text-[12px] rounded-lg border transition-colors font-medium ${
                p === page
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {p + 1}
            </button>
          ))}
          {pageButtons[pageButtons.length - 1] < totalPages - 1 && (
            <span className="px-2 text-gray-400 text-[12px]">…</span>
          )}

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next ›
          </button>
          <button
            onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
            className="px-2.5 py-1.5 text-[12px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            »
          </button>
        </div>
      )}
    </Page>
  )
}
