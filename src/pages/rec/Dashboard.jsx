import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, StatCard, DataTable, Badge, Loading, statusBadgeColor, Button } from '../../components/Shared'
import { getStudents, getSubmissions, getInterviews, getUpcomingInterviews } from '../../utils/api'
import { getUser } from '../../utils/auth'

export default function RecDashboard() {
  const user = getUser()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ students: 0, subs: 0, interviews: 0, upcoming: 0 })
  const [upcoming, setUpcoming] = useState([])
  const [recentStudents, setRecentStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getStudents('limit=5').catch(() => ({ students: [], total: 0 })),
      getSubmissions('limit=1').catch(() => ({ total: 0 })),
      getInterviews('limit=1').catch(() => ({ total: 0 })),
      getUpcomingInterviews().catch(() => ({ interviews: [] })),
    ]).then(([s, sub, int, up]) => {
      setStats({
        students: s.total ?? s.students?.length ?? 0,
        subs:     sub.total ?? 0,
        interviews: int.total ?? 0,
        upcoming: up.interviews?.length ?? 0,
      })
      setRecentStudents(s.students?.slice(0, 5) || [])
      setUpcoming(up.interviews?.slice(0, 5) || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Page title="Dashboard"><Loading /></Page>

  return (
    <Page
      title={`Hey, ${user?.name || 'Recruiter'}!`}
      subtitle="Your recruitment dashboard"
      actions={
        <Button size="sm" onClick={() => navigate('/rec/submit')}>+ Add Submission</Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="My Students"    value={stats.students}   icon="users"     color="brand" />
        <StatCard label="Submissions"    value={stats.subs}       icon="file"      color="gray" />
        <StatCard label="Interviews"     value={stats.interviews} icon="calendar"  color="warn" />
        <StatCard label="Upcoming"       value={stats.upcoming}   icon="briefcase" color="success" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming Interviews */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-800">Upcoming Interviews</h3>
          </div>
          <DataTable
            searchable={false}
            pageSize={5}
            columns={[
              { key: 'clientName',    label: 'Client',  render: v => <span className="font-medium">{v || '—'}</span> },
              { key: 'student',       label: 'Student', render: (_, r) => `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || '—' },
              { key: 'scheduledAt',   label: 'Date',    render: v => v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—' },
              { key: 'interviewType', label: 'Round',   render: v => v ? <Badge color="teal">{v}</Badge> : '—' },
              { key: 'finalStatus',   label: 'Status',  render: v => v ? <Badge color={statusBadgeColor(v)} dot>{v}</Badge> : <Badge color="gray">Pending</Badge> },
            ]}
            rows={upcoming}
            emptyText="No upcoming interviews"
          />
        </div>

        {/* Recent Students */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-800">My Students</h3>
            <button onClick={() => navigate('/rec/students')} className="text-[11px] text-brand-600 hover:underline">View all</button>
          </div>
          <DataTable
            searchable={false}
            pageSize={5}
            columns={[
              { key: 'firstName',       label: 'Name',   render: (v, r) => <span className="font-medium">{v} {r.lastName || ''}</span> },
              { key: 'technology',      label: 'Tech',   render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
              { key: 'visaStatus',      label: 'Visa',   render: v => v ? <Badge color="gray">{v}</Badge> : '—' },
              { key: 'batch',           label: 'Batch',  render: v => v ? <Badge color="purple">{v}</Badge> : '—' },
              { key: 'marketingStatus', label: 'Status', render: v => <Badge color={statusBadgeColor(v)} dot>{v || '—'}</Badge> },
              { key: 'daysInMarket',    label: 'Days',   render: v => v != null ? `${v}d` : '—' },
            ]}
            rows={recentStudents}
            onRowClick={r => navigate(`/head/records/students/${r.id}`)}
            emptyText="No students assigned"
          />
        </div>
      </div>
    </Page>
  )
}
