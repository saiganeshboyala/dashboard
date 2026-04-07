import { useState, useEffect } from 'react'
import { DataTable, Badge, Button, Modal, Input } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getRateLimits, put } from '../../utils/api'
import { RefreshCw, Edit2 } from 'lucide-react'

export default function RateLimitsPage() {
  const toast = useToast()
  const [limits, setLimits] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getRateLimits()
      setLimits(Array.isArray(data) ? data : data?.limits || data?.rateLimits || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const tenantId = editing.tenant_id || editing.tenantId
      await put(`/api/v1/admin/rate-limits/${tenantId}`, {
        requestsPerMinute: form.requests_per_minute,
        requestsPerHour: form.requests_per_hour,
        requestsPerDay: form.requests_per_day,
      })
      toast.success('Rate limit updated')
      setEditing(null); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
      </div>
      <DataTable
        columns={[
          { key: 'tenant_name', label: 'Tenant', render: v => <span className="font-medium">{v || 'Default'}</span> },
          { key: 'tenant_id', label: 'Tenant ID', render: v => <span className="font-mono text-[11px] text-gray-400">{v}</span> },
          { key: 'requests_per_minute', label: 'Req/min', render: v => <span className="tabular-nums font-medium">{v}</span> },
          { key: 'requests_per_hour', label: 'Req/hr', render: v => <span className="tabular-nums">{v}</span> },
          { key: 'requests_per_day', label: 'Req/day', render: v => <span className="tabular-nums">{v}</span> },
          { key: 'actions', label: '', sortable: false, render: (_, r) => (
            <Button size="xs" variant="secondary" onClick={() => { setEditing(r); setForm({ requests_per_minute: r.requests_per_minute, requests_per_hour: r.requests_per_hour, requests_per_day: r.requests_per_day }) }}>
              <Edit2 size={11} /> Edit
            </Button>
          )},
        ]}
        rows={limits}
        loading={loading}
        emptyText="No rate limits configured"
      />

      <Modal open={!!editing} onClose={() => { setEditing(null); setForm({}) }} title="Edit Rate Limit"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setEditing(null); setForm({}) }}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        }>
        <div className="space-y-3">
          <p className="text-[12px] text-gray-500 font-medium bg-gray-50 p-2 rounded">
            {editing?.tenant_name || 'Tenant'} (ID: {editing?.tenant_id || editing?.tenantId})
          </p>
          <Input label="Requests per Minute" type="number" value={form.requests_per_minute || ''} onChange={e => setForm(f => ({ ...f, requests_per_minute: +e.target.value }))} />
          <Input label="Requests per Hour" type="number" value={form.requests_per_hour || ''} onChange={e => setForm(f => ({ ...f, requests_per_hour: +e.target.value }))} />
          <Input label="Requests per Day" type="number" value={form.requests_per_day || ''} onChange={e => setForm(f => ({ ...f, requests_per_day: +e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
