import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Tabs, Alert, ConfirmDialog } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get, post, del } from '../../utils/api'
import { Plus, RefreshCw, Trash2, Play, RotateCcw, Copy } from 'lucide-react'

export default function AutomationPage() {
  const toast = useToast()
  const [tab, setTab] = useState('assignment')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [form, setForm] = useState({})

  const endpoints = {
    assignment:   '/api/v1/automation/assignment-rules',
    escalation:   '/api/v1/automation/escalation-rules',
    duplicates:   '/api/v1/automation/duplicate-rules',
    'recycle-bin': '/api/v1/automation/recycle-bin',
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await get(endpoints[tab])
      const arr = Array.isArray(res) ? res : res?.rules || res?.records || res?.data || []
      setData(prev => ({ ...prev, [tab]: arr }))
    } catch (e) { toast.error(`Failed to load ${tab}`) }
    setLoading(false)
  }

  useEffect(() => {
    if (!data[tab]) load(); else setLoading(false)
  }, [tab])

  const handleSoftDelete = async (objectType, objectId) => {
    try {
      await post('/api/v1/automation/recycle-bin/soft-delete', { objectType, objectId })
      toast.success('Record moved to recycle bin')
      setData(prev => ({ ...prev, 'recycle-bin': undefined }))
      if (tab === 'recycle-bin') load()
    } catch (e) { toast.error(e.message) }
  }

  const handleCreate = async () => {
    if (!form.name) return toast.error('Name is required')
    setCreating(true)
    try {
      await post(endpoints[tab], form)
      toast.success('Rule created')
      setShowCreate(false); setForm({})
      setData(prev => ({ ...prev, [tab]: undefined }))
      load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleAutoAssign = async () => {
    try {
      await post('/api/v1/automation/auto-assign', {})
      toast.success('Auto-assign triggered successfully')
    } catch (e) { toast.error(e.message) }
  }

  const handleRestore = async (record) => {
    setRestoring(true)
    try {
      await post(`/api/v1/automation/recycle-bin/${record.id}/restore`, {})
      toast.success('Record restored')
      setConfirmRestore(null)
      setData(prev => ({ ...prev, 'recycle-bin': undefined }))
      load()
    } catch (e) { toast.error(e.message) }
    setRestoring(false)
  }

  const handleCheckDuplicates = async () => {
    try {
      await post('/api/v1/automation/check-duplicates', { objectType: 'students' })
      toast.success('Duplicate check started')
    } catch (e) { toast.error(e.message) }
  }

  const rows = data[tab] || []

  const tabColumns = {
    assignment: [
      { key: 'name',        label: 'Rule Name',   render: v => <span className="font-medium">{v}</span> },
      { key: 'object_type', label: 'Object',       render: v => <Badge color="blue">{v || 'students'}</Badge> },
      { key: 'is_active',   label: 'Status',       render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Inactive'}</Badge> },
      { key: 'criteria',    label: 'Criteria',     render: v => <span className="font-mono text-[11px]">{v ? JSON.stringify(v).slice(0, 50) : '—'}</span> },
      { key: 'assigned_to', label: 'Assign To',    render: (v, r) => r.assignee?.name || v || '—' },
    ],
    escalation: [
      { key: 'name',         label: 'Rule',      render: v => <span className="font-medium">{v}</span> },
      { key: 'object_type',  label: 'Object',    render: v => <Badge color="blue">{v}</Badge> },
      { key: 'hours_until',  label: 'Escalate After', render: v => v ? `${v}h` : '—' },
      { key: 'is_active',    label: 'Status',    render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Inactive'}</Badge> },
    ],
    duplicates: [
      { key: 'name',        label: 'Rule',       render: v => <span className="font-medium">{v}</span> },
      { key: 'object_type', label: 'Object',     render: v => <Badge color="blue">{v}</Badge> },
      { key: 'match_fields',label: 'Match On',   render: v => Array.isArray(v) ? v.join(', ') : v || '—' },
      { key: 'action',      label: 'Action',     render: v => <Badge color={v === 'block' ? 'red' : 'amber'}>{v || 'warn'}</Badge> },
      { key: 'is_active',   label: 'Status',     render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Inactive'}</Badge> },
    ],
    'recycle-bin': [
      { key: 'object_type', label: 'Type',       render: v => <Badge color="gray">{v}</Badge> },
      { key: 'record_name', label: 'Record',     render: (v, r) => <span className="font-medium">{v || `#${r.object_id}`}</span> },
      { key: 'deleted_by',  label: 'Deleted By', render: (v, r) => r.deleter?.name || v || '—' },
      { key: 'deleted_at',  label: 'Deleted',    render: v => v ? new Date(v).toLocaleDateString() : '—' },
      { key: 'expires_at',  label: 'Expires',    render: v => v ? new Date(v).toLocaleDateString() : '—' },
      {
        key: 'actions', label: '', sortable: false,
        render: (_, r) => (
          <div className="flex gap-1">
            <Button size="xs" variant="secondary" onClick={e => { e.stopPropagation(); setConfirmRestore(r) }}>
            <RotateCcw size={11} /> Restore
            </Button>
          </div>
        ),
      },
    ],
  }

  return (
    <Page
      title="Automation"
      subtitle="Assignment rules, escalations, duplicates, and recycle bin"
      actions={
        <div className="flex items-center gap-2">
          {tab === 'assignment' && (
            <Button variant="secondary" size="sm" onClick={handleAutoAssign}>
              <Play size={13} /> Run Auto-Assign
            </Button>
          )}
          {tab === 'duplicates' && (
            <Button variant="secondary" size="sm" onClick={handleCheckDuplicates}>
              <Copy size={13} /> Check Duplicates
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => { setData(prev => ({ ...prev, [tab]: undefined })); load() }}>
            <RefreshCw size={13} />
          </Button>
          {tab !== 'recycle-bin' && (
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Rule</Button>
          )}
        </div>
      }
    >
      <Tabs active={tab} onChange={t => { setTab(t); setLoading(!data[t]) }} tabs={[
        { id: 'assignment',   label: 'Assignment Rules' },
        { id: 'escalation',   label: 'Escalation Rules' },
        { id: 'duplicates',   label: 'Duplicate Rules' },
        { id: 'recycle-bin',  label: 'Recycle Bin' },
      ]} />

      <div className="mt-5">
        {tab === 'recycle-bin' && (
          <Alert type="info" className="mb-4">
            Deleted records are kept for 30 days before permanent deletion. Restore them before they expire.
          </Alert>
        )}

        <DataTable
          columns={tabColumns[tab] || []}
          rows={rows}
          loading={loading}
          emptyText={tab === 'recycle-bin' ? 'Recycle bin is empty' : `No ${tab.replace(/-/g, ' ')} configured`}
        />
      </div>

      {/* Create rule modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title={`New ${tab === 'assignment' ? 'Assignment' : tab === 'escalation' ? 'Escalation' : 'Duplicate'} Rule`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Rule</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Rule Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Object Type" value={form.objectType || 'students'} onChange={e => setForm(f => ({ ...f, objectType: e.target.value }))}>
            {['students', 'submissions', 'interviews', 'leads', 'cases'].map(o => <option key={o}>{o}</option>)}
          </Select>
          {tab === 'assignment' && (
            <Input label="Assign To (User ID)" type="number" value={form.assignToUserId || ''} onChange={e => setForm(f => ({ ...f, assignToUserId: e.target.value }))} />
          )}
          {tab === 'escalation' && (
            <Input label="Hours Until Escalation" type="number" value={form.hoursUntil || ''} onChange={e => setForm(f => ({ ...f, hoursUntil: +e.target.value }))} />
          )}
          {tab === 'duplicates' && (
            <Input label="Match Fields (comma-separated)" value={form.matchFields || ''} onChange={e => setForm(f => ({ ...f, matchFields: e.target.value.split(',').map(s => s.trim()) }))} placeholder="email, phone" />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmRestore} onClose={() => setConfirmRestore(null)} onConfirm={() => handleRestore(confirmRestore)}
        title="Restore Record" description={`Restore "${confirmRestore?.record_name || `Record #${confirmRestore?.object_id}`}"?`}
        confirmLabel="Restore" loading={restoring}
      />
    </Page>
  )
}