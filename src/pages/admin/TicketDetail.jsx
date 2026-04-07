import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loading, Badge, Button, Textarea, Select } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminTicket, replyToTicket, put } from '../../utils/api'
import { ArrowLeft, Send } from 'lucide-react'

export default function TicketDetail() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast()
  const [ticket, setTicket] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState(''); const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = async () => {
    try {
      const data = await getAdminTicket(id)
      setTicket(data?.ticket || data)
      setReplies(data?.replies || data?.messages || [])
    } catch { toast.error('Failed to load ticket') }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const handleReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await replyToTicket(id, { body: reply })
      toast.success('Reply sent'); setReply(''); load()
    } catch (e) { toast.error(e.message) }
    setSending(false)
  }

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await put(`/api/v1/admin/tickets/${id}`, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      load()
    } catch (e) { toast.error(e.message) }
    setUpdatingStatus(false)
  }

  if (loading) return <Loading />
  if (!ticket) return <div className="p-6 text-gray-400">Ticket not found</div>

  const statusColor = { open: 'blue', in_progress: 'amber', resolved: 'green', closed: 'gray' }

  return (
    <div className="max-w-3xl">
      <button onClick={() => nav('/admin/tickets')} className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={13} /> Back</button>

      <div className="bg-white border border-gray-200 rounded-xl shadow-card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">{ticket.subject}</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              #{ticket.ticket_number || ticket.id} · {ticket.tenant_name || ticket.tenantName || 'Unknown tenant'}
              {ticket.user_name || ticket.userName ? ` · ${ticket.user_name || ticket.userName}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={statusColor[ticket.status] || 'gray'} dot>{ticket.status}</Badge>
            <Select value={ticket.status} onChange={e => handleStatusChange(e.target.value)} className="text-[12px] w-32" disabled={updatingStatus}>
              {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {ticket.priority && (
          <div className="mb-2">
            <Badge color={ticket.priority === 'critical' ? 'red' : ticket.priority === 'high' ? 'amber' : 'gray'}>
              Priority: {ticket.priority}
            </Badge>
          </div>
        )}

        {(ticket.body || ticket.description) && (
          <div className="p-4 bg-gray-50 rounded-xl text-[13px] text-gray-700 mb-4">
            {ticket.body || ticket.description}
          </div>
        )}
      </div>

      {/* Replies thread */}
      <div className="space-y-3 mb-6">
        {replies.length === 0 && (
          <p className="text-[12px] text-gray-400 text-center py-4">No replies yet</p>
        )}
        {replies.map((m, i) => {
          const isStaff = m.is_staff_reply ?? m.is_admin ?? false
          return (
            <div key={m.id || i} className={`p-4 rounded-xl text-[13px] ${isStaff ? 'bg-brand-50 border border-brand-100 ml-8' : 'bg-gray-50 border border-gray-100 mr-8'}`}>
              <p className="font-medium text-[11px] text-gray-500 mb-1">
                {isStaff ? 'Staff' : (m.author_name || m.user_name || 'Customer')} · {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
              </p>
              <p className="text-gray-800 whitespace-pre-wrap">{m.body || m.message}</p>
            </div>
          )
        })}
      </div>

      {/* Reply form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-card p-4 space-y-3">
        <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." rows={3} />
        <div className="flex justify-end">
          <Button onClick={handleReply} loading={sending}><Send size={13} /> Send Reply</Button>
        </div>
      </div>
    </div>
  )
}
