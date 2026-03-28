import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, Badge, Button, Loading, Modal, Textarea, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getCase, updateCase, addCaseComment } from '../../utils/api'
import { ArrowLeft, Send, Edit2 } from 'lucide-react'

export default function CaseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const data = await getCase(id)
      setCaseData(data?.case || data)
    } catch (e) { toast.error('Failed to load case') }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleComment = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await addCaseComment(id, { message: comment, isPublic: true })
      toast.success('Comment added')
      setComment('')
      load()
    } catch (e) { toast.error(e.message) }
    setSending(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCase(id, editForm)
      toast.success('Case updated')
      setEditModal(false)
      load()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <Page title="Loading..."><Loading /></Page>
  if (!caseData) return <Page title="Case Not Found"><p className="text-gray-400">Case #{id} not found.</p></Page>

  const c = caseData

  return (
    <Page
      title={c.subject || `Case #${id}`}
      subtitle={`#${c.case_number || id} · ${c.tenant_name || ''}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setEditForm({ status: c.status, priority: c.priority }); setEditModal(true) }}>
            <Edit2 size={13} /> Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => nav(-1)}><ArrowLeft size={13} /> Back</Button>
        </div>
      }
    >
      {/* Status row */}
      <div className="flex items-center gap-3 mb-6">
        <Badge color={c.status === 'open' ? 'blue' : c.status === 'resolved' ? 'green' : 'gray'} dot>{c.status || 'open'}</Badge>
        <Badge color={c.priority === 'high' || c.priority === 'critical' ? 'red' : c.priority === 'medium' ? 'amber' : 'gray'}>{c.priority || 'low'} priority</Badge>
        {c.type && <Badge color="purple">{c.type}</Badge>}
        <span className="text-[12px] text-gray-400 ml-auto">Opened {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-5">
          {/* Description */}
          {c.description && (
            <div className="card p-5">
              <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Description</h3>
              <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{c.description}</p>
            </div>
          )}

          {/* Comments */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                Comments ({c.comments?.length || 0})
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {(c.comments || []).map((cm, i) => (
                <div key={i} className={`px-5 py-4 ${cm.is_admin ? 'bg-brand-50/30' : ''}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                      {(cm.author_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-[12px] font-medium text-gray-800">{cm.author_name || 'User'}</span>
                    <span className="text-[11px] text-gray-400">{cm.created_at ? new Date(cm.created_at).toLocaleString() : ''}</span>
                    {cm.is_admin && <Badge color="blue">Staff</Badge>}
                  </div>
                  <p className="text-[13px] text-gray-700 pl-8 whitespace-pre-wrap">{cm.message}</p>
                </div>
              ))}
              {!c.comments?.length && (
                <div className="px-5 py-8 text-center text-[13px] text-gray-400">No comments yet</div>
              )}
            </div>
            {/* Add comment */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <Button size="sm" onClick={handleComment} loading={sending} disabled={!comment.trim()}>
                <Send size={12} /> Post Comment
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Details</h3>
            {[
              { label: 'Assigned To',  value: c.assignee?.name || c.assigned_to || 'Unassigned' },
              { label: 'Reported By',  value: c.reporter?.name || c.reported_by || '—' },
              { label: 'Account',      value: c.account_name || '—' },
              { label: 'Contact',      value: c.contact_name || '—' },
              { label: 'Created',      value: c.created_at ? new Date(c.created_at).toLocaleDateString() : '—' },
              { label: 'Last Updated', value: c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-[12px]">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-700 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Case"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="field-label">Status</label>
            <select value={editForm.status || ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="field-input">
              {['open', 'in_progress', 'waiting', 'resolved', 'closed'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Priority</label>
            <select value={editForm.priority || ''} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="field-input">
              {['low', 'medium', 'high', 'critical'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </Page>
  )
}
