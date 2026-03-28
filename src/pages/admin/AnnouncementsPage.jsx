import { useState, useEffect } from 'react'
import { DataTable, Badge, Button, Modal, Input, Select, Textarea } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminAnnouncements, createAnnouncement } from '../../utils/api'
import { Plus, Megaphone, RefreshCw } from 'lucide-react'

export default function AnnouncementsPage() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})

  const [activeCount, setActiveCount] = useState(0)
  useEffect(() => {
    fetch('/api/v1/admin/announcements/active', {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    }).then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : d?.announcements || []
      setActiveCount(arr.length)
    }).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAdminAnnouncements()
      setItems(Array.isArray(data) ? data : data?.announcements || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.title || !form.message) return toast.error('Title and message required')
    setCreating(true)
    try { await createAnnouncement(form); toast.success('Announcement created'); setShowCreate(false); setForm({}); load() }
    catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  return (
    <div>
      {activeCount > 0 && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-700">
          {activeCount} announcement{activeCount !== 1 ? 's' : ''} currently active and visible to tenants
        </div>
      )}
    <div className="flex justify-end mb-4">
        <><Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button><Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Announcement</Button></>
      </div>
      <DataTable
        columns={[
          { key: 'title', label: 'Title', render: v => <div className="flex items-center gap-2"><Megaphone size={13} className="text-amber-500" /><span className="font-medium">{v}</span></div> },
          { key: 'type', label: 'Type', render: v => <Badge color={v === 'critical' ? 'red' : v === 'warning' ? 'amber' : 'blue'}>{v || 'info'}</Badge> },
          { key: 'is_active', label: 'Active', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Inactive'}</Badge> },
          { key: 'starts_at', label: 'Starts', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'ends_at',   label: 'Ends',   render: v => v ? new Date(v).toLocaleDateString() : 'No end' },
        ]}
        rows={items}
        loading={loading}
        emptyText="No announcements"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Announcement"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Publish</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" required value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Select label="Type" value={form.type || 'info'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {['info', 'warning', 'critical', 'maintenance'].map(t => <option key={t}>{t}</option>)}
          </Select>
          <Textarea label="Message" required value={form.message || ''} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="datetime-local" value={form.startsAt || ''} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
            <Input label="End Date" type="datetime-local" value={form.endsAt || ''} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
