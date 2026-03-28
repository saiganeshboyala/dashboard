import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select, StatCard, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getCampaigns, createCampaign } from '../../utils/api'
import { Plus, RefreshCw, Megaphone } from 'lucide-react'

export default function CampaignsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await getCampaigns()
      setCampaigns(Array.isArray(data) ? data : data?.campaigns || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.type) return toast.error('Name and type are required')
    setCreating(true)
    try {
      await createCampaign(form)
      toast.success('Campaign created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const active = campaigns.filter(c => c.status === 'active').length

  return (
    <Page title="Campaigns" subtitle="Marketing and outreach campaigns"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Campaign</Button>
        </div>
      }>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Campaigns" value={campaigns.length} icon="clipboard" color="brand" />
        <StatCard label="Active"           value={active}           icon="trending"  color="success" />
        <StatCard label="Total Members"    value={campaigns.reduce((a, c) => a + (c.memberCount || c._count?.members || 0), 0)} icon="users" color="purple" />
      </div>

      <DataTable
        columns={[
          { key: 'name', label: 'Campaign', render: v => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center"><Megaphone size={13} className="text-brand-600" /></div>
              <span className="font-medium">{v}</span>
            </div>
          )},
          { key: 'type', label: 'Type', render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
          { key: 'status', label: 'Status', render: v => <Badge color={statusBadgeColor(v)} dot>{v || 'draft'}</Badge> },
          { key: 'memberCount', label: 'Members', render: (v, r) => <span className="tabular-nums">{v || r._count?.members || 0}</span> },
          { key: 'start_date', label: 'Start', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'end_date',   label: 'End',   render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'budget', label: 'Budget', render: v => v ? <span className="font-mono tabular-nums">${Number(v).toLocaleString()}</span> : '—' },
        ]}
        rows={campaigns}
        loading={loading}
        onRowClick={r => nav(`/head/campaigns/${r.id}`)}
        emptyText="No campaigns yet"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Campaign"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Campaign Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Type" required value={form.type || ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="">Select type</option>
            {['Email', 'LinkedIn', 'Phone', 'Event', 'Webinar', 'Social', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Budget ($)" type="number" value={form.budget || ''} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
          <Input label="Start Date" type="date" value={form.startDate || ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          <Input label="End Date" type="date" value={form.endDate || ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </Modal>
    </Page>
  )
}
