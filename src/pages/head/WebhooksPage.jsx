import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, ConfirmDialog, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get, post, del } from '../../utils/api'
import { Plus, RefreshCw, Trash2, Eye, Zap, CheckCircle, XCircle } from 'lucide-react'

const EVENTS = [
  'student.created', 'student.updated', 'student.deleted',
  'submission.created', 'submission.updated',
  'interview.created', 'interview.result_updated',
  'placement.confirmed', 'lead.converted', 'case.created',
]

export default function WebhooksPage() {
  const toast = useToast()
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [logsModal, setLogsModal] = useState(null)
  const [logs, setLogs] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ events: [] })

  const load = async () => {
    setLoading(true)
    try {
      const data = await get('/api/v1/webhooks')
      setWebhooks(Array.isArray(data) ? data : data?.webhooks || data?.data || [])
    } catch (e) { toast.error('Failed to load webhooks') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.url || !form.events?.length) return toast.error('URL and at least one event are required')
    setCreating(true)
    try {
      await post('/api/v1/webhooks', form)
      toast.success('Webhook created')
      setShowCreate(false); setForm({ events: [] }); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleDelete = async (wh) => {
    setDeleting(true)
    try {
      await del(`/api/v1/webhooks/${wh.id}`)
      toast.success('Webhook deleted')
      setConfirmDelete(null); load()
    } catch (e) { toast.error(e.message) }
    setDeleting(false)
  }

  const loadLogs = async (wh) => {
    setLogsModal(wh)
    try {
      const data = await get(`/api/v1/webhooks/${wh.id}/logs`)
      setLogs(Array.isArray(data) ? data : data?.logs || [])
    } catch (e) { setLogs([]) }
  }

  const toggleEvent = (event) => {
    setForm(f => ({
      ...f,
      events: f.events?.includes(event)
        ? f.events.filter(e => e !== event)
        : [...(f.events || []), event],
    }))
  }

  return (
    <Page
      title="Webhooks"
      subtitle="HTTP callbacks triggered by platform events"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Webhook</Button>
        </div>
      }
    >
      <Alert type="info" className="mb-5">
        Webhooks send a POST request to your URL whenever a subscribed event occurs. Each delivery includes a JSON payload and a signature header for verification.
      </Alert>

      <DataTable
        columns={[
          {
            key: 'url', label: 'Endpoint',
            render: v => (
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-brand-500 shrink-0" />
                <span className="font-mono text-[12px] text-gray-800 truncate max-w-[280px]">{v}</span>
              </div>
            ),
          },
          {
            key: 'events', label: 'Events',
            render: v => {
              const list = Array.isArray(v) ? v : []
              return (
                <div className="flex flex-wrap gap-1">
                  {list.slice(0, 3).map(e => <Badge key={e} color="blue">{e}</Badge>)}
                  {list.length > 3 && <Badge color="gray">+{list.length - 3}</Badge>}
                </div>
              )
            },
          },
          {
            key: 'is_active', label: 'Status',
            render: v => <Badge color={v !== false ? 'green' : 'red'} dot>{v !== false ? 'Active' : 'Inactive'}</Badge>,
          },
          {
            key: 'last_triggered_at', label: 'Last Trigger',
            render: v => v ? new Date(v).toLocaleString() : 'Never',
          },
          {
            key: 'success_count', label: 'Deliveries',
            render: (v, r) => (
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-success-600 flex items-center gap-1"><CheckCircle size={11} /> {v || 0}</span>
                <span className="text-danger-600 flex items-center gap-1"><XCircle size={11} /> {r.failure_count || 0}</span>
              </div>
            ),
          },
          {
            key: 'actions', label: '', sortable: false,
            render: (_, r) => (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Button size="xs" variant="secondary" onClick={() => loadLogs(r)}>
                  <Eye size={11} /> Logs
                </Button>
                <button onClick={() => setConfirmDelete(r)} className="p-1.5 text-gray-300 hover:text-danger-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          },
        ]}
        rows={webhooks}
        loading={loading}
        emptyText="No webhooks configured"
      />

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({ events: [] }) }} title="New Webhook" width="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({ events: [] }) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Webhook</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input
            label="Endpoint URL" required
            value={form.url || ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://your-app.com/webhooks/fyxo"
            hint="Must be HTTPS in production"
          />
          <Input
            label="Secret (optional)"
            value={form.secret || ''} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
            placeholder="Used to sign payloads"
            type="password"
          />
          <div>
            <label className="field-label">Events to subscribe <span className="text-danger-500">*</span></label>
            <div className="grid grid-cols-2 gap-1.5 mt-2 max-h-52 overflow-y-auto p-1">
              {EVENTS.map(event => (
                <label key={event} className="flex items-center gap-2 text-[12px] cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.events?.includes(event) || false}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-gray-300 text-brand-600"
                  />
                  <span className="font-mono text-gray-700">{event}</span>
                </label>
              ))}
            </div>
            {form.events?.length > 0 && (
              <p className="text-[11px] text-brand-600 mt-1">{form.events.length} event{form.events.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Logs modal */}
      <Modal open={!!logsModal} onClose={() => setLogsModal(null)} title={`Delivery Logs — ${logsModal?.url?.slice(0, 40)}...`} width="max-w-2xl">
        {logs.length === 0 ? (
          <p className="text-[13px] text-gray-400 py-6 text-center">No delivery logs found</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className={`p-3 rounded-xl border text-[12px] ${log.success ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {log.success
                      ? <CheckCircle size={13} className="text-success-500" />
                      : <XCircle size={13} className="text-danger-500" />}
                    <span className="font-medium">{log.event_type || 'delivery'}</span>
                    <Badge color={log.success ? 'green' : 'red'}>{log.http_status || (log.success ? 200 : 500)}</Badge>
                  </div>
                  <span className="text-gray-400">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</span>
                </div>
                {log.response_body && (
                  <p className="font-mono text-[11px] text-gray-600 truncate mt-1">{log.response_body.slice(0, 100)}</p>
                )}
                {log.error && <p className="text-danger-600 text-[11px] mt-1">{log.error}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Webhook" description={`Delete webhook for ${confirmDelete?.url}? All delivery history will be lost.`}
        confirmLabel="Delete" danger loading={deleting}
      />
    </Page>
  )
}
