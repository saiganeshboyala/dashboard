import { useState, useEffect } from 'react'
import { Page, StatCard, DataTable, Badge, Loading, Alert, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getMe, getStudents, getInterviews, getSubmissions } from '../../utils/api'
import { getUser } from '../../utils/auth'
import { Target, FileText, CalendarCheck, TrendingUp } from 'lucide-react'

export default function StuDashboard() {
  const toast = useToast()
  const user = getUser()
  const [submissions, setSubmissions] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSubmissions('limit=5').catch(() => ({ submissions: [] })),
      getInterviews('limit=5').catch(() => ({ interviews: [] })),
    ]).then(([s, i]) => {
      setSubmissions(s.submissions || [])
      setInterviews(i.interviews || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Page title="Dashboard"><Loading /></Page>

  const upcoming = interviews.filter(i => !i.finalStatus)
  const placed = interviews.filter(i => i.finalStatus === 'Passed').length

  return (
    <Page title={`Welcome, ${user?.name || 'Student'}!`} subtitle="Your placement dashboard">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Submissions"      value={submissions.length} icon="file"      color="brand" />
        <StatCard label="Upcoming Int."    value={upcoming.length}    icon="calendar"  color="warn" />
        <StatCard label="Placements"       value={placed}             icon="briefcase" color="success" />
      </div>

      {upcoming.length > 0 && (
        <Alert type="info" className="mb-6">
          You have {upcoming.length} upcoming interview{upcoming.length > 1 ? 's' : ''} scheduled.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-[13px] font-bold text-gray-900 mb-3">Recent Submissions</h3>
          <DataTable searchable={false} pageSize={5} columns={[
            { key: 'clientName', label: 'Client', render: v => <span className="font-medium">{v || '—'}</span> },
            { key: 'vendorCompany', label: 'Vendor' },
            { key: 'rate', label: 'Rate', render: v => v ? `$${v}/hr` : '—' },
            { key: 'status', label: 'Status', render: v => <Badge color={statusBadgeColor(v)}>{v || 'submitted'}</Badge> },
          ]} rows={submissions} emptyText='No submissions yet' />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-gray-900 mb-3">Interviews</h3>
          <DataTable searchable={false} pageSize={5} columns={[
            { key: 'clientName', label: 'Client', render: v => <span className="font-medium">{v || '—'}</span> },
            { key: 'interviewType', label: 'Type' },
            { key: 'scheduledAt', label: 'Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
            { key: 'finalStatus', label: 'Result', render: v => <Badge color={statusBadgeColor(v)} dot>{v || 'Pending'}</Badge> },
          ]} rows={interviews} emptyText='No interviews yet' />
        </div>
      </div>
    </Page>
  )
}
