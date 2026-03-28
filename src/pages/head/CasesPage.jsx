import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Textarea, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getCases, createCase } from '../../utils/api'
import { Plus, RefreshCw } from 'lucide-react'

export default function CasesPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})
  const [filter, setFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const q = filter ? `status=${filter}` : ''
      const data = await getCases(q)
      setCases(Array.isArray(data) ? data : data?.cases || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const handleCreate = async () => {
    if (!form.subject) return toast.error('Subject is required')
    setCreating(true)
    try {
      await createCase(form)
      toast.success('Case created'); setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  return (
    <Page title="Cases" subtitle="Support cases and issues"
      actions={
        <div className="flex items-center gap-2">
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-36">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Case</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'case_number', label: 'Case #', render: v => <span className="font-mono text-[12px] font-medium">#{v || '—'}</span> },
          { key: 'subject', label: 'Subject', render: v => <span className="font-medium text-gray-900">{v}</span> },
          { key: 'priority', label: 'Priority', render: v => <Badge color={v === 'high' ? 'red' : v === 'medium' ? 'amber' : 'gray'}>{v || 'low'}</Badge> },
          { key: 'status', label: 'Status', render: v => <Badge color={statusBadgeColor(v)} dot>{v || 'open'}</Badge> },
          { key: 'type', label: 'Type', render: v => v || '—' },
          { key: 'assigned_to', label: 'Assigned', render: (v, r) => r.assignee?.name || v || 'Unassigned' },
          { key: 'created_at', label: 'Created', render: v => v ? new Date(v).toLocaleDateString() : '—' },
        ]}
        rows={cases}
        loading={loading}
        onRowClick={r => nav(`/head/cases/${r.id}`)}
        emptyText="No cases found"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Case"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Case</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Subject" required value={form.subject || ''} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="col-span-2" />
          <Select label="Priority" value={form.priority || ''} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="">Select priority</option>
            {['low', 'medium', 'high', 'critical'].map(p => <option key={p}>{p}</option>)}
          </Select>
          <Select label="Type" value={form.type || ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="">Select type</option>
            {['Bug', 'Feature Request', 'Question', 'Access', 'Billing', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
          <Textarea label="Description" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="col-span-2" rows={3} />
        </div>
      </Modal>
    </Page>
  )
}
