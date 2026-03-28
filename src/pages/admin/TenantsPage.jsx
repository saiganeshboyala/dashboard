import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, Badge, Button, Input, Select } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminTenants, suspendTenant, reactivateTenant } from '../../utils/api'
import { Search, PauseCircle, PlayCircle } from 'lucide-react'

export default function TenantsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const q = search ? `search=${encodeURIComponent(search)}` : ''
      const data = await getAdminTenants(q)
      setTenants(Array.isArray(data) ? data : data?.tenants || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSuspend = async (id, e) => {
    e.stopPropagation()
    try { await suspendTenant(id); toast.success('Tenant suspended'); load() }
    catch (e) { toast.error(e.message) }
  }

  const handleReactivate = async (id, e) => {
    e.stopPropagation()
    try { await reactivateTenant(id); toast.success('Tenant reactivated'); load() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search tenants..." className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] outline-none focus:border-brand-300" />
        </div>
        <Button variant="secondary" size="sm" onClick={load}>Search</Button>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Tenant', render: v => <span className="font-medium">{v}</span> },
          { key: 'subdomain', label: 'Subdomain', render: v => <span className="font-mono text-[12px]">{v}</span> },
          { key: 'plan', label: 'Plan', render: v => <Badge color="blue">{v || 'free'}</Badge> },
          { key: 'status', label: 'Status', render: v => <Badge color={v === 'active' ? 'green' : v === 'suspended' ? 'red' : 'gray'} dot>{v}</Badge> },
          { key: 'userCount', label: 'Users' },
          { key: 'createdAt', label: 'Joined', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'actions', label: '', sortable: false, render: (_, r) => (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              {r.status === 'active'
                ? <Button size="xs" variant="secondary" onClick={e => handleSuspend(r.id, e)}><PauseCircle size={11} /> Suspend</Button>
                : <Button size="xs" variant="success" onClick={e => handleReactivate(r.id, e)}><PlayCircle size={11} /> Activate</Button>
              }
            </div>
          )},
        ]}
        rows={tenants}
        loading={loading}
        onRowClick={r => nav(`/admin/tenants/${r.id}`)}
        emptyText="No tenants found"
      />
    </div>
  )
}
