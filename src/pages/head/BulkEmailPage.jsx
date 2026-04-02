import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { useToast } from '../../context/ToastContext'
import { Page, DataTable, Loading, Badge, Button, Input, Select, Modal, Tabs } from '../../components/Shared'
import api from '../../utils/api'
import { Mail, Users, ChevronRight, ChevronLeft, RefreshCw, Eye, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const MERGE_FIELDS = [
  { key: 'name',            label: 'Full Name' },
  { key: 'firstName',       label: 'First Name' },
  { key: 'lastName',        label: 'Last Name' },
  { key: 'email',           label: 'Email' },
  { key: 'role',            label: 'Role' },
  { key: 'buName',          label: 'BU Name' },
  { key: 'technology',      label: 'Technology' },
  { key: 'marketingStatus', label: 'Marketing Status' },
]

const ROLES = [
  { value: 'RECRUITER', label: 'Recruiters' },
  { value: 'STUDENT',   label: 'Students' },
  { value: 'BU_ADMIN',  label: 'BU Admins' },
]

const STATUS_COLOR = { pending: 'amber', sent: 'green', failed: 'red', processing: 'blue', completed: 'green' }
const STATUS_ICON  = { completed: CheckCircle2, failed: AlertCircle, processing: RefreshCw, pending: Clock }

// ── Helpers ───────────────────────────────────────────────────────────────────

function insertAtCursor(el, text) {
  if (!el) return text
  const start = el.selectionStart ?? el.value.length
  const end   = el.selectionEnd   ?? el.value.length
  return el.value.slice(0, start) + text + el.value.slice(end)
}

function pct(sent, total) {
  if (!total) return 0
  return Math.round((sent / total) * 100)
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — SELECT RECIPIENTS
// ══════════════════════════════════════════════════════════════════════════════

function StepRecipients({ state, setState, bus, onNext }) {
  const { recipientType, role, buId, userIds } = state
  const toast            = useToast()
  const [preview, setPreview] = useState(null)
  const [searching, setSearching] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [userList, setUserList]   = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Debounced user search for 'custom' mode
  useEffect(() => {
    if (recipientType !== 'custom') return
    if (!userQuery.trim()) { setUserList([]); return }
    const t = setTimeout(async () => {
      setLoadingUsers(true)
      try {
        const r = await api.get(`/api/v1/dynamic/users?search=${encodeURIComponent(userQuery)}&limit=30`)
          .catch(() => api.get(`/api/v1/tenants/users`))
        const list = r?.users || r?.records || r?.data || []
        setUserList(list)
      } catch { setUserList([]) }
      setLoadingUsers(false)
    }, 400)
    return () => clearTimeout(t)
  }, [userQuery, recipientType])

  async function loadPreview() {
    if (recipientType === 'role' && !role) return
    if (recipientType === 'bu'   && !buId) return
    if (recipientType === 'custom' && !userIds?.length) return
    setSearching(true)
    try {
      const body = { recipients: recipientType, role, buId: buId ? parseInt(buId) : undefined, userIds }
      const r = await api.post('/api/v1/email/bulk-preview', body)
      setPreview(r)
    } catch (e) { toast.error(e.message) }
    setSearching(false)
  }

  useEffect(() => { setPreview(null) }, [recipientType, role, buId, userIds?.length])

  function toggleUser(u) {
    const ids = userIds || []
    setState(s => ({
      ...s,
      userIds: ids.includes(u.id) ? ids.filter(i => i !== u.id) : [...ids, u.id],
    }))
  }

  const readyForNext = preview && preview.count > 0

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-gray-900">Who should receive this email?</h3>

        {/* Type selector */}
        <div className="flex gap-3 flex-wrap">
          {[
            { value: 'role',   label: 'All users with role' },
            { value: 'bu',     label: 'All users in a BU' },
            { value: 'custom', label: 'Select individuals' },
          ].map(opt => (
            <label key={opt.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
              recipientType === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="radio" name="recipientType" value={opt.value}
                checked={recipientType === opt.value}
                onChange={() => setState(s => ({ ...s, recipientType: opt.value }))}
                className="accent-blue-600" />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Role selector */}
        {recipientType === 'role' && (
          <Select label="Role" value={role || ''} onChange={e => setState(s => ({ ...s, role: e.target.value }))}>
            <option value="">— Select role —</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        )}

        {/* BU selector */}
        {recipientType === 'bu' && (
          <Select label="Business Unit" value={buId || ''} onChange={e => setState(s => ({ ...s, buId: e.target.value }))}>
            <option value="">— Select BU —</option>
            {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}

        {/* Custom user selection */}
        {recipientType === 'custom' && (
          <div className="space-y-3">
            <Input
              label="Search users"
              placeholder="Search by name or email…"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
            />
            {loadingUsers && <Loading />}
            {userList.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {userList.map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                    <input type="checkbox" checked={(userIds || []).includes(u.id)}
                      onChange={() => toggleUser(u)} className="accent-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email} · {u.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {(userIds?.length > 0) && (
              <p className="text-sm text-gray-600 font-medium">{userIds.length} user{userIds.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>
        )}

        {/* Preview button */}
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={loadPreview} disabled={searching}>
            {searching ? <RefreshCw size={13} className="animate-spin" /> : <Users size={13} />}
            Preview recipients
          </Button>
          {preview && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                <span className="font-bold text-gray-900 text-base">{preview.count}</span> recipients
              </span>
              {preview.preview && (
                <span className="text-xs text-gray-400">
                  (e.g. {preview.preview.name} &lt;{preview.preview.email}&gt;)
                </span>
              )}
              {preview.count === 0 && (
                <span className="text-sm text-red-500">No eligible recipients found</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!readyForNext}>
          Next: Compose <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — COMPOSE EMAIL
// ══════════════════════════════════════════════════════════════════════════════

function StepCompose({ state, setState, templates, onNext, onBack }) {
  const bodyRef  = useRef(null)
  const [showPreview, setShowPreview] = useState(false)

  function applyTemplate(tpl) {
    if (!tpl) return setState(s => ({ ...s, templateId: null }))
    setState(s => ({ ...s, templateId: tpl.id, subject: tpl.subject, bodyHtml: tpl.body_html }))
  }

  function insertField(key) {
    const el  = bodyRef.current
    const val = el ? insertAtCursor(el, `{${key}}`) : (state.bodyHtml || '') + `{${key}}`
    setState(s => ({ ...s, bodyHtml: val }))
    setTimeout(() => el?.focus(), 0)
  }

  // Live preview with dummy merge data
  const dummyData = {
    name: 'Jane Smith', firstName: 'Jane', lastName: 'Smith',
    email: 'jane@example.com', role: 'RECRUITER', buName: 'NG-BU',
    technology: 'Java', marketingStatus: 'Active',
  }
  function renderPreview(text) {
    if (!text) return ''
    return text
      .replace(/\{(\w+)\}/g, (_, k) => dummyData[k] != null ? `<strong>${dummyData[k]}</strong>` : `{${k}}`)
      .replace(/\n/g, '<br/>')
  }

  const canNext = state.subject?.trim() && state.bodyHtml?.trim()

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {/* Template picker */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Use saved template (optional)</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            value={state.templateId || ''}
            onChange={e => {
              const tpl = templates.find(t => String(t.id) === e.target.value)
              applyTemplate(tpl || null)
            }}
          >
            <option value="">— Write custom email —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Subject */}
        <Input
          label="Subject *"
          placeholder="e.g. Important update from Fyxo CRM"
          value={state.subject || ''}
          onChange={e => setState(s => ({ ...s, subject: e.target.value }))}
        />

        {/* Merge field buttons */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Insert merge field</label>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_FIELDS.map(f => (
              <button key={f.key} type="button" onClick={() => insertField(f.key)}
                className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors font-mono">
                {`{${f.key}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email body *</label>
          <textarea
            ref={bodyRef}
            value={state.bodyHtml || ''}
            onChange={e => setState(s => ({ ...s, bodyHtml: e.target.value }))}
            rows={12}
            placeholder={`Hi {name},\n\nWe wanted to reach out…\n\nBest,\nFyxo CRM Team`}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg font-mono resize-y bg-gray-50 focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">Supports HTML. Use merge fields like {'{name}'} for personalization.</p>
        </div>

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
        >
          <Eye size={14} /> {showPreview ? 'Hide preview' : 'Show preview (first recipient)'}
        </button>

        {showPreview && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <p className="text-xs text-gray-500">Preview for: <strong>{dummyData.name}</strong> &lt;{dummyData.email}&gt;</p>
              <p className="text-xs text-gray-700 mt-0.5">Subject: <strong>{renderPreview(state.subject)}</strong></p>
            </div>
            <div
              className="p-5 text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderPreview(state.bodyHtml) || '<em style="color:#94a3b8">No body yet</em>') }}
            />
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}><ChevronLeft size={14} /> Back</Button>
        <Button onClick={onNext} disabled={!canNext}>
          Next: Review <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — REVIEW & SEND
// ══════════════════════════════════════════════════════════════════════════════

function StepReview({ state, setState, recipientPreview, onSend, onBack, sending }) {
  const recipientDesc = {
    role:   `All ${state.role?.toLowerCase() || ''}s`,
    bu:     `All users in selected BU`,
    custom: `${state.userIds?.length || 0} selected users`,
  }[state.recipientType] || '—'

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-5 py-3.5 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Review before sending</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { label: 'Recipients',  value: `${recipientPreview?.count || 0} people — ${recipientDesc}` },
            { label: 'Subject',     value: state.subject },
            { label: 'Template',    value: state.templateId ? `Template #${state.templateId}` : 'Custom email' },
          ].map(row => (
            <div key={row.label} className="flex items-start gap-4 px-5 py-3">
              <span className="text-sm text-gray-500 w-28 shrink-0 font-medium">{row.label}</span>
              <span className="text-sm text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body preview */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-5 py-2.5 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500">Email body preview</p>
        </div>
        <div
          className="p-5 text-sm text-gray-700 leading-relaxed max-h-48 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((state.bodyHtml || '').replace(/\n/g, '<br/>')) }}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={sending}><ChevronLeft size={14} /> Back</Button>
        <Button onClick={onSend} disabled={sending}>
          {sending
            ? <><RefreshCw size={14} className="animate-spin" /> Queuing…</>
            : <><Mail size={14} /> Send to {recipientPreview?.count || 0} recipients</>}
        </Button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — PROGRESS
// ══════════════════════════════════════════════════════════════════════════════

function StepProgress({ jobId, onDone }) {
  const [job, setJob] = useState(null)

  const poll = useCallback(async () => {
    if (!jobId) return
    try {
      const r = await api.get(`/api/v1/email/bulk-jobs/${jobId}`)
      setJob(r?.job || r)
    } catch { /* ignore poll errors */ }
  }, [jobId])

  useEffect(() => {
    poll()
    const t = setInterval(poll, 2000)
    return () => clearInterval(t)
  }, [poll])

  if (!job) return <Loading />

  const total   = job.total_recipients || 0
  const done    = (job.sent_count || 0) + (job.failed_count || 0)
  const percent = pct(done, total)
  const isDone  = job.status === 'completed' || job.status === 'failed'

  const Icon = STATUS_ICON[job.status] || Clock

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            job.status === 'completed' ? 'bg-green-100' :
            job.status === 'failed'    ? 'bg-red-100'   : 'bg-blue-100'
          }`}>
            <Icon size={18} className={
              job.status === 'completed' ? 'text-green-600' :
              job.status === 'failed'    ? 'text-red-600'   : 'text-blue-600 animate-spin'
            } />
          </div>
          <div>
            <p className="font-semibold text-gray-900 capitalize">
              {job.status === 'processing' ? 'Sending emails…' :
               job.status === 'completed'  ? 'All done!' :
               job.status === 'pending'    ? 'Queued — starting soon…' : 'Failed'}
            </p>
            <p className="text-xs text-gray-400">Job #{job.id}</p>
          </div>
          <Badge color={STATUS_COLOR[job.status] || 'gray'} className="ml-auto">{job.status}</Badge>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{done} of {total}</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                job.status === 'completed' ? 'bg-green-500' :
                job.status === 'failed'    ? 'bg-red-500'   : 'bg-blue-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',  value: total,              color: 'text-gray-900' },
            { label: 'Sent',   value: job.sent_count || 0,   color: 'text-green-600' },
            { label: 'Failed', value: job.failed_count || 0, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {isDone && (
          <div className="flex gap-3 justify-end pt-2">
            {job.failed_count > 0 && (
              <Button variant="secondary" onClick={async () => {
                await api.post(`/api/v1/email/bulk-jobs/${jobId}/resend-failed`, {})
              }}>
                Retry {job.failed_count} failed
              </Button>
            )}
            <Button onClick={onDone}>
              <Mail size={14} /> Send another
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ══════════════════════════════════════════════════════════════════════════════

function HistoryTab() {
  const toast = useToast()
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [detail,  setDetail]  = useState(null)
  const [detailJob, setDetailJob] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/v1/email/bulk-jobs')
      setJobs(r?.jobs || [])
    } catch { setJobs([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function openDetail(job) {
    setDetailJob(job); setDetail(null); setDetailLoading(true)
    try {
      const r = await api.get(`/api/v1/email/bulk-jobs/${job.id}`)
      setDetail(r)
    } catch (e) { toast.error(e.message) }
    setDetailLoading(false)
  }

  async function resendFailed(jobId) {
    try {
      await api.post(`/api/v1/email/bulk-jobs/${jobId}/resend-failed`, {})
      toast.success('Failed recipients re-queued')
      load()
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return <Loading />

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{jobs.length} campaign{jobs.length !== 1 ? 's' : ''}</p>
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /> Refresh</Button>
      </div>

      <DataTable
        columns={[
          { key: 'subject', label: 'Subject', render: (v, r) => (
            <div>
              <p className="font-medium text-gray-900">{v}</p>
              <p className="text-[11px] text-gray-400">Job #{r.id}</p>
            </div>
          )},
          { key: 'status', label: 'Status', render: v => <Badge color={STATUS_COLOR[v] || 'gray'}>{v}</Badge> },
          { key: 'total_recipients', label: 'Total',  render: v => v || 0 },
          { key: 'sent_count',       label: 'Sent',   render: (v, r) => <span className="text-green-600 font-medium">{v || 0}</span> },
          { key: 'failed_count',     label: 'Failed', render: (v) => v > 0 ? <span className="text-red-500 font-medium">{v}</span> : <span className="text-gray-400">0</span> },
          { key: 'created_at',       label: 'Sent at', render: v => v ? new Date(v).toLocaleString() : '—' },
          { key: 'actions', label: '', render: (_, r) => (
            <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
              {r.failed_count > 0 && (
                <Button size="sm" variant="secondary" onClick={() => resendFailed(r.id)}>
                  Retry Failed
                </Button>
              )}
            </div>
          )},
        ]}
        rows={jobs}
        onRowClick={openDetail}
        emptyText="No bulk emails sent yet"
      />

      {/* Detail modal */}
      <Modal
        open={!!detailJob}
        onClose={() => { setDetailJob(null); setDetail(null) }}
        title={detailJob ? `Job #${detailJob.id} — ${detailJob.subject}` : ''}
        width="max-w-2xl"
      >
        {detailLoading ? <Loading /> : detail ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total',  value: detail.job.total_recipients || 0, color: '' },
                { label: 'Sent',   value: detail.job.sent_count   || 0, color: 'text-green-600' },
                { label: 'Failed', value: detail.job.failed_count || 0, color: 'text-red-500' },
                { label: 'Status', value: detail.job.status, color: '' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recipients table */}
            <DataTable
              columns={[
                { key: 'email', label: 'Email', render: (v, r) => (
                  <div>
                    <p className="text-sm font-medium">{r.name || v}</p>
                    <p className="text-xs text-gray-400">{v}</p>
                  </div>
                )},
                { key: 'status', label: 'Status', render: v => <Badge color={STATUS_COLOR[v] || 'gray'}>{v}</Badge> },
                { key: 'sent_at', label: 'Sent at', render: v => v ? new Date(v).toLocaleString() : '—' },
                { key: 'error', label: 'Error', render: v => v ? <span className="text-xs text-red-500">{v}</span> : null },
              ]}
              rows={detail.recipients || []}
            />
          </div>
        ) : null}
      </Modal>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD STEPS INDICATOR
// ══════════════════════════════════════════════════════════════════════════════

function StepsBar({ current }) {
  const steps = ['Recipients', 'Compose', 'Review', 'Progress']
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            i === current     ? 'bg-blue-600 text-white' :
            i < current       ? 'bg-green-100 text-green-700' : 'text-gray-400'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              i === current ? 'bg-white text-blue-600' :
              i < current   ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{i < current ? '✓' : i + 1}</span>
            {s}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${i < current ? 'bg-green-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function BulkEmailPage() {
  const toast    = useToast()
  const [tab, setTab] = useState('compose')

  // Wizard state
  const [step, setStep]   = useState(0)
  const [jobId, setJobId] = useState(null)
  const [sending, setSending] = useState(false)

  const [recipientState, setRecipientState] = useState({
    recipientType: 'role', role: 'RECRUITER', buId: '', userIds: [],
  })
  const [composeState, setComposeState] = useState({
    subject: '', bodyHtml: '', templateId: null,
  })

  // Shared resources
  const [bus,       setBus]       = useState([])
  const [templates, setTemplates] = useState([])
  const [recipientPreview, setRecipientPreview] = useState(null)

  useEffect(() => {
    api.get('/api/v1/dynamic/business_units?limit=200').then(r => setBus(r?.records || [])).catch(() => {})
    api.get('/api/v1/email/templates').then(r => setTemplates(r?.templates || [])).catch(() => {})
  }, [])

  // When moving from step 0→1, refresh the preview count
  async function goToCompose() {
    try {
      const body = { recipients: recipientState.recipientType, role: recipientState.role, buId: recipientState.buId ? parseInt(recipientState.buId) : undefined, userIds: recipientState.userIds }
      const r    = await api.post('/api/v1/email/bulk-preview', body)
      setRecipientPreview(r)
    } catch { /* non-fatal */ }
    setStep(1)
  }

  async function handleSend() {
    setSending(true)
    try {
      const body = {
        ...recipientState,
        recipients: recipientState.recipientType,
        buId:       recipientState.buId ? parseInt(recipientState.buId) : undefined,
        subject:    composeState.subject,
        bodyHtml:   composeState.bodyHtml,
        templateId: composeState.templateId || undefined,
      }
      const r = await api.post('/api/v1/email/bulk-send', body)
      setJobId(r?.jobId)
      toast.success(`Bulk email queued for ${r?.total || 0} recipients`)
      setStep(3)
    } catch (e) {
      toast.error(e.message)
    }
    setSending(false)
  }

  function resetWizard() {
    setStep(0); setJobId(null)
    setRecipientState({ recipientType: 'role', role: 'RECRUITER', buId: '', userIds: [] })
    setComposeState({ subject: '', bodyHtml: '', templateId: null })
    setRecipientPreview(null)
  }

  return (
    <Page
      title="Bulk Email"
      subtitle="Send personalized emails to groups of recruiters, students, or custom recipients"
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[{ id: 'compose', label: 'New Campaign' }, { id: 'history', label: 'History' }]}
      />

      <div className="mt-6">
        {tab === 'history' ? (
          <HistoryTab />
        ) : (
          <>
            <StepsBar current={step} />

            {step === 0 && (
              <StepRecipients
                state={recipientState}
                setState={setRecipientState}
                bus={bus}
                onNext={goToCompose}
              />
            )}
            {step === 1 && (
              <StepCompose
                state={composeState}
                setState={setComposeState}
                templates={templates}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}
            {step === 2 && (
              <StepReview
                state={{ ...recipientState, ...composeState }}
                setState={() => {}}
                recipientPreview={recipientPreview}
                onSend={handleSend}
                onBack={() => setStep(1)}
                sending={sending}
              />
            )}
            {step === 3 && (
              <StepProgress jobId={jobId} onDone={resetWizard} />
            )}
          </>
        )}
      </div>
    </Page>
  )
}
