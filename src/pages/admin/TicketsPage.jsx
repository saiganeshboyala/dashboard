import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, Badge, Button, Select } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminTickets } from '../../utils/api'
import { RefreshCw } from 'lucide-react'

export default function TicketsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const q = filter ? `status=${filter}` : ''
      const data = await getAdminTickets(q)
      setTickets(Array.isArray(data) ? data : data?.tickets || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-40">
          <option value="">All tickets</option>
          {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s}>{s}</option>)}
        </Select>
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
      </div>
      <DataTable
        columns={[
          { key: 'ticket_number', label: '#', render: v => <span className="font-mono text-[11px] font-medium">#{v || '—'}</span> },
          { key: 'subject', label: 'Subject', render: v => <span className="font-medium">{v}</span> },
          { key: 'tenant_name', label: 'Tenant' },
          { key: 'priority', label: 'Priority', render: v => <Badge color={v === 'critical' ? 'red' : v === 'high' ? 'amber' : 'gray'}>{v || 'normal'}</Badge> },
          { key: 'status', label: 'Status', render: v => <Badge color={v === 'open' ? 'blue' : v === 'resolved' ? 'green' : 'gray'} dot>{v}</Badge> },
          { key: 'created_at', label: 'Created', render: v => v ? new Date(v).toLocaleDateString() : '—' },
        ]}
        rows={tickets}
        loading={loading}
        onRowClick={r => nav(`/admin/tickets/${r.id}`)}
        emptyText="No tickets"
      />
    </div>
  )
}
