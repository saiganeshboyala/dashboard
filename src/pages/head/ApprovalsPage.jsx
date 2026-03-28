import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Textarea, Input, Select, Tabs, StatCard } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get, post, put } from '../../utils/api'
import { CheckCircle, XCircle, Clock, FileText, Plus, Settings } from 'lucide-react'

export default function ApprovalsPage() {
  const toast = useToast()
  const [tab, setTab] = useState('pending')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null) // { record, action: 'approve'|'reject' }
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)
  const [submitModal, setSubmitModal] = useState(false)
  const [submitForm, setSubmitForm] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [processModal, setProcessModal] = useState(false)
  const [processForm, setProcessForm] = useState({})
  const [creatingProcess, setCreatingProcess] = useState(false)

  const endpoints = {
    pending:   '/api/v1/approvals/pending',
    my:        '/api/v1/approvals/my',
    processes: '/api/v1/approvals/processes',
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await get(endpoints[tab])
      const arr = Array.isArray(res) ? res : res?.approvals || res?.processes || res?.data || []
      setData(prev => ({ ...prev, [tab]: arr }))
    } catch (e) { toast.error(`Failed to load ${tab}`) }
    setLoading(false)
  }

  useEffect(() => { if (!data[tab]) load(); else setLoading(false) }, [tab])

  const handleAction = async () => {
    const { record, action } = actionModal
    setProcessing(true)
    try {
      if (action === 'approve') await put(`/api/v1/approvals/${record.id}/approve`, { comment })
      else await put(`/api/v1/approvals/${record.id}/reject`, { comment, reason: comment })
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}`)
      setActionModal(null); setComment('')
      setData(prev => ({ ...prev, pending: undefined, my: undefined }))
      load()
    } catch (e) { toast.error(e.message) }
    setProcessing(false)
  }

  const handleSubmit = async () => {
    if (!submitForm.objectType || !submitForm.objectId) return toast.error('Object type and ID required')
    setSubmitting(true)
    try {
      await post('/api/v1/approvals/submit', submitForm)
      toast.success('Approval request submitted')
      setSubmitModal(false); setSubmitForm({})
      setData(prev => ({ ...prev, my: undefined }))
      if (tab === 'my') load()
    } catch (e) { toast.error(e.message) }
    setSubmitting(false)
  }

  const handleCreateProcess = async () => {
    if (!processForm.name || !processForm.objectType) return toast.error('Name and object type required')
    setCreatingProcess(true)
    try {
      await post('/api/v1/approvals/processes', processForm)
      toast.success('Approval process created')
      setProcessModal(false); setProcessForm({})
      setData(prev => ({ ...prev, processes: undefined }))
      if (tab === 'processes') load()
    } catch (e) { toast.error(e.message) }
    setCreatingProcess(false)
  }

  const rows = data[tab] || []
  const pendingCount = (data.pending || []).length
  const myCount = (data.my || []).length

  const pendingCols = [
    { key: 'object_type', label: 'Object', render: v => <Badge color="blue">{v || 'Record'}</Badge> },
    { key: 'object_id', label: 'Record ID', render: v => <span className="font-mono text-[12px]">#{v}</span> },
    { key: 'requested_by', label: 'Requester', render: (v, r) => r.requester?.name || r.requestedBy || v || '—' },
    { key: 'status', label: 'Status', render: v => <Badge color={v === 'pending' ? 'amber' : v === 'approved' ? 'green' : 'red'} dot>{v || 'pending'}</Badge> },
    { key: 'created_at', label: 'Requested', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'actions', label: '', sortable: false, render: (_, r) => r.status === 'pending' ? (
      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        <Button size="xs" variant="success" onClick={() => { setActionModal({ record: r, action: 'approve' }); setComment('') }}>
          <CheckCircle size={11} /> Approve
        </Button>
        <Button size="xs" variant="danger" onClick={() => { setActionModal({ record: r, action: 'reject' }); setComment('') }}>
          <XCircle size={11} /> Reject
        </Button>
      </div>
    ) : null },
  ]

  const processCols = [
    { key: 'name', label: 'Process Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'object_type', label: 'Object', render: v => <Badge color="blue">{v}</Badge> },
    { key: 'approver_type', label: 'Approver', render: v => v || 'Manager' },
    { key: 'is_active', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Inactive'}</Badge> },
    { key: 'entry_criteria', label: 'Criteria', render: v => v ? <span className="font-mono text-[11px]">{JSON.stringify(v).slice(0,40)}</span> : '—' },
  ]

  return (
    <Page title="Approvals" subtitle="Manage approval requests and processes"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSubmitModal(true)}>
            <Plus size={13} /> Submit Request
          </Button>
          <Button size="sm" onClick={() => setProcessModal(true)}>
            <Settings size={13} /> New Process
          </Button>
        </div>
      }>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Pending"        value={pendingCount} icon="clipboard" color={pendingCount > 0 ? 'warn' : 'gray'} />
        <StatCard label="My Requests"    value={myCount}      icon="users"     color="brand" />
        <StatCard label="Processes"      value={(data.processes || []).length} icon="briefcase" color="purple" />
      </div>

      <Tabs active={tab} onChange={t => { setTab(t); setLoading(!data[t]) }} tabs={[
        { id: 'pending',   label: 'Pending' },
        { id: 'my',        label: 'My Requests' },
        { id: 'processes', label: 'Processes' },
      ]} />

      <div className="mt-4">
        <DataTable
          columns={tab === 'processes' ? processCols : pendingCols}
          rows={rows}
          loading={loading}
          emptyText={tab === 'pending' ? 'No pending approvals' : tab === 'my' ? 'No requests submitted' : 'No approval processes configured'}
        />
      </div>

      {/* Approve/Reject modal */}
      <Modal open={!!actionModal} onClose={() => { setActionModal(null); setComment('') }}
        title={actionModal?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setActionModal(null); setComment('') }}>Cancel</Button>
            <Button variant={actionModal?.action === 'approve' ? 'success' : 'danger'} onClick={handleAction} loading={processing}>
              {actionModal?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        }>
        <Textarea
          label={actionModal?.action === 'approve' ? 'Comment (optional)' : 'Rejection Reason'}
          required={actionModal?.action === 'reject'}
          value={comment} onChange={e => setComment(e.target.value)}
          placeholder={actionModal?.action === 'approve' ? 'Optional notes...' : 'Why is this being rejected?'}
          rows={3}
        />
      </Modal>

      {/* Submit approval request */}
      <Modal open={submitModal} onClose={() => { setSubmitModal(false); setSubmitForm({}) }} title="Submit Approval Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setSubmitModal(false); setSubmitForm({}) }}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Select label="Object Type" required value={submitForm.objectType || ''} onChange={e => setSubmitForm(f => ({ ...f, objectType: e.target.value }))}>
            <option value="">Select object</option>
            {['students', 'submissions', 'leads', 'cases', 'expenses'].map(o => <option key={o}>{o}</option>)}
          </Select>
          <Input label="Record ID" required type="number" value={submitForm.objectId || ''} onChange={e => setSubmitForm(f => ({ ...f, objectId: e.target.value }))} />
          <Textarea label="Reason for approval" value={submitForm.comments || ''} onChange={e => setSubmitForm(f => ({ ...f, comments: e.target.value }))} rows={3} />
        </div>
      </Modal>

      {/* Create approval process */}
      <Modal open={processModal} onClose={() => { setProcessModal(false); setProcessForm({}) }} title="New Approval Process"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setProcessModal(false); setProcessForm({}) }}>Cancel</Button>
            <Button onClick={handleCreateProcess} loading={creatingProcess}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Process Name" required value={processForm.name || ''} onChange={e => setProcessForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Object Type" required value={processForm.objectType || ''} onChange={e => setProcessForm(f => ({ ...f, objectType: e.target.value }))}>
            <option value="">Select object</option>
            {['students', 'submissions', 'leads', 'cases', 'expenses'].map(o => <option key={o}>{o}</option>)}
          </Select>
          <Select label="Approver Type" value={processForm.approverType || 'manager'} onChange={e => setProcessForm(f => ({ ...f, approverType: e.target.value }))}>
            {['manager', 'role', 'user', 'queue'].map(t => <option key={t}>{t}</option>)}
          </Select>
        </div>
      </Modal>
    </Page>
  )
}
