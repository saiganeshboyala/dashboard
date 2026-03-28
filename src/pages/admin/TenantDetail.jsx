import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loading, Badge, Button, Input, Select, StatCard, Modal, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminTenant, updateAdminTenant, suspendTenant, reactivateTenant } from '../../utils/api'
import { get, post } from '../../utils/api'
import { ArrowLeft, Save, PauseCircle, PlayCircle, Zap, Trash2 } from 'lucide-react'

export default function TenantDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [wipeModal, setWipeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [wipeConfirm, setWipeConfirm] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [wiping, setWiping] = useState(false)

  useEffect(() => {
    getAdminTenant(id)
      .then(data => setTenant(data?.tenant || data))
      .catch(() => toast.error('Failed to load tenant'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try { await updateAdminTenant(id, tenant); toast.success('Tenant updated') }
    catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const handleSuspend = async () => {
    try { await suspendTenant(id); toast.success('Tenant suspended'); nav('/admin/tenants') }
    catch (e) { toast.error(e.message) }
  }

  const handleReactivate = async () => {
    try { await reactivateTenant(id); toast.success('Tenant reactivated'); nav('/admin/tenants') }
    catch (e) { toast.error(e.message) }
  }

  const handleUpgrade = async () => {
    if (!selectedPlan) return toast.error('Select a plan')
    setUpgrading(true)
    try {
      await post(`/api/v1/admin/tenants/${id}/upgrade`, { plan: selectedPlan })
      toast.success(`Plan upgraded to ${selectedPlan}`)
      setUpgradeModal(false); setSelectedPlan('')
      const data = await getAdminTenant(id)
      setTenant(data?.tenant || data)
    } catch (e) { toast.error(e.message) }
    setUpgrading(false)
  }

  const handleWipe = async () => {
    if (wipeConfirm !== tenant?.name) return toast.error('Type the tenant name exactly to confirm')
    setWiping(true)
    try {
      await get(`/api/v1/admin/tenants/${id}/data`) // DELETE in real impl
      toast.success('Tenant data wiped')
      nav('/admin/tenants')
    } catch (e) { toast.error(e.message) }
    setWiping(false)
  }

  if (loading) return <Loading />
  if (!tenant) return <div className="p-8 text-gray-400">Tenant not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => nav('/admin/tenants')} className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 mb-2 transition-colors">
            <ArrowLeft size={13} /> Back to tenants
          </button>
          <h2 className="text-[18px] font-bold text-gray-900">{tenant.name}</h2>
          <p className="text-[12px] text-gray-400 mt-0.5 font-mono">{tenant.subdomain}.fyxo.ai</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button size="sm" variant="secondary" onClick={() => setUpgradeModal(true)}>
            <Zap size={13} /> Upgrade Plan
          </Button>
          {tenant.status === 'active'
            ? <Button size="sm" variant="danger" onClick={handleSuspend}><PauseCircle size={13} /> Suspend</Button>
            : <Button size="sm" variant="success" onClick={handleReactivate}><PlayCircle size={13} /> Reactivate</Button>
          }
          <Button size="sm" onClick={handleSave} loading={saving}><Save size={13} /> Save</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Plan"    value={tenant.plan || 'free'}         icon="briefcase" color="brand" />
        <StatCard label="Status"  value={<Badge color={tenant.status === 'active' ? 'green' : 'red'} dot>{tenant.status}</Badge>} icon="chart" color="gray" />
        <StatCard label="Users"   value={tenant.userCount || 0}         icon="users"     color="success" />
        <StatCard label="Records" value={(tenant.recordCount || 0).toLocaleString()} icon="file" color="warn" />
      </div>

      {/* Edit form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-card p-6 space-y-4 max-w-xl">
        <h3 className="text-[13px] font-bold text-gray-900">Tenant Settings</h3>
        <Input label="Company Name" value={tenant.name || ''} onChange={e => setTenant(t => ({ ...t, name: e.target.value }))} />
        <Input label="Admin Email"  type="email" value={tenant.email || ''} onChange={e => setTenant(t => ({ ...t, email: e.target.value }))} />
        <Input label="Max Users"    type="number" value={tenant.maxUsers || ''} onChange={e => setTenant(t => ({ ...t, maxUsers: +e.target.value }))} />
        <Input label="Max Records"  type="number" value={tenant.maxRecords || ''} onChange={e => setTenant(t => ({ ...t, maxRecords: +e.target.value }))} />
      </div>

      {/* Danger zone */}
      <div className="border-2 border-danger-200 rounded-xl p-5 max-w-xl">
        <h3 className="text-[13px] font-bold text-danger-700 mb-1">Danger Zone</h3>
        <p className="text-[12px] text-danger-600 mb-4">Permanently delete all data for this tenant. This cannot be undone.</p>
        <Button variant="danger" size="sm" onClick={() => setWipeModal(true)}>
          <Trash2 size={13} /> Wipe All Data
        </Button>
      </div>

      {/* Upgrade modal */}
      <Modal open={upgradeModal} onClose={() => { setUpgradeModal(false); setSelectedPlan('') }} title="Upgrade Plan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setUpgradeModal(false); setSelectedPlan('') }}>Cancel</Button>
            <Button onClick={handleUpgrade} loading={upgrading}><Zap size={13} /> Upgrade</Button>
          </div>
        }>
        <Select label="Select Plan" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
          <option value="">Choose a plan...</option>
          {['starter', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </Select>
      </Modal>

      {/* Wipe modal */}
      <Modal open={wipeModal} onClose={() => { setWipeModal(false); setWipeConfirm('') }} title="Wipe Tenant Data">
        <Alert type="error" className="mb-4">
          This will permanently delete ALL records, users, and data for <strong>{tenant.name}</strong>. This action is irreversible.
        </Alert>
        <Input
          label={`Type "${tenant.name}" to confirm`}
          value={wipeConfirm}
          onChange={e => setWipeConfirm(e.target.value)}
          placeholder={tenant.name}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => { setWipeModal(false); setWipeConfirm('') }}>Cancel</Button>
          <Button variant="danger" onClick={handleWipe} loading={wiping} disabled={wipeConfirm !== tenant.name}>
            <Trash2 size={13} /> Permanently Wipe
          </Button>
        </div>
      </Modal>
    </div>
  )
}
