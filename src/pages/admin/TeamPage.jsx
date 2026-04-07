import { useState, useEffect } from 'react'
import { DataTable, Badge, Button, Modal, Input, Select } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminTeam, post } from '../../utils/api'
import { Plus, RefreshCw } from 'lucide-react'

export default function TeamPage() {
  const toast = useToast()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAdminTeam()
      const raw = Array.isArray(data) ? data : data?.team || []
      setTeam(raw.map(m => ({
        ...m,
        _isActive: m.isActive ?? m.is_active ?? true,
        _lastLogin: m.lastLoginAt ?? m.last_login_at ?? m.last_login ?? null,
      })))
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password are required')
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters')
    setCreating(true)
    try {
      await post('/api/v1/admin/team', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role || 'support',
      })
      toast.success('Team member created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Add Member</Button>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name', render: (v, r) => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[11px] font-bold">{(v||'?')[0].toUpperCase()}</div>
              <div><p className="font-medium text-[13px]">{v}</p><p className="text-[11px] text-gray-400">{r.email}</p></div>
            </div>
          )},
          { key: 'role', label: 'Role', render: v => <Badge color={v === 'admin' || v === 'super_admin' ? 'red' : 'blue'}>{v}</Badge> },
          { key: '_isActive', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Inactive'}</Badge> },
          { key: '_lastLogin', label: 'Last Login', render: v => v ? new Date(v).toLocaleDateString() : 'Never' },
        ]}
        rows={team}
        loading={loading}
        emptyText="No team members"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="Add Team Member"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" required value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Password" type="password" required value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
          <Select label="Role" value={form.role || 'support'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="support">Support</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      </Modal>
    </div>
  )
}
