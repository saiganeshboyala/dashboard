import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { getNotifications, markNotificationRead, markAllRead } from '../../utils/api'

const POLL_INTERVAL = 30_000 // 30 seconds

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationBell() {
  const navigate   = useNavigate()
  const [open, setOpen]       = useState(false)
  const [items, setItems]     = useState([])
  const [unread, setUnread]   = useState(0)
  const panelRef = useRef(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await getNotifications('limit=15')
      const list = Array.isArray(res) ? res : (res?.notifications || res?.data || [])
      setItems(list)
      setUnread(list.filter(n => !n.is_read).length)
    } catch {
      // silently ignore — notification fetch is best-effort
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifs()
    const id = setInterval(fetchNotifs, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchNotifs])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleClick(notif) {
    if (!notif.is_read) {
      await markNotificationRead(notif.id).catch(() => {})
      setItems(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnread(u => Math.max(0, u - 1))
    }
    setOpen(false)
    if (notif.object_type && notif.object_id) {
      navigate(`/head/dynamic/${notif.object_type}/${notif.object_id}`)
    }
  }

  async function handleMarkAll() {
    await markAllRead().catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-modal border border-gray-200 z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[13px] font-bold text-gray-900">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-[11px] text-brand-600 hover:underline flex items-center gap-1">
                  <CheckCheck size={11} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-gray-400">
                No notifications yet
              </div>
            ) : items.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 items-start ${!n.is_read ? 'bg-brand-50/40' : ''}`}
              >
                {!n.is_read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                )}
                {n.is_read && <span className="w-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] leading-snug ${n.is_read ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>
                    {n.title || n.body || 'New notification'}
                  </p>
                  {n.body && n.title && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.body}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
