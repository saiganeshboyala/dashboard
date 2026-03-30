import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Video, Clock, Users, Trash2, ExternalLink } from 'lucide-react'
import { get, del } from '../../utils/api'
import { Page } from '../../components/ui/Page'
import { Loading } from '../../components/ui/Loading'
import { useToast } from '../../context/ToastContext'

export default function ScheduledCallsPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [calls, setCalls]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)
  const [form, setForm] = useState({ title: '', scheduledAt: '', durationMinutes: 30, description: '' })
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await get('/api/v1/video/scheduled')
      setCalls(Array.isArray(data) ? data : [])
    } catch { setCalls([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const cancel = async (id) => {
    try {
      await del(`/api/v1/video/scheduled/${id}`)
      toast.success('Call cancelled')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const schedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/v1/video/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rp_token')}` },
        body: JSON.stringify(form),
      })
      toast.success('Call scheduled!')
      setShowSchedule(false)
      setForm({ title: '', scheduledAt: '', durationMinutes: 30, description: '' })
      load()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const formatDateTime = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <Page
      title="Scheduled Calls"
      subtitle="Upcoming video calls"
      actions={
        <button
          onClick={() => setShowSchedule(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <Calendar size={14} /> Schedule Call
        </button>
      }
    >
      {loading ? (
        <div className="py-16"><Loading /></div>
      ) : calls.length === 0 ? (
        <div className="py-20 text-center">
          <Video size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-[14px]">No upcoming scheduled calls</p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map(call => (
            <div key={call.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-4">
              {/* Date badge */}
              <div className="shrink-0 w-14 text-center">
                <div className="text-[11px] font-semibold text-brand-600 uppercase">
                  {new Date(call.scheduled_at).toLocaleDateString([], { month: 'short' })}
                </div>
                <div className="text-[22px] font-bold text-gray-800 leading-tight">
                  {new Date(call.scheduled_at).getDate()}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-gray-800 truncate">{call.title}</h3>
                {call.description && (
                  <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1">{call.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[12px] text-gray-500">
                    <Clock size={12} />
                    {formatDateTime(call.scheduled_at)}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-gray-500">
                    <Clock size={12} />
                    {call.duration_minutes} min
                  </span>
                  {call.participant_user_ids?.length > 0 && (
                    <span className="flex items-center gap-1 text-[12px] text-gray-500">
                      <Users size={12} />
                      {call.participant_user_ids.length} participants
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">by {call.scheduled_by_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Join if within 10 minutes */}
                {Math.abs(new Date(call.scheduled_at) - new Date()) < 10 * 60 * 1000 && (
                  <button
                    onClick={() => navigate(`/call/${call.room_id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[12px] font-semibold rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} /> Join
                  </button>
                )}
                <button
                  onClick={() => cancel(call.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="Cancel call"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-[16px] font-bold text-gray-800 mb-4">Schedule a Call</h3>
            <form onSubmit={schedule} className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Title</label>
                <input required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Interview prep with Priyanka"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Date & Time</label>
                <input required type="datetime-local" value={form.scheduledAt}
                  onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Duration</label>
                <select value={form.durationMinutes}
                  onChange={e => setForm(p => ({ ...p, durationMinutes: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand-500">
                  {[15, 30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Agenda, notes…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowSchedule(false)}
                  className="flex-1 py-2 text-[13px] border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 text-[13px] font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50">
                  {saving ? 'Scheduling…' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  )
}
