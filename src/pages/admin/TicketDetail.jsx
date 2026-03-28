import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loading, Badge, Button, Textarea } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminTicket, replyToTicket } from '../../utils/api'
import { ArrowLeft, Send } from 'lucide-react'

export default function TicketDetail() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast()
  const [ticket, setTicket] = useState(null); const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState(''); const [sending, setSending] = useState(false)

  const load = () => getAdminTicket(id).then(setTicket).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  useEffect(() => { load() }, [id])

  const handleReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try { await replyToTicket(id, { message: reply }); toast.success('Reply sent'); setReply(''); load() }
    catch (e) { toast.error(e.message) }
    setSending(false)
  }

  if (loading) return <Loading />
  if (!ticket) return <div className="p-6 text-gray-400">Ticket not found</div>

  return (
    <div className="p-6">
      <button onClick={() => nav('/admin/tickets')} className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={13} /> Back</button>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold">{ticket.subject}</h2>
          <p className="text-[12px] text-gray-400">#{ticket.ticket_number} · {ticket.tenant_name}</p>
        </div>
        <Badge color={ticket.status === 'open' ? 'blue' : 'green'} dot>{ticket.status}</Badge>
      </div>
      <div className="space-y-3 mb-6">
        {(ticket.messages || []).map((m, i) => (
          <div key={i} className={`p-4 rounded-xl text-[13px] ${m.is_admin ? 'bg-brand-50 ml-8' : 'bg-gray-50 mr-8'}`}>
            <p className="font-medium text-[11px] text-gray-500 mb-1">{m.author_name} · {m.created_at ? new Date(m.created_at).toLocaleString() : ''}</p>
            <p className="text-gray-800">{m.message}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." rows={3} />
        <Button onClick={handleReply} loading={sending}><Send size={13} /> Send Reply</Button>
      </div>
    </div>
  )
}
