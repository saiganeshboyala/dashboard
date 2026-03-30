import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { get } from '../../utils/api'
import api from '../../utils/api'
import { useObjectColumns } from '../../context/AppConfigContext'
import { Page } from '../ui/Page'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Loading } from '../ui/Loading'
import { Alert } from '../ui/Alert'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { DynamicForm } from './DynamicForm'
import { useDynamicSchema } from '../../hooks/useDynamicSchema'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../context/ToastContext'

const PAGE_SIZE = 50

const OBJECT_ICONS = {
  students: '', submissions: '', interviews: '', business_units: '',
  recruiters: '', clusters: '', placements: '', leads: '',
  cases: '', campaigns: '', expenses: '',
}

const HIDDEN_COLS = new Set(['tenant_id', 'password_hash', 'sf_id', 'created_by', 'owner_id', 'user_id'])

// ─── INLINE CELL EDITOR ──────────────────────────────────────────────────────

function InlineCell({ rowId, fieldKey, value, field, picklists, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = async () => {
    if (draft !== value) await onSave(rowId, fieldKey, draft, value)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  if (!editing) {
    return (
      <span
        className="cursor-text hover:bg-blue-50 hover:rounded px-0.5 transition-colors min-h-[20px] block"
        onDoubleClick={() => { setDraft(value); setEditing(true) }}
        title="Double-click to edit"
      >
        {formatCellValue(fieldKey, value)}
      </span>
    )
  }

  // Render picklist
  const pl = picklists?.[fieldKey]
  if (pl && pl.length > 0) {
    return (
      <select
        ref={inputRef}
        value={draft ?? ''}
        onChange={e => setDraft(e.target.value || null)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full text-[12px] border border-blue-400 rounded px-1 py-0.5 outline-none"
      >
        <option value="">— Select —</option>
        {pl.map(pv => <option key={pv.value} value={pv.value}>{pv.label || pv.value}</option>)}
      </select>
    )
  }

  const ftype = field?.field_type
  if (ftype === 'boolean') {
    return (
      <input type="checkbox" ref={inputRef} checked={!!draft}
        onChange={e => setDraft(e.target.checked)} onBlur={commit}
        className="accent-blue-600" />
    )
  }
  if (ftype === 'date') {
    const dv = draft ? new Date(draft).toISOString().split('T')[0] : ''
    return <input type="date" ref={inputRef} defaultValue={dv}
      onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKeyDown}
      className="w-full text-[12px] border border-blue-400 rounded px-1 py-0.5 outline-none" />
  }
  if (['number', 'decimal', 'currency', 'percent'].includes(ftype)) {
    return <input type="number" ref={inputRef} value={draft ?? ''}
      onChange={e => setDraft(e.target.value !== '' ? Number(e.target.value) : null)}
      onBlur={commit} onKeyDown={handleKeyDown}
      className="w-full text-[12px] border border-blue-400 rounded px-1 py-0.5 outline-none" />
  }
  return (
    <input type="text" ref={inputRef} value={draft ?? ''}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={handleKeyDown}
      className="w-full text-[12px] border border-blue-400 rounded px-1 py-0.5 outline-none" />
  )
}

// ─── CELL FORMATTING ─────────────────────────────────────────────────────────

function formatCellValue(k, v) {
  if (v === null || v === undefined) return <span className="text-gray-300">—</span>
  if (typeof v === 'boolean') return <Badge color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Badge>
  if (k === 'is_active') return <Badge color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Badge>
  if (k.includes('status')) return <Badge color="blue">{String(v)}</Badge>
  if (k.endsWith('_at') || (k.includes('date') && !k.startsWith('up'))) {
    try { return new Date(v).toLocaleDateString() } catch { return String(v) }
  }
  if (k.includes('rate') || k.includes('amount') || k.includes('salary') || k.includes('bill_')) {
    const n = Number(v)
    return isNaN(n) ? String(v) : `$${n.toLocaleString()}`
  }
  if (k.includes('email')) return <span className="text-blue-500 text-[12px]">{String(v)}</span>
  const str = String(v)
  return str.length > 60 ? str.substring(0, 60) + '…' : str
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

/**
 * DynamicList — list page for any object.
 *
 * Props (all optional):
 *   objectName  — from prop or from :objectName route param
 *   basePath    — base path for navigation (default: /head/dynamic/:objectName)
 */
export function DynamicList({ objectName: objectNameProp, basePath: basePathProp }) {
  const { objectName: objectNameParam } = useParams()
  const objectName = objectNameProp || objectNameParam
  const navigate   = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [records, setRecords]       = useState([])
  const [total, setTotal]           = useState(0)
  const [objectLabel, setObjectLabel] = useState('')
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(null)
  const [apiColumns, setApiColumns] = useState([])
  const [search, setSearch]         = useState(searchParams.get('search') || '')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [page, setPage]             = useState(parseInt(searchParams.get('page') || '0'))
  const [sortField, setSortField]   = useState('id')
  const [sortDir, setSortDir]       = useState('desc')

  const [savedViews, setSavedViews]   = useState([])
  const [activeView, setActiveView]   = useState(null)
  const [showViewMenu, setShowViewMenu] = useState(false)
  const [saveViewOpen, setSaveViewOpen] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')

  // Selection & bulk
  const [selected, setSelected]     = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // Inline edit — no separate error state; errors shown via toast

  // Form modal
  const [formOpen, setFormOpen]     = useState(false)
  const [editRecord, setEditRecord] = useState(null)

  const { picklists, fields } = useDynamicSchema(objectName)
  const { perms, hiddenFields } = usePermissions(objectName)
  const configColumns = useObjectColumns(objectName)
  const toast = useToast()

  const canCreate = perms?.canCreate !== false
  const canEdit   = perms?.canEdit   !== false
  const canDelete = perms?.canDelete !== false

  const basePath = basePathProp || `/head/dynamic/${objectName}`
  // When basePath is generic (e.g. /bu/dynamic) and doesn't include objectName,
  // detail navigation must include objectName: /bu/dynamic/students/123
  const detailBase = basePath.endsWith(`/${objectName}`) ? basePath : `${basePath}/${objectName}`

  // Cmd/Ctrl+N → open "New record" form
  useEffect(() => {
    if (!canCreate) return
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setEditRecord(null)
        setFormOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canCreate])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortField,
        sortDir,
        ...(search && { search }),
      })
      const res = await get(`/api/v1/dynamic/${objectName}?${params}`)
      setRecords(res?.records || [])
      setTotal(res?.total || 0)
      setObjectLabel(res?.objectLabel || objectName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      if (res?.columns?.length > 0) setApiColumns(res.columns)
    } catch (e) {
      setLoadError(e.message || 'Failed to load records')
      setRecords([])
    }
    setLoading(false)
  }, [objectName, page, search, sortField, sortDir])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // Reset page + selection + columns on objectName change
  useEffect(() => { setPage(0); setSelected(new Set()); setApiColumns([]) }, [objectName])

  const applyView = useCallback((view) => {
    if (view.sortField) setSortField(view.sortField)
    if (view.sortDir)   setSortDir(view.sortDir === 'desc' ? 'desc' : 'asc')
    setPage(0)
  }, [])

  const loadViews = useCallback(async () => {
    try {
      const res = await get(`/api/v1/schema/list-views?objectName=${objectName}`)
      const views = res?.views || []
      setSavedViews(views)
      const def = views.find(v => v.isDefault)
      if (def && !activeView) {
        applyView(def)
        setActiveView(def)
      }
    } catch {}
  }, [objectName, applyView]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveCurrentView = async () => {
    if (!saveViewName.trim()) return
    try {
      const viewData = {
        objectName,
        name: saveViewName,
        columns: columns.map(c => c.key),
        sortField,
        sortDir,
        isDefault: false,
        sharedWith: 'all',
      }
      await api.post('/api/v1/schema/list-views', viewData)
      setSaveViewOpen(false)
      setSaveViewName('')
      loadViews()
    } catch {}
  }

  useEffect(() => { loadViews() }, [loadViews])

  // Sync URL params
  useEffect(() => {
    const next = {}
    if (page > 0) next.page = String(page)
    if (search) next.search = search
    setSearchParams(next, { replace: true })
  }, [page, search, setSearchParams])

  // Debounce: auto-trigger 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setPage(0)
        setSearch(searchInput)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0)
    setSearch(searchInput)
  }

  const toggleSort = (key) => {
    if (sortField === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(key); setSortDir('desc') }
    setPage(0)
  }

  // ── Inline cell save — optimistic update, rollback on error ───────────────
  const handleCellSave = async (rowId, fieldKey, newVal, oldVal) => {
    // Optimistic: update UI immediately
    setRecords(prev => prev.map(r => r.id === rowId ? { ...r, [fieldKey]: newVal } : r))
    try {
      await api.put(`/api/v1/dynamic/${objectName}/${rowId}`, { [fieldKey]: newVal })
    } catch (e) {
      // Rollback on failure
      setRecords(prev => prev.map(r => r.id === rowId ? { ...r, [fieldKey]: oldVal } : r))
      toast.error(`Save failed: ${e.message}`)
    }
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === records.length) setSelected(new Set())
    else setSelected(new Set(records.map(r => r.id)))
  }

  // ── Bulk delete ────────────────────────────────────────────────────────────
  const bulkDelete = async () => {
    setBulkDeleting(true)
    const ids = [...selected]
    await Promise.all(ids.map(id =>
      api.delete(`/api/v1/dynamic/${objectName}/${id}`).catch(() => {})
    ))
    setBulkDeleting(false)
    setSelected(new Set())
    setConfirmBulkDelete(false)
    fetchRecords()
  }

  // ── Column derivation ──────────────────────────────────────────────────────
  // Priority: (1) API response columns → (2) AppConfig columns → (3) Object.keys fallback
  const toLabel = k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^Id$/, 'ID').replace(/Bu /, 'BU ')

  const columns = useMemo(() => {
    let raw = apiColumns.length > 0
      ? apiColumns
      : configColumns?.length > 0
        ? configColumns
        : records.length > 0
          ? Object.keys(records[0]).filter(k => !HIDDEN_COLS.has(k)).slice(0, 10)
              .map(k => ({ key: k, label: toLabel(k), type: 'text' }))
          : []
    return raw.filter(c => !HIDDEN_COLS.has(c.key) && !hiddenFields.has(c.key))
  }, [apiColumns, configColumns, records, hiddenFields]) // eslint-disable-line react-hooks/exhaustive-deps

  const fieldMap = useMemo(() => {
    const map = {}
    for (const f of fields) map[f.field_name] = f
    return map
  }, [fields])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const icon       = OBJECT_ICONS[objectName] ?? ''

  const pageButtons = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
    const start = Math.max(0, Math.min(page - 3, totalPages - 7))
    return Array.from({ length: 7 }, (_, i) => start + i)
  })()

  return (
    <Page
      title={objectLabel}
      subtitle={`${total.toLocaleString()} record${total !== 1 ? 's' : ''}`}
      actions={
        <div className="flex items-center gap-2">
          {canDelete && selected.size > 0 && (
            <Button variant="danger" size="sm" onClick={() => setConfirmBulkDelete(true)}>
              Delete {selected.size}
            </Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={() => { setEditRecord(null); setFormOpen(true) }}>
              + New {objectLabel.replace(/s$/, '')}
            </Button>
          )}
        </div>
      }
    >
      {loadError && <Alert variant="error" className="mb-3">{loadError}</Alert>}

      {/* View selector */}
      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <button
            onClick={() => setShowViewMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {activeView?.name || 'All Records'}
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {showViewMenu && (
            <div className="absolute z-30 top-full mt-1 left-0 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-xl py-1">
              <div
                className="px-3 py-2 text-[12px] text-gray-700 hover:bg-blue-50 cursor-pointer font-medium"
                onClick={() => { setActiveView(null); setShowViewMenu(false); setSearch(''); setPage(0) }}
              >
                All Records
              </div>
              {savedViews.map(view => (
                <div
                  key={view.id}
                  className={`px-3 py-2 text-[12px] hover:bg-blue-50 cursor-pointer flex items-center justify-between ${activeView?.id === view.id ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                  onClick={() => { applyView(view); setActiveView(view); setShowViewMenu(false) }}
                >
                  <span>{view.name}</span>
                  {view.isDefault && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 rounded-full">default</span>}
                </div>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <div
                  className="px-3 py-2 text-[12px] text-blue-600 hover:bg-blue-50 cursor-pointer"
                  onClick={() => { setShowViewMenu(false); setSaveViewOpen(true) }}
                >
                  + Save current view
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={`Search ${objectLabel.toLowerCase()}…`}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] w-64 outline-none focus:border-blue-400 bg-white"
          />
          <Button type="submit" size="sm">Search</Button>
          {search && (
            <Button type="button" variant="secondary" size="sm"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(0) }}>
              Clear
            </Button>
          )}
        </form>
        <span className="text-[11px] text-gray-400 ml-auto">
          {total === 0 ? 'No records' : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()}`}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-card">
          <div className="mb-4"></div>
          <p className="text-gray-400 text-[13px]">
            No {objectLabel.toLowerCase()} found{search ? ` matching "${search}"` : ''}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* Select all — only shown when delete is permitted */}
                  {canDelete && (
                    <th className="w-8 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.size > 0 && selected.size === records.length}
                        onChange={toggleAll}
                        className="accent-blue-600"
                      />
                    </th>
                  )}
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className="px-3 py-2.5 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap select-none"
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label || toLabel(col.key)}
                        {sortField === col.key && (
                          <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                  {canEdit && <th className="w-16 px-3 py-2.5 text-right font-semibold text-gray-600">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(row => (
                  <tr
                    key={row.id}
                    className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${selected.has(row.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => navigate(`${detailBase}/${row.id}`)}
                  >
                    {/* Checkbox — only when delete is permitted */}
                    {canDelete && (
                      <td className="px-3 py-2" onClick={e => { e.stopPropagation(); toggleRow(row.id) }}>
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} className="accent-blue-600" />
                      </td>
                    )}

                    {columns.map(col => (
                      <td
                        key={col.key}
                        className="px-3 py-2 text-gray-700 max-w-[200px]"
                        onClick={e => {
                          // Only intercept clicks on non-id cols for inline edit
                          if (col.key !== 'id') e.stopPropagation()
                        }}
                      >
                        {col.key === 'id' ? (
                          <span className="text-blue-600 font-semibold">#{row[col.key]}</span>
                        ) : canEdit ? (
                          <InlineCell
                            rowId={row.id}
                            fieldKey={col.key}
                            value={row[col.key]}
                            field={fieldMap[col.key]}
                            picklists={picklists}
                            onSave={handleCellSave}
                          />
                        ) : (
                          formatCellValue(col.key, row[col.key])
                        )}
                      </td>
                    ))}

                    {/* Actions column — only when edit is permitted */}
                    {canEdit && (
                      <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          className="text-[11px] text-blue-600 hover:underline"
                          onClick={() => { setEditRecord(row); setFormOpen(true) }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button onClick={() => setPage(0)} disabled={page === 0}
            className="px-2.5 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">«</button>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
            className="px-2.5 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">‹ Prev</button>

          {pageButtons[0] > 0 && <span className="px-2 text-gray-400 text-[11px]">…</span>}
          {pageButtons.map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 text-[11px] rounded-lg border transition-colors font-medium ${
                p === page ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {p + 1}
            </button>
          ))}
          {pageButtons[pageButtons.length - 1] < totalPages - 1 && <span className="px-2 text-gray-400 text-[11px]">…</span>}

          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-2.5 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">Next ›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
            className="px-2.5 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">»</button>
        </div>
      )}

      {/* Create / Edit modal */}
      <DynamicForm
        objectName={objectName}
        record={editRecord}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRecord(null) }}
        onSaved={() => fetchRecords()}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selected.size} record${selected.size !== 1 ? 's' : ''}?`}
        description="This action cannot be undone."
        danger
        loading={bulkDeleting}
        onConfirm={bulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      {/* Save View Modal */}
      {saveViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-80 p-6">
            <h3 className="text-[14px] font-bold text-gray-900 mb-4">Save Current View</h3>
            <input
              type="text"
              value={saveViewName}
              onChange={e => setSaveViewName(e.target.value)}
              placeholder="View name (e.g. 'In Market Students')"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400 mb-4"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveCurrentView()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveViewOpen(false)} className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={saveCurrentView} className="px-4 py-2 text-[13px] bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
