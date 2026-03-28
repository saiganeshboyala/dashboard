import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Select, Input, Button } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAudit } from '../../utils/api'
import { Search, RefreshCw } from 'lucide-react'

const OBJECT_TYPES = ['students', 'submissions', 'interviews', 'recruiters', 'business_units']

export default function AuditTrailPage() {
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [objectType, setObjectType] = useState('students')
  const [objectId, setObjectId] = useState('1')

  const [summary, setSummary] = useState(null)

  const loadSummary = async () => {
    if (!objectId) return
    try {
      const data = await getAudit(objectType, objectId + '&summary=true').catch(() => null)
      // Also try the dedicated summary endpoint
      fetch(`/api/v1/audit/summary?objectType=${objectType}&objectId=${objectId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).then(r => r.json()).then(d => setSummary(d?.summary || d)).catch(() => {})
    } catch (e) {}
  }

  const load = async () => {
    if (!objectId) return
    setLoading(true)
    try {
      const data = await getAudit(objectType, objectId)
      setLogs(Array.isArray(data) ? data : data?.logs || data?.data || [])
    } catch (e) { toast.error('Failed to load audit trail') }
    setLoading(false)
  }

  useEffect(() => { load(); loadSummary() }, [objectType])

  const actionColors = { create: 'green', update: 'blue', delete: 'red', login: 'purple', export: 'amber' }

  return (
    <Page title="Audit Trail" subtitle="Track all changes made across the platform">
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{summary.total_changes || 0}</p>
            <p className="text-[11px] text-gray-400">Total Changes</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{summary.unique_users || 0}</p>
            <p className="text-[11px] text-gray-400">Users</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-[13px] font-medium text-gray-700">{summary.last_modified_by || '—'}</p>
            <p className="text-[11px] text-gray-400">Last Modified By</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <Select value={objectType} onChange={e => setObjectType(e.target.value)} className="w-44">
          {OBJECT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </Select>
        <Input value={objectId} onChange={e => setObjectId(e.target.value)} placeholder="Record ID" className="w-32" />
        <Button variant="secondary" size="sm" onClick={load}><Search size={13} /> Search</Button>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Button>
      </div>

      <DataTable
        columns={[
          { key: 'action', label: 'Action', render: v => <Badge color={actionColors[v] || 'gray'}>{v || 'update'}</Badge> },
          { key: 'field_name', label: 'Field', render: v => v ? <span className="font-mono text-[12px] text-gray-700">{v}</span> : <span className="text-gray-300">—</span> },
          { key: 'old_value', label: 'Old Value', render: v => v != null ? <span className="text-danger-600 text-[12px]">{String(v).slice(0, 40)}</span> : <span className="text-gray-300">—</span> },
          { key: 'new_value', label: 'New Value', render: v => v != null ? <span className="text-success-700 text-[12px]">{String(v).slice(0, 40)}</span> : <span className="text-gray-300">—</span> },
          { key: 'changed_by', label: 'Changed By', render: (v, r) => r.user?.name || v || 'System' },
          { key: 'changed_at', label: 'When', render: v => v ? <span className="text-gray-500 text-[12px]">{new Date(v).toLocaleString()}</span> : '—' },
        ]}
        rows={logs}
        loading={loading}
        emptyText="No audit logs found for this record. Try searching for a specific record ID."
      />
    </Page>
  )
}
