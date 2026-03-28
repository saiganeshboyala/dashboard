import { useState, useEffect } from 'react'
import { StatCard, Loading, DataTable, Badge } from '../../components/Shared'
import { getAdminDashboard } from '../../utils/api'
import { getHealth } from '../../utils/api'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAdminDashboard(), getHealth().catch(() => null)]).then(([d, h]) => { setData(d); setHealth(h) }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (!data) return <p className="text-gray-400 text-[13px] p-6">Failed to load dashboard</p>

  return (
    <div className="space-y-6">
      <div>
        {health && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium mb-4 ${health.status === 'ok' || health.status === 'healthy' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          <span className={`w-2 h-2 rounded-full ${health.status === 'ok' || health.status === 'healthy' ? 'bg-success-500' : 'bg-danger-500'}`} />
          API {health.status === 'ok' || health.status === 'healthy' ? 'Healthy' : 'Degraded'}
          {health.version && <span className="text-gray-400 ml-1">v{health.version}</span>}
        </div>
      )}
      <h2 className="text-[15px] font-bold text-gray-900 mb-4">Platform Overview</h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Tenants"    value={data.totalTenants}    icon="building"  color="brand" />
          <StatCard label="Active Tenants"   value={data.activeTenants}   icon="chart"     color="success" />
          <StatCard label="Total Users"      value={data.totalUsers}      icon="users"     color="purple" />
          <StatCard label="MRR"              value={`$${(data.mrr || 0).toLocaleString()}`} icon="trending" color="warn" />
        </div>
      </div>

      {data.recentTenants?.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-gray-700 mb-3">Recent Signups</h3>
          <DataTable
            searchable={false}
            columns={[
              { key: 'name', label: 'Tenant', render: v => <span className="font-medium">{v}</span> },
              { key: 'plan', label: 'Plan', render: v => <Badge color="blue">{v}</Badge> },
              { key: 'userCount', label: 'Users' },
              { key: 'createdAt', label: 'Joined', render: v => v ? new Date(v).toLocaleDateString() : '—' },
            ]}
            rows={data.recentTenants} emptyText="No recent tenants"
          />
        </div>
      )}
    </div>
  )
}
