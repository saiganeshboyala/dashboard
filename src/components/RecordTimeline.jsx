// RecordTimeline - Activities, Notes, Attachments, and Email tabs for any record
import { useState, useEffect, useRef } from 'react'
import { Badge, Button, Input, Textarea, Modal } from './Shared'
import { useToast } from '../context/ToastContext'
import { getToken } from '../utils/auth'
import {
  MessageSquare, Paperclip, Mail, Clock, Plus, Send,
  CheckCircle, Phone, Video, Users, FileText, X, Download, Upload
} from 'lucide-react'

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts.headers },
  })
  const json = await res.json()
  if (json.success !== undefined) { if (!json.success) throw new Error(json.error?.message || 'Failed'); return json.data || json }
  return json
}

const ACTIVITY_TYPES = [
  { value: 'call',    label: 'Call',     icon: Phone },
  { value: 'email',   label: 'Email',    icon: Mail },
  { value: 'meeting', label: 'Meeting',  icon: Video },
  { value: 'task',    label: 'Task',     icon: CheckCircle },
  { value: 'note',    label: 'Note',     icon: MessageSquare },
]

export default function RecordTimeline({ objectType, objectId }) {
  const toast = useToast()
  const [tab, setTab] = useState('activity')
  const [activities, setActivities] = useState([])
  const [notes, setNotes] = useState([])
  const [attachments, setAttachments] = useState([])
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)

  // New activity/note forms
  const [newNote, setNewNote] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [actModal, setActModal] = useState(false)
  const [actForm, setActForm] = useState({ type: 'call' })
  const [postingAct, setPostingAct] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({})
  const [sendingEmail, setSendingEmail] = useState(false)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    if (!objectId || !objectType) return
    setLoading(true)
    try {
      const [acts, nts, atts] = await Promise.all([
        api(`/api/v1/activities?objectType=${objectType}&objectId=${objectId}`).catch(() => []),
        api(`/api/v1/activities/notes?objectType=${objectType}&objectId=${objectId}`).catch(() => []),
        api(`/api/v1/attachments?objectType=${objectType}&objectId=${objectId}`).catch(() => []),
      ])
      setActivities(Array.isArray(acts) ? acts : acts?.activities || [])
      setNotes(Array.isArray(nts) ? nts : nts?.notes || [])
      setAttachments(Array.isArray(atts) ? atts : atts?.attachments || [])
    } catch (e) { toast.error('Failed to load timeline') }
    setLoading(false)
  }

  const loadEmails = async () => {
    try {
      const data = await api(`/api/v1/email/messages?objectType=${objectType}&objectId=${objectId}`)
      setEmails(Array.isArray(data) ? data : data?.messages || [])
    } catch (e) { setEmails([]) }
  }

  useEffect(() => {
    if (objectId && objectType) load()
  }, [objectId, objectType])

  useEffect(() => {
    if (tab === 'emails') loadEmails()
  }, [tab])

  const postNote = async () => {
    if (!newNote.trim()) return
    setPostingNote(true)
    try {
      await api('/api/v1/activities/notes', {
        method: 'POST',
        body: JSON.stringify({ objectType, objectId, content: newNote }),
      })
      toast.success('Note added')
      setNewNote('')
      load()
    } catch (e) { toast.error(e.message) }
    setPostingNote(false)
  }

  const logActivity = async () => {
    if (!actForm.subject) return toast.error('Subject is required')
    setPostingAct(true)
    try {
      await api('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify({ ...actForm, objectType, objectId }),
      })
      toast.success('Activity logged')
      setActModal(false); setActForm({ type: 'call' }); load()
    } catch (e) { toast.error(e.message) }
    setPostingAct(false)
  }

  const sendEmail = async () => {
    if (!emailForm.to || !emailForm.subject) return toast.error('To and subject are required')
    setSendingEmail(true)
    try {
      await api('/api/v1/email/send', {
        method: 'POST',
        body: JSON.stringify({ ...emailForm, objectType, objectId }),
      })
      toast.success('Email sent')
      setEmailModal(false); setEmailForm({}); loadEmails(); if (tab !== 'emails') setTab('emails')
    } catch (e) { toast.error(e.message) }
    setSendingEmail(false)
  }

  const uploadFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      // Convert to base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      await api('/api/v1/attachments', {
        method: 'POST',
        body: JSON.stringify({
          objectType, objectId,
          fileName: file.name, fileSize: file.size,
          mimeType: file.type, data: base64,
        }),
      })
      toast.success(`${file.name} uploaded`)
      load()
    } catch (e) { toast.error(e.message) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const completeActivity = async (id) => {
    try {
      await api(`/api/v1/activities/${id}/complete`, { method: 'PUT' })
      toast.success('Marked complete')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const deleteAttachment = async (id) => {
    try {
      await api(`/api/v1/attachments/${id}`, { method: 'DELETE' })
      toast.success('Attachment removed')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const actTypeMap = Object.fromEntries(ACTIVITY_TYPES.map(a => [a.value, a]))

  const tabs = [
    { id: 'activity',    label: `Activity (${activities.length})` },
    { id: 'notes',       label: `Notes (${notes.length})` },
    { id: 'attachments', label: `Files (${attachments.length})` },
    { id: 'emails',      label: 'Emails' },
  ]

  return (
    <div className="card overflow-hidden">
      {/* Tab bar + actions */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                tab === t.id ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="secondary" onClick={() => setActModal(true)}><Plus size={11} /> Log Activity</Button>
          <Button size="xs" variant="secondary" onClick={() => setEmailModal(true)}><Mail size={11} /> Send Email</Button>
          <input ref={fileRef} type="file" className="hidden" onChange={e => uploadFile(e.target.files[0])} />
          <Button size="xs" variant="secondary" onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload size={11} /> Attach
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4">

        {/* ACTIVITY TAB */}
        {tab === 'activity' && (
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 w-full" />)
            ) : activities.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-6 text-center">No activities logged yet</p>
            ) : (
              activities.map((act, i) => {
                const ActIcon = actTypeMap[act.type]?.icon || Clock
                return (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      act.is_completed ? 'bg-success-50' : 'bg-gray-100'
                    }`}>
                      <ActIcon size={13} className={act.is_completed ? 'text-success-500' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13px] font-medium text-gray-900">{act.subject || act.title || 'Activity'}</p>
                        <Badge color={act.type === 'call' ? 'blue' : act.type === 'email' ? 'purple' : act.type === 'meeting' ? 'teal' : 'gray'}>
                          {act.type}
                        </Badge>
                        {act.is_completed && <Badge color="green">Done</Badge>}
                      </div>
                      {act.description && <p className="text-[11px] text-gray-500">{act.description}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {act.created_by_name || 'You'} · {act.created_at ? new Date(act.created_at).toLocaleString() : '—'}
                      </p>
                    </div>
                    {!act.is_completed && (
                      <button onClick={() => completeActivity(act.id)}
                        className="p-1 text-gray-300 hover:text-success-500 transition-colors shrink-0">
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {tab === 'notes' && (
          <div>
            <div className="space-y-2 mb-4">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-16 w-full" />)
              ) : notes.length === 0 ? (
                <p className="text-[13px] text-gray-400 py-4 text-center">No notes yet. Add the first one below.</p>
              ) : (
                notes.map((note, i) => (
                  <div key={i} className="bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-[13px] text-gray-800 whitespace-pre-wrap">{note.content || note.body}</p>
                    <p className="text-[11px] text-gray-400 mt-2">
                      {note.created_by_name || 'You'} · {note.created_at ? new Date(note.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="flex-1"
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) postNote() }}
              />
              <Button size="sm" onClick={postNote} loading={postingNote} disabled={!newNote.trim()}>
                <Send size={12} />
              </Button>
            </div>
          </div>
        )}

        {/* ATTACHMENTS TAB */}
        {tab === 'attachments' && (
          <div>
            {loading ? (
              <div className="skeleton h-24 w-full" />
            ) : attachments.length === 0 ? (
              <div className="text-center py-8">
                <Paperclip size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] text-gray-400">No files attached</p>
                <p className="text-[11px] text-gray-300 mt-0.5">Click "Attach" above to upload</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 truncate">{att.file_name || att.fileName}</p>
                      <p className="text-[11px] text-gray-400">
                        {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB · ` : ''}
                        {att.created_at ? new Date(att.created_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {att.download_url && (
                        <a href={att.download_url} target="_blank" rel="noreferrer"
                          className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors">
                          <Download size={13} />
                        </a>
                      )}
                      <button onClick={() => deleteAttachment(att.id)}
                        className="p-1.5 text-gray-300 hover:text-danger-500 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EMAILS TAB */}
        {tab === 'emails' && (
          <div className="space-y-2">
            {emails.length === 0 ? (
              <div className="text-center py-8">
                <Mail size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] text-gray-400">No emails sent to this record</p>
                <p className="text-[11px] text-gray-300 mt-0.5">Click "Send Email" above to compose</p>
              </div>
            ) : (
              emails.map((em, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{em.subject}</p>
                      <p className="text-[11px] text-gray-400">To: {em.to} · {em.sent_at ? new Date(em.sent_at).toLocaleString() : '—'}</p>
                    </div>
                    <Badge color={em.status === 'delivered' ? 'green' : em.status === 'failed' ? 'red' : 'gray'}>{em.status || 'sent'}</Badge>
                  </div>
                  {em.body_text && (
                    <div className="px-4 py-3 text-[12px] text-gray-600 max-h-24 overflow-y-auto">{em.body_text}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      <Modal open={actModal} onClose={() => { setActModal(false); setActForm({ type: 'call' }) }} title="Log Activity"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setActModal(false); setActForm({ type: 'call' }) }}>Cancel</Button>
            <Button onClick={logActivity} loading={postingAct}>Log Activity</Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="field-label">Activity Type</label>
            <div className="flex gap-2 mt-1.5">
              {ACTIVITY_TYPES.map(at => {
                const Icon = at.icon
                return (
                  <button key={at.value} onClick={() => setActForm(f => ({ ...f, type: at.value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      actForm.type === at.value ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}>
                    <Icon size={12} /> {at.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Input label="Subject" required value={actForm.subject || ''} onChange={e => setActForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g., Called to discuss interview feedback" />
          <Textarea label="Notes" value={actForm.description || ''} onChange={e => setActForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <Input label="Due Date" type="datetime-local" value={actForm.due_date || ''} onChange={e => setActForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </Modal>

      {/* Send Email Modal */}
      <Modal open={emailModal} onClose={() => { setEmailModal(false); setEmailForm({}) }} title="Send Email" width="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setEmailModal(false); setEmailForm({}) }}>Cancel</Button>
            <Button onClick={sendEmail} loading={sendingEmail}><Send size={13} /> Send</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="To" required type="email" value={emailForm.to || ''} onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))} placeholder="recipient@company.com" />
          <Input label="CC" type="email" value={emailForm.cc || ''} onChange={e => setEmailForm(f => ({ ...f, cc: e.target.value }))} placeholder="optional" />
          <Input label="Subject" required value={emailForm.subject || ''} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Body" required value={emailForm.body || ''} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={6} placeholder="Write your email..." />
        </div>
      </Modal>
    </div>
  )
}
