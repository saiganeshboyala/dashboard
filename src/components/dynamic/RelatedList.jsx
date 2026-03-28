import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../../utils/api'
import { DataTable } from '../ui/DataTable'
import { Loading } from '../ui/Loading'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

const HIDDEN = new Set(['tenant_id', 'password_hash', 'sf_id', 'created_by', 'owner_id', 'user_id'])

/**
 * Shows related records for a parent record.
 *
 * Props:
 *   relatedObject     — e.g. 'submissions'
 *   parentObjectName  — e.g. 'students'
 *   parentId          — the parent record id
 *   label             — display label e.g. 'Submissions'
 *   onNewClick        — optional callback to open DynamicForm for creating related record
 */
export function RelatedList({ relatedObject, parentObjectName, parentId, label, onNewClick }) {
  const navigate = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setLoading(true)
    get(`/api/v1/dynamic/${parentObjectName}/${parentId}/related/${relatedObject}?limit=5`)
      .then(res => setData(res || { records: [], total: 0 }))
      .catch(() => setData({ records: [], total: 0 }))
      .finally(() => setLoading(false))
  }, [parentObjectName, parentId, relatedObject])

  const fetchAll = () => {
    setLoading(true)
    get(`/api/v1/dynamic/${parentObjectName}/${parentId}/related/${relatedObject}?limit=200`)
      .then(res => { setData(res || { records: [], total: 0 }); setShowAll(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (loading) return <div className="py-8"><Loading /></div>

  const records = data?.records || []
  const total   = data?.total || 0

  if (records.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-gray-400">
        No {label?.toLowerCase() || relatedObject} records
        {onNewClick && (
          <div className="mt-3">
            <Button size="sm" onClick={onNewClick}>+ New</Button>
          </div>
        )}
      </div>
    )
  }

  // Auto-detect columns from first record (max 7)
  const columns = Object.keys(records[0])
    .filter(k => !HIDDEN.has(k))
    .slice(0, 7)
    .map(k => ({
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        .replace(/^Id$/, 'ID').replace(/Bu /, 'BU '),
      render: (v) => {
        if (v === null || v === undefined) return <span className="text-gray-300">—</span>
        if (typeof v === 'boolean') return <Badge color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Badge>
        if (k.includes('status')) return <Badge color="blue">{String(v)}</Badge>
        if (k.endsWith('_at') || k.includes('date')) {
          try { return new Date(v).toLocaleDateString() } catch { return String(v) }
        }
        if (k.includes('rate') || k.includes('amount') || k.includes('salary')) {
          const n = Number(v)
          return isNaN(n) ? String(v) : `$${n.toLocaleString()}`
        }
        return String(v).substring(0, 80)
      },
    }))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-gray-500">{total} record{total !== 1 ? 's' : ''}</span>
        <div className="flex gap-2">
          {!showAll && total > 5 && (
            <Button size="xs" variant="ghost" onClick={fetchAll}>View All {total}</Button>
          )}
          {onNewClick && <Button size="xs" onClick={onNewClick}>+ New</Button>}
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={records}
        searchable={false}
        onRowClick={(row) => navigate(`/head/dynamic/${relatedObject}/${row.id}`)}
      />
    </div>
  )
}
