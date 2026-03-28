import { useToast } from '../../context/ToastContext'
import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, statusBadgeColor } from '../../components/Shared'
import { getSubmissions } from '../../utils/api'

export default function MySubmissionsPage() {
  const toast = useToast()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getSubmissions().then(d => setSubmissions(d.submissions || [])).finally(() => setLoading(false)) }, [])
  return (
    <Page title="My Submissions" subtitle={`${submissions.length} submissions`}>
      <DataTable columns={[
        { key: 'clientName',    label: 'Client',   render: v => <span className="font-medium">{v || '—'}</span> },
        { key: 'vendorCompany', label: 'Vendor' },
        { key: 'rate',          label: 'Rate',     render: v => v ? `$${v}/hr` : '—' },
        { key: 'status',        label: 'Status',   render: v => <Badge color={statusBadgeColor(v)}>{v || 'submitted'}</Badge> },
        { key: 'submittedAt',   label: 'Date',     render: v => v ? new Date(v).toLocaleDateString() : '—' },
      ]} rows={submissions} loading={loading} emptyText="No submissions yet" />
    </Page>
  )
}
