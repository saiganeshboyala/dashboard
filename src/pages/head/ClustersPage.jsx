import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getClusters, createCluster, getClusterTree } from '../../utils/api'
import { Plus, RefreshCw, GitBranch } from 'lucide-react'

export default function ClustersPage() {
  const toast = useToast()
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [clusterDetail, setClusterDetail] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getClusters()
      setClusters(Array.isArray(data) ? data : data?.clusters || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadDetail = async (cluster) => {
    setSelectedCluster(cluster)
    try {
      const data = await get(`/api/v1/clusters/${cluster.id}`)
      setClusterDetail(data?.cluster || data)
    } catch (e) { toast.error('Failed to load cluster detail') }
  }

  const handleCreate = async () => {
    if (!form.name) return toast.error('Name is required')
    setCreating(true)
    try {
      await createCluster(form)
      toast.success('Cluster created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  return (
    <Page title="Clusters" subtitle="Organizational cluster hierarchy"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Cluster</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'name', label: 'Cluster', render: v => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center"><GitBranch size={13} className="text-purple-600" /></div>
              <span className="font-medium">{v}</span>
            </div>
          )},
          { key: '_count', label: 'BUs', render: (_, r) => <span className="tabular-nums">{r._count?.businessUnits || r.buCount || 0}</span> },
          { key: 'studentCount', label: 'Students', render: (v, r) => <span className="tabular-nums font-medium">{v || r._count?.students || 0}</span> },
          { key: 'region', label: 'Region', render: v => v || '—' },
          { key: 'isActive', label: 'Status', render: v => <Badge color={v !== false ? 'green' : 'gray'} dot>{v !== false ? 'Active' : 'Inactive'}</Badge> },
        ]}
        rows={clusters}
        loading={loading}
        onRowClick={r => loadDetail(r)}
        emptyText="No clusters yet" 
      />

      {/* Cluster detail modal */}
      <Modal open={!!selectedCluster} onClose={() => { setSelectedCluster(null); setClusterDetail(null) }}
        title={selectedCluster?.name || 'Cluster'}>
        {clusterDetail ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                { label: 'Region', value: clusterDetail.region || '—' },
                { label: 'Business Units', value: clusterDetail._count?.businessUnits || clusterDetail.buCount || 0 },
                { label: 'Total Students', value: clusterDetail.studentCount || 0 },
                { label: 'Status', value: clusterDetail.isActive !== false ? 'Active' : 'Inactive' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            {clusterDetail.businessUnits?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Business Units</p>
                <div className="space-y-1">
                  {clusterDetail.businessUnits.map(bu => (
                    <div key={bu.id} className="flex items-center justify-between text-[12px] px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="font-medium">{bu.name}</span>
                      <span className="text-gray-400">{bu._count?.students || 0} students</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : <div className="py-6 text-center text-gray-400 text-[13px]">Loading...</div>}
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => { setSelectedCluster(null); setClusterDetail(null) }}>Close</Button>
        </div>
      </Modal>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Cluster"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Cluster Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Input label="Region" value={form.region || ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
          <Input label="Description" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </Modal>
    </Page>
  )
}
