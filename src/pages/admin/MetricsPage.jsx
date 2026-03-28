import { useState, useEffect } from 'react'
import { StatCard, Loading } from '../../components/Shared'
import { getAdminMetrics } from '../../utils/api'

export default function MetricsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminMetrics().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (!data) return <p className="text-gray-400 text-[13px]">No metrics available</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total API Calls"     value={(data.totalApiCalls || 0).toLocaleString()}     icon="chart"     color="brand" />
        <StatCard label="Active Sessions"      value={data.activeSessions || 0}                      icon="users"     color="success" />
        <StatCard label="Avg Response Time"    value={`${data.avgResponseMs || 0}ms`}                icon="trending"  color="warn" />
        <StatCard label="Error Rate"           value={`${data.errorRate || 0}%`}                     icon="file"      color="danger" />
      </div>
      {data.breakdown && (
        <div className="card p-5">
          <h3 className="text-[13px] font-bold mb-4">API Calls by Endpoint</h3>
          <div className="space-y-2">
            {Object.entries(data.breakdown).map(([endpoint, count]) => (
              <div key={endpoint} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="font-mono text-[12px] text-gray-600">{endpoint}</span>
                <span className="text-[12px] font-medium tabular-nums">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
