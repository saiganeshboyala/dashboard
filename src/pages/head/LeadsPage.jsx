import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getLeads, createLead, convertLead } from '../../utils/api'
import { Plus, RefreshCw, ArrowRightCircle } from 'lucide-react'

export default function LeadsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const q = statusFilter ? `status=${statusFilter}` : ''
      const data = await getLeads(q)
      setLeads(Array.isArray(data) ? data : data?.leads || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  const handleCreate = async () => {
    if (!form.firstName || !form.email) return toast.error('First name and email required')
    setCreating(true)
    try {
      await createLead(form)
      toast.success('Lead created'); setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleConvert = async (id, e) => {
    e.stopPropagation()
    try { await convertLead(id, {}); toast.success('Lead converted'); load() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <Page title="Leads" subtitle="Sales pipeline leads"
      actions={
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36">
            <option value="">All statuses</option>
            {['new', 'contacted', 'qualified', 'converted', 'lost'].map(s => <option key={s}>{s}</option>)}
          </Select>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Lead</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'first_name', label: 'Name', render: (_, r) => (
            <div>
              <p className="font-medium text-gray-900">{r.first_name || r.firstName} {r.last_name || r.lastName || ''}</p>
              <p className="text-[11px] text-gray-400">{r.email}</p>
            </div>
          )},
          { key: 'company', label: 'Company', render: v => v || '—' },
          { key: 'title', label: 'Title', render: v => v || '—' },
          { key: 'rating', label: 'Rating', render: v => v ? <Badge color={v === 'hot' ? 'red' : v === 'warm' ? 'amber' : 'blue'}>{v}</Badge> : '—' },
          { key: 'status', label: 'Status', render: v => <Badge color={statusBadgeColor(v)} dot>{v || 'new'}</Badge> },
          { key: 'lead_source', label: 'Source', render: v => v || '—' },
          { key: 'created_at', label: 'Created', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'actions', label: '', sortable: false, render: (_, r) => r.status !== 'converted' ? (
            <Button size="xs" variant="secondary" onClick={e => handleConvert(r.id, e)}>
              <ArrowRightCircle size={11} /> Convert
            </Button>
          ) : <Badge color="green">Converted</Badge> },
        ]}
        rows={leads}
        loading={loading}
        onRowClick={r => nav(`/head/leads/${r.id}`)}
        emptyText="No leads found"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Lead"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Lead</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" required value={form.firstName || ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          <Input label="Last Name" value={form.lastName || ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          <Input label="Email" required type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Company" value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
          <Input label="Title" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Select label="Rating" value={form.rating || ''} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}>
            <option value="">Select rating</option>
            {['cold', 'warm', 'hot'].map(r => <option key={r}>{r}</option>)}
          </Select>
          <Select label="Lead Source" value={form.leadSource || ''} onChange={e => setForm(f => ({ ...f, leadSource: e.target.value }))}>
            <option value="">Select source</option>
            {['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Event', 'Other'].map(s => <option key={s}>{s}</option>)}
          </Select>
        </div>
      </Modal>
    </Page>
  )
}
