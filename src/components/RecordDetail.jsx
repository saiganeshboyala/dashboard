import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loading, Badge, DataTable, Button, Modal, Input, Select, Textarea, statusBadgeColor } from './Shared'
import { useToast } from '../context/ToastContext'
import { getToken } from '../utils/auth'
import { getActivities, createActivity, getNotes, createNote, getAttachments, completeActivityById } from '../utils/api'
import { ArrowLeft, Edit3, ExternalLink } from 'lucide-react'

async function fetchRecord(objectType, id) {
  const res = await fetch(`/api/v1/records/${objectType}/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
  if (!res.ok) throw new Error('Failed to load record')
  return res.json()
}

async function updateRecord(objectType, id, data) {
  const res = await fetch(`/api/v1/${objectType}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update')
  return res.json()
}

function formatValue(field) {
  const v = field.value
  if (v === null || v === undefined || v === '') return <span className="text-gray-300">—</span>
  if (field.type === 'date' && v)     return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (field.type === 'datetime' && v) return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  if (field.type === 'currency' && v) return <span className="font-mono tabular-nums">${parseFloat(v).toLocaleString()}</span>
  if (field.type === 'percent' && v)  return `${v}%`
  if (field.type === 'score' && v)    return <span className="font-mono font-semibold">{v}/10</span>
  if (field.type === 'url' && v)      return <a href={v} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline flex items-center gap-1 text-sm">{String(v).slice(0, 50)} <ExternalLink size={11} /></a>
  if (field.type === 'longtext' && v) return <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">{v}</p>
  if (typeof v === 'boolean') return v ? <Badge color="green">Yes</Badge> : <Badge color="gray">No</Badge>
  return String(v)
}

const RELATED_COLS = {
  submissions: [
    { key: 'clientName',  label: 'Client',  render: v => <span className="font-medium">{v || '—'}</span> },
    { key: 'vendorCompany',label: 'Vendor' },
    { key: 'rate',        label: 'Rate',    render: v => v ? <span className="font-mono">${v}/hr</span> : '—' },
    { key: 'submittedAt', label: 'Date',    render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'status',      label: 'Status',  render: v => <Badge color={statusBadgeColor(v)}>{v || 'submitted'}</Badge> },
  ],
  interviews: [
    { key: 'clientName',    label: 'Client', render: v => <span className="font-medium">{v || '—'}</span> },
    { key: 'interviewType', label: 'Type' },
    { key: 'scheduledAt',   label: 'Date',   render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'finalStatus',   label: 'Result', render: v => <Badge color={statusBadgeColor(v)}>{v || 'Pending'}</Badge> },
    { key: 'billRate',      label: 'Rate',   render: v => v ? <span className="font-mono">${v}/hr</span> : '—' },
  ],
  students: [
    { key: 'firstName', label: 'Name', render: (v, r) => <span className="font-medium">{v} {r.lastName || ''}</span> },
    { key: 'technology', label: 'Tech' },
    { key: 'marketingStatus', label: 'Status', render: v => <Badge color={statusBadgeColor(v)}>{v || '—'}</Badge> },
    { key: 'daysInMarket', label: 'Days', render: v => v != null ? `${v}d` : '—' },
  ],
  placements: [
    { key: 'company',   label: 'Company', render: v => <span className="font-medium">{v || '—'}</span> },
    { key: 'role',      label: 'Role' },
    { key: 'billRate',  label: 'Rate',    render: v => v ? <span className="font-mono">${v}/hr</span> : '—' },
    { key: 'startDate', label: 'Start',   render: v => v ? new Date(v).toLocaleDateString() : '—' },
  ],
}

export default function RecordDetail({ objectType: propType, basePath = '/head' }) {
  const { type: urlType, id } = useParams()
  const objectType = urlType || propType
  const navigate = useNavigate()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [activities, setActivities] = useState([])
  const [notes, setNotes] = useState([])
  const [attachments, setAttachments] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [activityTab, setActivityTab] = useState('notes')
  const [newNote, setNewNote] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const d = await fetchRecord(objectType, id)
      setData(d)
      const keys = Object.keys(d.related || {})
      if (keys.length > 0) setActiveTab(keys[0])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadActivity = async () => {
    if (!objectType || !id) return
    setLoadingActivity(true)
    try {
      const [act, nts, att] = await Promise.all([
        getActivities(objectType, id).catch(() => []),
        getNotes(objectType, id).catch(() => []),
        getAttachments(objectType, id).catch(() => []),
      ])
      setActivities(Array.isArray(act) ? act : act?.activities || [])
      setNotes(Array.isArray(nts) ? nts : nts?.notes || [])
      setAttachments(Array.isArray(att) ? att : att?.attachments || [])
    } catch(e) {}
    setLoadingActivity(false)
  }

  useEffect(() => { if (id && objectType) load() }, [id, objectType])
  useEffect(() => { if (id && objectType) loadActivity() }, [id, objectType])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateRecord(objectType, id, editForm)
      toast.success('Saved successfully'); setEditing(false); setEditForm({})
      await load()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="ml-[220px] flex items-center justify-center min-h-screen"><Loading /></div>
  if (!data)   return <div className="ml-[220px] p-8 text-gray-400">Record not found</div>

  const { record, sections, related } = data
  const title = record.firstName
    ? `${record.firstName} ${record.lastName || ''}`
    : record.clientName || record.user?.name || record.name || `#${id}`
  const subtitle = record.technology || record.interviewType || record.department || ''

  const relatedTabs = Object.entries(related || {}).map(([key, val]) => ({
    id: key,
    label: `${key.charAt(0).toUpperCase() + key.slice(1)} (${val.count || val.records?.length || 0})`,
  }))

  return (
    <div className="ml-[220px] min-h-screen bg-gray-50/80">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft size={13} /> Back
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
              {(title[0] || '?').toUpperCase()}
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-gray-900">{title}</h1>
              <div className="flex items-center gap-2.5 mt-0.5">
                {subtitle && <span className="text-[12px] text-gray-500">{subtitle}</span>}
                {record.marketingStatus && <Badge color={statusBadgeColor(record.marketingStatus)} dot>{record.marketingStatus}</Badge>}
                {record.finalStatus    && <Badge color={statusBadgeColor(record.finalStatus)}    dot>{record.finalStatus}</Badge>}
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setEditing(true); setEditForm({}) }}>
            <Edit3 size={13} /> Edit
          </Button>
        </div>
      </div>
<div className="px-8 py-6">
        {/* Detail sections */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {sections?.map((section, si) => (
            <div key={si} className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{section.label}</h3>
              </div>
              <div className="px-5 py-2">
                {section.fields.map((field, fi) => (
                  <div key={fi} className="flex items-start py-2 border-b border-gray-50 last:border-0 gap-4">
                    <span className="text-[11px] text-gray-400 w-36 shrink-0 pt-0.5">{field.label}</span>
                    <span className="text-[13px] text-gray-800 flex-1 min-w-0">{formatValue(field)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Related records */}
        {relatedTabs.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex gap-1 overflow-x-auto">
                {relatedTabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              {activeTab && related[activeTab] && (
                related[activeTab].records?.length > 0 ? (
                  <DataTable
                    columns={RELATED_COLS[activeTab] || [{ key: 'id', label: 'ID' }]}
                    rows={related[activeTab].records}
                    pageSize={10}
                    onRowClick={row => navigate(`${basePath}/records/${activeTab}/${row.id}`)}
                  />
                ) : <p className="text-[13px] text-gray-400 py-8 text-center">No {activeTab} found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity Panel */}
      <div className="card overflow-hidden mt-4">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-1">
          {['notes', 'activities', 'attachments'].map(t => (
            <button key={t} onClick={() => setActivityTab(t)}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all ${activityTab === t ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'notes' && notes.length > 0 && <span className="ml-1 opacity-70">({notes.length})</span>}
              {t === 'activities' && activities.length > 0 && <span className="ml-1 opacity-70">({activities.length})</span>}
              {t === 'attachments' && attachments.length > 0 && <span className="ml-1 opacity-70">({attachments.length})</span>}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activityTab === 'notes' && (
            <div>
              <div className="flex gap-2 mb-4">
                <input value={newNote} onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note..." className="field-input flex-1" />
                <Button size="sm" onClick={async () => {
                  if (!newNote.trim()) return
                  try {
                    await createNote({ objectType, objectId: parseInt(id), body: newNote })
                    setNewNote(''); loadActivity()
                  } catch(e) {}
                }}>Add</Button>
              </div>
              <div className="space-y-2">
                {notes.map((n, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 mb-1">{n.author?.name || 'You'} · {n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                    <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{n.body || n.content}</p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-[13px] text-gray-400 text-center py-4">No notes yet</p>}
              </div>
            </div>
          )}
          {activityTab === 'activities' && (
            <div className="space-y-2">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[10px] text-brand-700 shrink-0 mt-0.5">
                    {a.activity_type?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-gray-800">{a.subject || a.description || '—'}</p>
                    <p className="text-[11px] text-gray-400">{a.activity_type} · {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  {!a.is_completed && (
                    <button onClick={async () => { try { await completeActivityById(a.id); loadActivity() } catch(e) {} }}
                      className="text-[11px] text-success-600 hover:underline shrink-0">Complete</button>
                  )}
                </div>
              ))}
              {activities.length === 0 && <p className="text-[13px] text-gray-400 text-center py-4">No activities</p>}
            </div>
          )}
          {activityTab === 'attachments' && (
            <div className="space-y-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] text-gray-600">📄</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-gray-800">{a.filename || a.name}</p>
                    <p className="text-[11px] text-gray-400">{a.file_size ? (a.file_size / 1024).toFixed(1) + ' KB' : ''} · {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-[12px] text-brand-600 hover:underline">Download</a>}
                </div>
              ))}
              {attachments.length === 0 && <p className="text-[13px] text-gray-400 text-center py-4">No attachments</p>}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${title}`} width="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
          {sections?.flatMap(s => s.fields)
            .filter(f => !['link', 'longtext'].includes(f.type) && !['submissionCount','interviewCount','placementCount'].includes(f.key))
            .slice(0, 24)
            .map(field => (
              <Input key={field.key} label={field.label}
                type={field.type === 'date' ? 'date' : ['currency','score','percent'].includes(field.type) ? 'number' : 'text'}
                value={editForm[field.key] ?? (field.value ?? '')}
                onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
            ))
          }
        </div>
      </Modal>
    </div>
  )
}
