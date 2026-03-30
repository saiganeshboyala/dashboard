import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../utils/api'
import { get } from '../../utils/api'
import { Page } from '../ui/Page'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { Loading } from '../ui/Loading'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { FieldRenderer, READONLY_FIELDS } from './FieldRenderer'
import { RelatedList } from './RelatedList'
import { usePermissions } from '../../hooks/usePermissions'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Mail, Copy, CheckCheck } from 'lucide-react'

// System fields to hide in the UI
const HIDDEN_FIELDS = new Set([
  'tenant_id', 'password_hash', 'password_history', 'password_changed_at',
  'failed_login_count', 'locked_until', 'created_by', 'owner_id', 'user_id',
])

// Section display order
const SECTION_ORDER = [
  'Standard Fields', 'Contact Information', 'Status & Tracking',
  'Metrics & Financials', 'Dates & History', 'Custom Fields',
]

function groupBySection(fields, layout) {
  if (layout?.sections) {
    try {
      const ls = typeof layout.sections === 'string' ? JSON.parse(layout.sections) : layout.sections
      if (Array.isArray(ls) && ls.length > 0) {
        return ls.map(s => ({
          name: s.label || s.name,
          fields: (s.fields || []).map(fn => fields.find(f => f.field_name === fn)).filter(Boolean),
        })).filter(s => s.fields.length > 0)
      }
    } catch { /* fall through */ }
  }

  const map = {}
  for (const f of fields) {
    const sec = f.section_name || 'General'
    if (!map[sec]) map[sec] = []
    map[sec].push(f)
  }

  return Object.entries(map)
    .sort(([a], [b]) => {
      const ai = SECTION_ORDER.indexOf(a), bi = SECTION_ORDER.indexOf(b)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.localeCompare(b)
    })
    .map(([name, flds]) => ({ name, fields: flds }))
}

function getRelatedConfig(objectName, related) {
  const map = {
    students: [
      { object: 'submissions', label: 'Submissions', count: related?.submissions },
      { object: 'interviews',  label: 'Interviews',  count: related?.interviews  },
      { object: 'placements',  label: 'Placements',  count: related?.placements  },
    ],
    business_units: [
      { object: 'students',   label: 'Students',   count: related?.students   },
      { object: 'recruiters', label: 'Recruiters', count: related?.recruiters },
    ],
    clusters: [
      { object: 'business_units', label: 'Business Units', count: related?.business_units },
      { object: 'students',       label: 'Students',       count: related?.students       },
    ],
    recruiters: [
      { object: 'students',    label: 'Students',    count: related?.students    },
      { object: 'submissions', label: 'Submissions', count: related?.submissions },
      { object: 'interviews',  label: 'Interviews',  count: related?.interviews  },
    ],
    submissions: [
      { object: 'interviews', label: 'Interviews', count: related?.interviews },
    ],
  }
  return map[objectName] || []
}

// ─── SECTION COMPONENT ───────────────────────────────────────────────────────

function FieldSection({ section, record, editValues, picklists, editing, onChange, readOnlyFields = new Set() }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <h3 className="text-[12px] font-700 text-gray-700 uppercase tracking-wide">{section.name}</h3>
        <span className="text-gray-400 text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {section.fields.map((field, fi) => {
            const value = editing ? editValues[field.field_name] : record[field.field_name]
            const isReadonly = READONLY_FIELDS.has(field.field_name) || readOnlyFields.has(field.field_name)
            return (
              <div
                key={field.field_name}
                className={`flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 min-h-[42px] ${fi % 2 === 0 ? '' : ''}`}
              >
                <span className="text-[11px] text-gray-500 font-medium w-[140px] shrink-0 pt-0.5 leading-tight">
                  {field.label}
                  {field.is_required && !isReadonly && <span className="text-red-500 ml-0.5">*</span>}
                </span>
                <div className="flex-1 text-[13px] text-gray-800 min-w-0">
                  <FieldRenderer
                    field={field}
                    value={value ?? record[field.field_name]}
                    picklists={picklists}
                    mode={editing && !isReadonly ? 'edit' : 'view'}
                    onChange={(val) => onChange(field.field_name, val)}
                  />
                </div>
              </div>
            )
          })}
          {/* Pad odd number of fields */}
          {section.fields.length % 2 !== 0 && (
            <div className="border-b border-gray-100 px-4 py-2.5 min-h-[42px]" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── AUDIT TRAIL ─────────────────────────────────────────────────────────────

function AuditTrail({ objectName, id }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get(`/api/v1/dynamic/${objectName}/${id}/history`)
      .then(res => setHistory(res?.changes || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [objectName, id])

  if (loading) return <div className="py-8"><Loading /></div>
  if (history.length === 0) return (
    <div className="py-10 text-center text-[13px] text-gray-400">No field change history</div>
  )

  return (
    <div className="space-y-2">
      {history.map((h, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex gap-4 items-start">
          <div className="w-32 shrink-0">
            <p className="text-[11px] text-gray-500">{h.changed_at ? new Date(h.changed_at).toLocaleString() : '—'}</p>
            <p className="text-[12px] font-medium text-gray-700">{h.changed_by_name || h.changed_by || 'System'}</p>
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-gray-800">
              {h.field_label || h.field_name?.replace(/_/g, ' ')}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[12px] text-gray-500 bg-red-50 px-1.5 rounded line-through">
                {h.old_value ?? '—'}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-[12px] text-gray-800 bg-green-50 px-1.5 rounded">
                {h.new_value ?? '—'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

/**
 * DynamicDetail — full record detail page.
 *
 * Can be used two ways:
 *   1. Via route /head/dynamic/:objectName/:id  — objectName from params
 *   2. Via route /head/students/:id             — objectName passed as prop
 */
export function DynamicDetail({ objectName: objectNameProp, basePath }) {
  const { objectName: objectNameParam, id } = useParams()
  const objectName = objectNameProp || objectNameParam
  const navigate   = useNavigate()

  const { perms, hiddenFields, readOnlyFields } = usePermissions(objectName)

  const toast = useToast()

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [editing, setEditing]     = useState(false)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [actions, setActions]       = useState([])
  const [executingAction, setExecutingAction] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [inviting, setInviting]     = useState(false)
  const [inviteUrl, setInviteUrl]   = useState(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  const fetchRecord = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/v1/dynamic/${objectName}/${id}`)
      setData(res || null)
      setActions(res?.actions || [])
    } catch (e) {
      setError(e.message || 'Failed to load record')
    }
    setLoading(false)
  }, [objectName, id])

  useEffect(() => { fetchRecord() }, [fetchRecord])

  const startEdit = () => {
    setEditing(true)
    setSaveError(null)
    setEditValues({ ...data.record })
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditValues({})
    setSaveError(null)
  }

  const saveRecord = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const changes = {}
      for (const [key, val] of Object.entries(editValues)) {
        if (val !== data.record[key]) changes[key] = val
      }
      if (Object.keys(changes).length > 0) {
        const result = await api.put(`/api/v1/dynamic/${objectName}/${id}`, changes)
        if (result?.errors?.length > 0) {
          setSaveError(result.errors.map(e => e.message).join('; '))
          setSaving(false)
          return
        }
        await fetchRecord()
      }
      setEditing(false)
    } catch (e) {
      setSaveError(e.message || 'Save failed')
    }
    setSaving(false)
  }

  const handleFieldChange = (fieldName, val) => {
    setEditValues(prev => ({ ...prev, [fieldName]: val }))
  }

  const executeAction = async (action) => {
    setExecutingAction(action.id)
    try {
      const result = await api.post(`/api/v1/dynamic/${objectName}/${id}/action/${action.id}`, {})
      toast.success(result?.message || `${action.label} completed`)
      await fetchRecord()
    } catch (e) {
      toast.error(e.message || `${action.label} failed`)
    }
    setExecutingAction(null)
    setConfirmAction(null)
  }

  // ── Invite helper (recruiters / students without a user account) ────────────
  const getInviteInfo = (rec) => {
    if (!rec) return null
    if (objectName === 'recruiters') return { email: rec.email,          name: `${rec.first_name || ''} ${rec.last_name || ''}`.trim(), role: 'RECRUITER' }
    if (objectName === 'students')   return { email: rec.personal_email, name: `${rec.first_name || ''} ${rec.last_name || ''}`.trim(), role: 'STUDENT' }
    return null
  }

  const sendInvite = async (rec) => {
    const info = getInviteInfo(rec)
    if (!info?.email) return toast.error('No email address on this record')
    setInviting(true)
    try {
      const res = await api.post('/api/v1/tenants/send-invite', {
        email: info.email,
        name:  info.name || info.email.split('@')[0],
        role:  info.role,
        buId:  rec.bu_id || null,
      })
      setInviteUrl(res?.inviteUrl || null)
      toast.success(`Invite sent to ${info.email}`)
    } catch (e) {
      toast.error(e.message || 'Failed to send invite')
    }
    setInviting(false)
  }

  if (loading) return <Page title="Loading…"><Loading /></Page>
  if (error)   return <Page title="Error"><Alert variant="error">{error}</Alert></Page>
  if (!data)   return <Page title="Not Found"><Alert variant="warn">Record not found.</Alert></Page>

  const { record, fields, picklists, layout, related } = data

  const visibleFields = fields.filter(f => !HIDDEN_FIELDS.has(f.field_name) && !hiddenFields.has(f.field_name))
  const sections      = groupBySection(visibleFields, layout)
  const relatedConfig = getRelatedConfig(objectName, related)

  const title = record.first_name
    ? `${record.first_name || ''} ${record.last_name || ''}`.trim()
    : (record.name || record.subject || record.cluster_name || `#${id}`)

  const objectLabel = objectName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const listPath    = basePath || `/head/dynamic/${objectName}`

  const tabs = [
    { id: 'details', label: 'Details' },
    ...relatedConfig.map(r => ({ id: r.object, label: `${r.label}`, count: r.count ?? 0 })),
    { id: 'history', label: 'History' },
  ]

  return (
    <Page
      title={title}
      subtitle={
        <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
          <button onClick={() => navigate(listPath)} className="hover:text-blue-600 transition-colors">
            {objectLabel}
          </button>
          <span>/</span>
          <span className="text-gray-400">ID {id}</span>
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="secondary" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" loading={saving} onClick={saveRecord}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>← Back</Button>
              {/* Custom action buttons */}
              {actions.map(action => {
                const colorCls = {
                  blue: 'bg-blue-600 hover:bg-blue-700', green: 'bg-green-600 hover:bg-green-700',
                  red: 'bg-red-600 hover:bg-red-700', orange: 'bg-orange-500 hover:bg-orange-600',
                  purple: 'bg-purple-600 hover:bg-purple-700', gray: 'bg-gray-600 hover:bg-gray-700',
                }[action.button_color] || 'bg-blue-600 hover:bg-blue-700'
                return (
                  <button
                    key={action.id}
                    onClick={() => action.requires_confirmation ? setConfirmAction(action) : executeAction(action)}
                    disabled={executingAction === action.id}
                    className={`px-3 py-1.5 text-[12px] font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${colorCls}`}
                  >
                    {executingAction === action.id ? '…' : action.label}
                  </button>
                )
              })}
              {/* Invite button — recruiters/students without a user account */}
              {(objectName === 'recruiters' || objectName === 'students') && !record.user_id && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={inviting}
                  onClick={() => sendInvite(record)}
                >
                  <Mail size={13} /> Invite
                </Button>
              )}
              {perms?.canEdit !== false && (
                <Button size="sm" onClick={startEdit}>Edit</Button>
              )}
            </>
          )}
        </div>
      }
    >
      {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}

      {/* Invite URL banner — shown after sending invite */}
      {inviteUrl && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Mail size={15} className="text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-blue-800 mb-0.5">Invite sent — copy the link if email isn't configured</p>
            <code className="text-[11px] text-blue-700 break-all">{inviteUrl}</code>
          </div>
          <button
            onClick={() => { navigator.clipboard?.writeText(inviteUrl); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000) }}
            className="shrink-0 p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
            title="Copy link"
          >
            {inviteCopied ? <CheckCheck size={13} /> : <Copy size={13} />}
          </button>
          <button onClick={() => setInviteUrl(null)} className="shrink-0 text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
        </div>
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'details' && (
          <div className="space-y-4">
            {sections.map(section => (
              <FieldSection
                key={section.name}
                section={section}
                record={record}
                editValues={editValues}
                picklists={picklists}
                editing={editing}
                onChange={handleFieldChange}
                readOnlyFields={readOnlyFields}
              />
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <AuditTrail objectName={objectName} id={id} />
        )}

        {activeTab !== 'details' && activeTab !== 'history' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <RelatedList
              relatedObject={activeTab}
              parentObjectName={objectName}
              parentId={id}
              label={relatedConfig.find(r => r.object === activeTab)?.label || activeTab}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => executeAction(confirmAction)}
        title={confirmAction?.label || 'Confirm'}
        description={`Are you sure you want to run "${confirmAction?.label}"?`}
        confirmLabel="Run"
        loading={!!executingAction}
      />
    </Page>
  )
}
