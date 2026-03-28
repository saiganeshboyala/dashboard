import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getTerritories, createTerritory } from '../../utils/api'
import { Plus, RefreshCw, Map } from 'lucide-react'

export default function TerritoriesPage() {
  const toast = useToast()
  const [territories, setTerritories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})
  const [detailModal, setDetailModal] = useState(null)
  const [assignForm, setAssignForm] = useState({})
  const [assigning, setAssigning] = useState(false)

  const handleAssignUser = async () => {
    if (!detailModal || !assignForm.userId) return toast.error('User ID required')
    setAssigning(true)
    try {
      await post(`/api/v1/sales/territories/${detailModal.id}/assign-user`, { userId: parseInt(assignForm.userId), role: assignForm.role || 'member' })
      toast.success('User assigned to territory')
      setAssignForm({})
    } catch (e) { toast.error(e.message) }
    setAssigning(false)
  }

  const handleAssignAccounts = async () => {
    if (!detailModal || !assignForm.accountIds) return toast.error('Account IDs required')
    setAssigning(true)
    try {
      const ids = assignForm.accountIds.split(',').map(s => parseInt(s.trim())).filter(Boolean)
      await post(`/api/v1/sales/territories/${detailModal.id}/assign-accounts`, { accountIds: ids })
      toast.success(`${ids.length} accounts assigned`)
      setAssignForm({})
    } catch (e) { toast.error(e.message) }
    setAssigning(false)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await getTerritories()
      setTerritories(Array.isArray(data) ? data : data?.territories || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name) return toast.error('Name is required')
    setCreating(true)
    try {
      await createTerritory(form)
      toast.success('Territory created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  return (
    <Page title="Territories" subtitle="Sales territories"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Territory</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'name', label: 'Territory', render: v => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center"><Map size={13} className="text-teal-600" /></div>
              <span className="font-medium">{v}</span>
            </div>
          )},
          { key: 'type', label: 'Type', render: v => v ? <Badge color="teal">{v}</Badge> : '—' },
          { key: 'country', label: 'Country' },
          { key: 'state', label: 'State/Region' },
          { key: 'assignedUserCount', label: 'Assignees', render: (v, r) => r._count?.assignments || v || 0 },
          { key: 'actions', label: '', sortable: false, render: (_, r) => (
            <Button size="xs" variant="secondary" onClick={e => { e.stopPropagation(); setDetailModal(r); setAssignForm({}) }}>Manage</Button>
          )},
          { key: 'accountCount', label: 'Accounts', render: (v, r) => r._count?.accounts || v || 0 },
        ]}
        rows={territories}
        loading={loading}
        emptyText="No territories defined"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Territory"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Territory Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Type" value={form.type || ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="">Select type</option>
            {['Geographic', 'Industry', 'Named Account', 'Product', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Country" value={form.country || ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
          <Input label="State / Region" value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
          <Input label="City" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
        </div>
      </Modal>
      {/* Territory management modal */}
      <Modal open={!!detailModal} onClose={() => { setDetailModal(null); setAssignForm({}) }}
        title={`Manage — ${detailModal?.name || ''}`} width="max-w-lg">
        <div className="space-y-5">
          <div>
            <h4 className="text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-3">Assign User</h4>
            <div className="flex gap-2">
              <Input placeholder="User ID" type="number" value={assignForm.userId || ''} onChange={e => setAssignForm(f => ({ ...f, userId: e.target.value }))} className="flex-1" />
              <Select value={assignForm.role || 'member'} onChange={e => setAssignForm(f => ({ ...f, role: e.target.value }))} className="w-32">
                {['member', 'owner', 'viewer'].map(r => <option key={r}>{r}</option>)}
              </Select>
              <Button size="sm" onClick={handleAssignUser} loading={assigning}>Assign</Button>
            </div>
          </div>
          <div>
            <h4 className="text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-3">Assign Accounts</h4>
            <div className="flex gap-2">
              <Input placeholder="Account IDs (comma-separated)" value={assignForm.accountIds || ''} onChange={e => setAssignForm(f => ({ ...f, accountIds: e.target.value }))} className="flex-1" />
              <Button size="sm" onClick={handleAssignAccounts} loading={assigning}>Assign</Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setDetailModal(null)}>Close</Button>
        </div>
      </Modal>
    </Page>
  )
}
