import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, StatCard, DataTable, Badge, Loading, statusBadgeColor, Button, Leaderboard } from '../../components/Shared'
import { getOverview, getStudents, getSubmissions } from '../../utils/api'
import { getUser } from '../../utils/auth'

export default function BUDashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [students, setStudents] = useState([])
  const [recentSubs, setRecentSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getOverview().catch(() => null),
      getStudents('limit=5').catch(() => ({ students: [], total: 0 })),
      getSubmissions('limit=5').catch(() => ({ submissions: [] })),
    ]).then(([o, s, sub]) => {
      setOverview(o)
      setStudents(s.students || [])
      setRecentSubs(sub.submissions || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Page title="BU Dashboard"><Loading /></Page>

  const placed = overview?.placed ?? 0
  const total = overview?.totalStudents ?? 0
  const placementRate = total > 0 ? ((placed / total) * 100).toFixed(1) : '0.0'

  return (
    <Page
      title="BU Dashboard"
      subtitle={user?.tenant?.name || 'Business Unit Overview'}
      actions={
        <Button size="sm" onClick={() => navigate('/bu/students')}>View Students</Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Students"
          value={overview?.totalStudents ?? '—'}
          icon="users"
          color="brand"
        />
        <StatCard
          label="In Market"
          value={overview?.inMarket ?? '—'}
          icon="trending"
          color="warn"
        />
        <StatCard
          label="Placements"
          value={placed}
          icon="briefcase"
          color="success"
        />
        <StatCard
          label="Placement Rate"
          value={`${placementRate}%`}
          icon="chart"
          color={parseFloat(placementRate) > 15 ? 'success' : 'warn'}
        />
      </div>

      {/* Leaderboard — full width */}
      <Leaderboard className="mb-6" />

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Students */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-800">Recent Students</h3>
            <button onClick={() => navigate('/bu/students')} className="text-[11px] text-brand-600 hover:underline">
              View all
            </button>
          </div>
          <DataTable
            searchable={false}
            pageSize={5}
            columns={[
              {
                key: 'firstName', label: 'Name',
                render: (v, r) => (
                  <div>
                    <p className="font-medium text-[13px]">{v} {r.lastName || ''}</p>
                    <p className="text-[11px] text-gray-400">{r.email || ''}</p>
                  </div>
                ),
              },
              { key: 'technology',      label: 'Tech',   render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
              { key: 'visaStatus',      label: 'Visa',   render: v => v ? <Badge color="gray">{v}</Badge> : '—' },
              { key: 'batch',           label: 'Batch',  render: v => v ? <Badge color="purple">{v}</Badge> : '—' },
              { key: 'marketingStatus', label: 'Status', render: v => <Badge color={statusBadgeColor(v)} dot>{v || '—'}</Badge> },
              { key: 'daysInMarket',    label: 'Days',   render: v => v != null ? (
                <span className={v > 90 ? 'text-danger-600 font-medium' : v > 60 ? 'text-warn-600 font-medium' : ''}>{v}d</span>
              ) : '—' },
            ]}
            rows={students}
            onRowClick={r => navigate(`/bu/records/students/${r.id}`)}
            emptyText="No students in this BU yet"
          />
        </div>

        {/* Recent Submissions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-800">Recent Submissions</h3>
          </div>
          <DataTable
            searchable={false}
            pageSize={5}
            columns={[
              { key: 'clientName', label: 'Client',  render: v => <span className="font-medium">{v || '—'}</span> },
              { key: 'student',    label: 'Student', render: (_, r) => r.student ? `${r.student.firstName || ''} ${r.student.lastName || ''}`.trim() || '—' : '—' },
              { key: 'status',     label: 'Status',  render: v => v ? <Badge color={statusBadgeColor(v)}>{v}</Badge> : <Badge color="gray">Submitted</Badge> },
              { key: 'rate',       label: 'Rate',    render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
            ]}
            rows={recentSubs}
            emptyText="No submissions yet"
          />
        </div>
      </div>
    </Page>
  )
}
