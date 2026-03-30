import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Loading } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getNotifications, markNotificationRead, markAllRead } from '../../utils/api'
import { Bell, BellOff, Check, CheckCheck, RefreshCw } from 'lucide-react'

export default function NotificationsPage() {
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const q = unreadOnly ? 'unreadOnly=true' : ''
      const data = await getNotifications(q)
      setNotifications(Array.isArray(data) ? data : data?.notifications || data?.data || [])
    } catch (e) { toast.error('Failed to load notifications') }
    setLoading(false)
  }

  useEffect(() => { load() }, [unreadOnly])

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    } catch (e) { toast.error(e.message) }
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await markAllRead()
      toast.success('All notifications marked as read')
      load()
    } catch (e) { toast.error(e.message) }
    setMarkingAll(false)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const typeColors = {
    placement: 'green', interview: 'blue', submission: 'purple',
    system: 'gray', warning: 'amber', alert: 'red',
  }

  return (
    <Page
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-all ${
              unreadOnly ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {unreadOnly ? <BellOff size={14} /> : <Bell size={14} />}
            {unreadOnly ? 'Showing unread' : 'Show unread only'}
          </button>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAll} loading={markingAll}>
              <CheckCheck size={13} /> Mark all read
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
        </div>
      }
    >
      <DataTable
        columns={[
          {
            key: 'type_icon', label: '', sortable: false,
            render: (_, r) => (
              <Bell size={14} className="text-gray-400" />
            ),
          },
          {
            key: 'title', label: 'Notification',
            render: (v, r) => (
              <div>
                <p className={`text-[13px] ${!r.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{v || '—'}</p>
                {r.message && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{r.message}</p>}
              </div>
            ),
          },
          {
            key: 'type', label: 'Type',
            render: v => <Badge color={typeColors[v] || 'gray'}>{v || 'system'}</Badge>,
          },
          {
            key: 'is_read', label: 'Status',
            render: v => <Badge color={v ? 'gray' : 'blue'} dot>{v ? 'Read' : 'Unread'}</Badge>,
          },
          {
            key: 'created_at', label: 'When',
            render: v => {
              if (!v) return '—'
              const d = new Date(v)
              const diff = Date.now() - d.getTime()
              const mins = Math.floor(diff / 60000)
              const hrs = Math.floor(mins / 60)
              const days = Math.floor(hrs / 24)
              if (mins < 1) return 'just now'
              if (mins < 60) return `${mins}m ago`
              if (hrs < 24) return `${hrs}h ago`
              return `${days}d ago`
            },
          },
          {
            key: 'actions', label: '', sortable: false,
            render: (_, r) => !r.is_read ? (
              <Button size="xs" variant="ghost" onClick={e => { e.stopPropagation(); handleMarkRead(r.id) }}>
                <Check size={11} /> Mark read
              </Button>
            ) : null,
          },
        ]}
        rows={notifications}
        loading={loading}
        emptyText={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
      />
    </Page>
  )
}
