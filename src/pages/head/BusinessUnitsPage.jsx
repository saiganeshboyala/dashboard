import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select, StatCard } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getBUs, createBU, getClusters } from '../../utils/api'
import { Plus, RefreshCw, Building2 } from 'lucide-react'
import { useDynamicSchema } from '../../hooks/useDynamicSchema'

export default function BusinessUnitsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { renderPicklist } = useDynamicSchema('business_units')
  const [bus, setBus] = useState([])
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [bData, cData] = await Promise.all([getBUs(), getClusters()])
      setBus(Array.isArray(bData) ? bData : bData?.data || [])
      setClusters(Array.isArray(cData) ? cData : cData?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name) return toast.error('Name is required')
    setCreating(true)
    try {
      await createBU(form)
      toast.success('Business unit created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const totals = bus.reduce((acc, b) => ({
    students: acc.students + (b._count?.students || b.studentCount || 0),
    recruiters: acc.recruiters + (b._count?.recruiters || b.recruiterCount || 0),
  }), { students: 0, recruiters: 0 })

  return (
    <Page title="Business Units" subtitle={`${bus.length} units`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New BU</Button>
        </div>
      }>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Units"     value={bus.length}        icon="building"  color="brand" />
        <StatCard label="Total Students"  value={totals.students}   icon="users"     color="success" />
        <StatCard label="Total Recruiters"value={totals.recruiters} icon="recruiter" color="purple" />
      </div>

      <DataTable
        columns={[
          { key: 'name', label: 'Business Unit', render: v => (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center"><Building2 size={14} className="text-brand-600" /></div>
              <span className="font-medium text-gray-900">{v}</span>
            </div>
          )},
          { key: 'clusterName', label: 'Cluster', render: (v, r) => r.cluster?.name || v || '—' },
          { key: '_count', label: 'Students',   render: (_, r) => <span className="tabular-nums font-medium">{r._count?.students || r.studentCount || 0}</span> },
          { key: 'recruiterCount', label: 'Recruiters', render: (v, r) => <span className="tabular-nums">{v || r._count?.recruiters || 0}</span> },
          { key: 'submissionCount', label: 'Submissions', render: v => <span className="tabular-nums">{v || 0}</span> },
          { key: 'placementRate', label: 'Place Rate', render: v => v != null ? <Badge color={parseFloat(v) > 15 ? 'green' : 'amber'}>{v}%</Badge> : '—' },
          { key: 'isActive', label: 'Status', render: v => {
            const pv = renderPicklist('is_active', v)
            return <Badge color={pv?.color || (v !== false ? 'green' : 'gray')} dot>{pv?.label || (v !== false ? 'Active' : 'Inactive')}</Badge>
          }},
        ]}
        rows={bus}
        loading={loading}
        onRowClick={r => navigate(`/head/dynamic/business_units/${r.id}`)}
        emptyText="No business units yet"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Business Unit"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Unit Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Cluster" value={form.clusterId || ''} onChange={e => setForm(f => ({ ...f, clusterId: e.target.value }))} className="col-span-2">
            <option value="">No cluster</option>
            {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Location" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <Input label="Head of BU" value={form.headName || ''} onChange={e => setForm(f => ({ ...f, headName: e.target.value }))} />
        </div>
      </Modal>
    </Page>
  )
}
