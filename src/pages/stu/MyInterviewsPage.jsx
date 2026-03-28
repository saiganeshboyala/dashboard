import { useToast } from '../../context/ToastContext'
import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, statusBadgeColor } from '../../components/Shared'
import { getInterviews } from '../../utils/api'

export default function MyInterviewsPage() {
  const toast = useToast()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getInterviews().then(d => setInterviews(d.interviews || [])).finally(() => setLoading(false)) }, [])
  return (
    <Page title="My Interviews" subtitle={`${interviews.length} interviews`}>
      <DataTable columns={[
        { key: 'clientName',    label: 'Client',  render: v => <span className="font-medium">{v || '—'}</span> },
        { key: 'interviewType', label: 'Type',    render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
        { key: 'scheduledAt',   label: 'Date',    render: v => v ? new Date(v).toLocaleString() : '—' },
        { key: 'finalStatus',   label: 'Result',  render: v => <Badge color={statusBadgeColor(v)} dot>{v || 'Pending'}</Badge> },
        { key: 'billRate',      label: 'Rate',    render: v => v ? `$${v}/hr` : '—' },
      ]} rows={interviews} loading={loading} emptyText="No interviews scheduled" />
    </Page>
  )
}
