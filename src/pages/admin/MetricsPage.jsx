import { useState, useEffect } from 'react'
import { StatCard, Loading, DataTable, Badge } from '../../components/Shared'
import { getAdminMetrics } from '../../utils/api'

export default function MetricsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminMetrics().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (!data) return <p className="text-gray-400 text-[13px]">No metrics available</p>

  const growth = data.growth || []
  const userGrowth = data.userGrowth || []
  const revenueByMonth = data.revenueByMonth || []
  const topTenants = data.topTenants || []

  const totalNewTenants = growth.reduce((sum, d) => sum + (d.new_tenants || 0), 0)
  const totalNewUsers = userGrowth.reduce((sum, d) => sum + (d.new_users || 0), 0)
  const totalRevenue = revenueByMonth.reduce((sum, d) => sum + Number(d.revenue || 0), 0)
  const totalPayments = revenueByMonth.reduce((sum, d) => sum + (d.payments || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="New Tenants (30d)" value={totalNewTenants} icon="building" color="brand" />
        <StatCard label="New Users (30d)"   value={totalNewUsers}   icon="users"    color="success" />
        <StatCard label="Total Revenue"     value={`₹${(totalRevenue / 100).toLocaleString()}`} icon="trending" color="warn" />
        <StatCard label="Total Payments"    value={totalPayments}   icon="chart"    color="purple" />
      </div>

      {/* Tenant growth chart (last 30 days) */}
      {growth.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-4">Tenant Growth (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-32">
            {growth.map((d, i) => {
              const max = Math.max(...growth.map(g => g.new_tenants || 0), 1)
              const h = ((d.new_tenants || 0) / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 tabular-nums">{d.new_tenants || 0}</span>
                  <div className="w-full bg-brand-500 rounded-t" style={{ height: `${Math.max(h, 4)}%` }} title={`${d.date}: ${d.new_tenants} new tenants`} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* User growth chart (last 30 days) */}
      {userGrowth.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-4">User Growth (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-32">
            {userGrowth.map((d, i) => {
              const max = Math.max(...userGrowth.map(g => g.new_users || 0), 1)
              const h = ((d.new_users || 0) / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 tabular-nums">{d.new_users || 0}</span>
                  <div className="w-full bg-success-500 rounded-t" style={{ height: `${Math.max(h, 4)}%` }} title={`${d.date}: ${d.new_users} new users`} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Revenue by month */}
      {revenueByMonth.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-4">Revenue by Month</h3>
          <div className="space-y-2">
            {revenueByMonth.map(r => (
              <div key={r.month} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="font-mono text-[12px] text-gray-600">{r.month}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[12px] text-gray-400">{r.payments} payments</span>
                  <span className="text-[13px] font-bold tabular-nums text-gray-900">₹{(Number(r.revenue || 0) / 100).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top tenants */}
      {topTenants.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-gray-700 mb-3">Top Tenants by Revenue</h3>
          <DataTable
            searchable={false}
            columns={[
              { key: 'name', label: 'Tenant', render: v => <span className="font-medium">{v}</span> },
              { key: 'plan', label: 'Plan', render: v => <Badge color="blue">{v}</Badge> },
              { key: 'users', label: 'Users', render: v => <span className="tabular-nums">{v}</span> },
              { key: 'students', label: 'Students', render: v => <span className="tabular-nums">{v}</span> },
              { key: 'revenue', label: 'Revenue', render: v => <span className="font-bold tabular-nums">₹{(Number(v || 0) / 100).toLocaleString()}</span> },
            ]}
            rows={topTenants}
            emptyText="No data"
          />
        </div>
      )}
    </div>
  )
}
