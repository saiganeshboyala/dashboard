import { useToast } from '../../context/ToastContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, statusBadgeColor } from '../../components/Shared'
import { getStudents } from '../../utils/api'

export default function BUStudentsPage() {
  const toast = useToast()
  const nav = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getStudents().then(d => setStudents(d.students || [])).finally(() => setLoading(false)) }, [])
  return (
    <Page title="Students" subtitle={`${students.length} students`}>
      <DataTable columns={[
        { key: 'firstName', label: 'Name', render: (v, r) => <span className="font-medium">{v} {r.lastName || ''}</span> },
        { key: 'technology',      label: 'Tech',      render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
        { key: 'visaStatus',      label: 'Visa',      render: v => v ? <Badge color="gray">{v}</Badge> : '—' },
        { key: 'batch',           label: 'Batch',     render: v => v ? <Badge color="purple">{v}</Badge> : '—' },
        { key: 'marketingStatus', label: 'Status',    render: v => <Badge color={statusBadgeColor(v)} dot>{v || '—'}</Badge> },
        { key: 'recruiter',       label: 'Recruiter', render: (_, r) => r.recruiter?.name || '—' },
        { key: 'daysInMarket',    label: 'Days',      render: v => v != null ? `${v}d` : '—' },
      ]} rows={students} loading={loading} onRowClick={r => nav(`/bu/records/students/${r.id}`)} emptyText="No students" />
    </Page>
  )
}
