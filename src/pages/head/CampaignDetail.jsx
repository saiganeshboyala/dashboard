import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, Badge, Button, Loading, StatCard, Modal, Input, Textarea, DataTable, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getCampaigns, createCampaign } from '../../utils/api'
import { get, put, post } from '../../utils/api'
import { ArrowLeft, Edit2, Users, Plus } from 'lucide-react'

export default function CampaignDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [addMembersModal, setAddMembersModal] = useState(false)
  const [memberIds, setMemberIds] = useState('')
  const [addingMembers, setAddingMembers] = useState(false)

  const load = async () => {
    try {
      const data = await get(`/api/v1/leads/campaigns/${id}`)
      setCampaign(data?.campaign || data)
    } catch (e) { toast.error('Failed to load campaign') }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleAddMembers = async () => {
    const ids = memberIds.split(',').map(s => parseInt(s.trim())).filter(Boolean)
    if (!ids.length) return toast.error('Enter at least one lead ID')
    setAddingMembers(true)
    try {
      await post(`/api/v1/leads/campaigns/${id}/add-members`, { memberIds: ids })
      toast.success(`${ids.length} member${ids.length !== 1 ? 's' : ''} added`)
      setAddMembersModal(false); setMemberIds(''); load()
    } catch (e) { toast.error(e.message) }
    setAddingMembers(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await put(`/api/v1/leads/campaigns/${id}`, editForm)
      toast.success('Campaign updated')
      setEditModal(false)
      load()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const handleUpdateMetrics = async () => {
    try {
      await put(`/api/v1/leads/campaigns/${id}/metrics`, {})
      toast.success('Metrics updated')
      load()
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return <Page title="Loading..."><Loading /></Page>
  if (!campaign) return <Page title="Not Found"><p className="text-gray-400">Campaign not found.</p></Page>

  const c = campaign

  return (
    <Page
      title={c.name || `Campaign #${id}`}
      subtitle={c.type || ''}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setEditForm({ name: c.name, type: c.type, status: c.status, budget: c.budget, startDate: c.start_date, endDate: c.end_date }); setEditModal(true) }}>
            <Edit2 size={13} /> Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAddMembersModal(true)}>
            <Users size={13} /> Add Members
          </Button>
          <Button variant="secondary" size="sm" onClick={() => nav(-1)}><ArrowLeft size={13} /> Back</Button>
        </div>
      }
    >
      {/* Status */}
      <div className="flex items-center gap-3 mb-6">
        <Badge color={c.status === 'active' ? 'green' : c.status === 'planned' ? 'blue' : 'gray'} dot>{c.status || 'draft'}</Badge>
        {c.type && <Badge color="purple">{c.type}</Badge>}
        {c.budget && <span className="text-[12px] text-gray-500">Budget: ${Number(c.budget).toLocaleString()}</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Members"      value={c.memberCount || c._count?.members || 0}     icon="users"     color="brand" />
        <StatCard label="Responses"    value={c.responses || 0}                              icon="file"      color="success" />
        <StatCard label="Conversions"  value={c.conversions || 0}                            icon="trending"  color="warn" />
        <StatCard label="ROI"          value={c.roi ? `${c.roi}%` : '—'}                    icon="chart"     color="purple" />
      </div>

      {/* Members table */}
      {c.members?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Members ({c.members.length})</h3>
            <Button size="xs" variant="secondary" onClick={handleUpdateMetrics}>Refresh Metrics</Button>
          </div>
          <DataTable
            searchable={false}
            columns={[
              { key: 'name',   label: 'Name',   render: v => <span className="font-medium">{v || '—'}</span> },
              { key: 'email',  label: 'Email' },
              { key: 'status', label: 'Status', render: v => <Badge color={statusBadgeColor(v)}>{v || 'active'}</Badge> },
              { key: 'responded', label: 'Responded', render: v => <Badge color={v ? 'green' : 'gray'}>{v ? 'Yes' : 'No'}</Badge> },
            ]}
            rows={c.members} emptyText="No members yet"
          />
        </div>
      )}

      {/* Add Members modal */}
      <Modal open={addMembersModal} onClose={() => setAddMembersModal(false)} title="Add Campaign Members"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddMembersModal(false)}>Cancel</Button>
            <Button onClick={handleAddMembers} loading={addingMembers}>Add Members</Button>
          </div>
        }>
        <Input
          label="Lead IDs (comma-separated)"
          value={memberIds}
          onChange={e => setMemberIds(e.target.value)}
          placeholder="1, 2, 3, 42..."
          hint="Enter the IDs of leads to add to this campaign"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Campaign"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <div>
            <label className="field-label">Status</label>
            <select value={editForm.status || ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="field-input">
              {['draft', 'planned', 'active', 'paused', 'completed', 'cancelled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Budget ($)" type="number" value={editForm.budget || ''} onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} />
          <Input label="Start Date" type="date" value={editForm.startDate?.slice(0, 10) || ''} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
          <Input label="End Date"   type="date" value={editForm.endDate?.slice(0, 10)   || ''} onChange={e => setEditForm(f => ({ ...f, endDate:   e.target.value }))} />
        </div>
      </Modal>
    </Page>
  )
}
