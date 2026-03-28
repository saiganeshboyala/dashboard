import { useToast } from '../../context/ToastContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, statusBadgeColor } from '../../components/Shared'
import { getStudents } from '../../utils/api'

export default function RecStudentsPage() {
  const toast = useToast()
  const nav = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getStudents().then(d => setStudents(d.students || [])).finally(() => setLoading(false)) }, [])
  return (
    <Page title="My Students" subtitle={`${students.length} students assigned`}>
      <DataTable columns={[
        { key: 'firstName', label: 'Name', render: (v, r) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[11px] font-bold">{(v||'?')[0]}</div>
            <span className="font-medium">{v} {r.lastName || ''}</span>
          </div>
        )},
        { key: 'technology',     label: 'Tech',    render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
        { key: 'visaStatus',     label: 'Visa',    render: v => v ? <Badge color="gray">{v}</Badge> : '—' },
        { key: 'batch',          label: 'Batch',   render: v => v ? <Badge color="purple">{v}</Badge> : '—' },
        { key: 'marketingStatus',label: 'Status',  render: v => <Badge color={statusBadgeColor(v)} dot>{v || '—'}</Badge> },
        { key: 'daysInMarket',   label: 'Days',    render: v => v != null ? <span className={v > 60 ? 'text-danger-600 font-medium' : ''}>{v}d</span> : '—' },
        { key: '_count',         label: 'Activity',render: (_, r) => <span className="text-[11px] text-gray-400">{r._count?.submissions || 0}s · {r._count?.interviews || 0}i</span> },
      ]} rows={students} loading={loading} onRowClick={r => nav(`/rec/records/students/${r.id}`)} emptyText="No students assigned" />
    </Page>
  )
}
