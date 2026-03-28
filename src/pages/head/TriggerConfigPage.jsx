import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Tabs } from '../../components/Shared'
import { getToken } from '../../utils/auth'
import { RefreshCw, Zap, Database, Clock, CheckCircle, Play, Edit2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

async function api(p, o = {}) {
  const r = await fetch(p, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...o.headers } })
  const j = await r.json()
  if (j.success !== undefined) { if (!j.success) throw new Error(j.error?.message || 'Failed'); return j.data || j }
  return j
}

const INIT_ROLLUP_FIELDS = [
  { object: 'students', field: 'submissionCount', rollupObject: 'submissions', rollupFn: 'COUNT', description: 'Count of submissions per student', trigger: 'afterSubmissionChange', active: true },
  { object: 'students', field: 'interviewCount', rollupObject: 'interviews', rollupFn: 'COUNT', description: 'Count of interviews per student', trigger: 'afterInterviewChange', active: true },
  { object: 'students', field: 'placementCount', rollupObject: 'placements', rollupFn: 'COUNT', description: 'Count of placements per student', trigger: 'afterPlacementChange', active: true },
  { object: 'students', field: 'daysInMarket', rollupObject: 'students', rollupFn: 'CALC', description: 'Days since marketingStartDate (auto-calculated)', trigger: 'scheduled', active: true },
  { object: 'business_units', field: 'studentCount', rollupObject: 'students', rollupFn: 'COUNT', description: 'Count of students per BU', trigger: 'afterStudentChange', active: true },
  { object: 'business_units', field: 'recruiterCount', rollupObject: 'recruiters', rollupFn: 'COUNT', description: 'Count of recruiters per BU', trigger: 'afterRecruiterChange', active: true },
  { object: 'recruiters', field: 'studentCount', rollupObject: 'students', rollupFn: 'COUNT', description: 'Count of students per recruiter', trigger: 'afterStudentAssign', active: true },
  { object: 'recruiters', field: 'submissionCount', rollupObject: 'submissions', rollupFn: 'COUNT', description: 'Count of submissions per recruiter', trigger: 'afterSubmissionChange', active: true },
  { object: 'campaigns', field: 'memberCount', rollupObject: 'campaign_members', rollupFn: 'COUNT', description: 'Count of campaign members', trigger: 'afterMemberChange', active: true },
]

const INIT_TRIGGER_TYPES = [
  { name: 'afterSubmissionChange', fires: 'After submission create/update/delete', objects: 'submissions → students, recruiters', icon: Zap, color: '#3b82f6', enabled: true },
  { name: 'afterInterviewChange', fires: 'After interview create/update/delete', objects: 'interviews → students, recruiters', icon: Zap, color: '#f59e0b', enabled: true },
  { name: 'afterPlacementChange', fires: 'After placement create/update/delete', objects: 'placements → students', icon: Zap, color: '#22c55e', enabled: true },
  { name: 'afterStudentChange', fires: 'After student update', objects: 'students → business_units', icon: Zap, color: '#8b5cf6', enabled: true },
  { name: 'scheduled', fires: 'Nightly job (cron)', objects: 'Recalculates daysInMarket for all in-market students', icon: Clock, color: '#64748b', enabled: true },
]

// ── Rollup Edit Modal ─────────────────────────────────────────────────────────
function RollupEditModal({ rollup, onSave, onClose }) {
  const [form, setForm] = useState({ ...rollup })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={!!rollup} title={`Edit Rollup: ${rollup?.object}.${rollup?.field}`} onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <Input value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source Object</label>
          <Input value={form.rollupObject} onChange={e => set('rollupObject', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Rollup Function</label>
          <Select value={form.rollupFn} onChange={e => set('rollupFn', e.target.value)}>
            <option value="COUNT">COUNT</option>
            <option value="SUM">SUM</option>
            <option value="MIN">MIN</option>
            <option value="MAX">MAX</option>
            <option value="CALC">CALC</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Trigger Event</label>
          <Input value={form.trigger} onChange={e => set('trigger', e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="rf-active" checked={form.active} onChange={e => set('active', e.target.checked)} className="rounded" />
          <label htmlFor="rf-active" className="text-sm text-gray-700">Active</label>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Trigger Edit Modal ────────────────────────────────────────────────────────
function TriggerEditModal({ trigger, onSave, onClose }) {
  const [form, setForm] = useState({ ...trigger })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={!!trigger} title={`Edit Trigger: ${trigger?.name}`} onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Display Name</label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fires When</label>
          <Input value={form.fires} onChange={e => set('fires', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Affected Objects</label>
          <Input value={form.objects} onChange={e => set('objects', e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="trig-enabled" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="rounded" />
          <label htmlFor="trig-enabled" className="text-sm text-gray-700">Enabled</label>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Scheduled Job Edit Modal ──────────────────────────────────────────────────
function JobEditModal({ job, onSave, onClose }) {
  const [form, setForm] = useState({ name: job?.name || job?.job_name || '', cronExpression: job?.cron_expression || '', description: job?.description || '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(job.id, form)
    setSaving(false)
  }

  return (
    <Modal open={!!job} title={`Edit Job: ${job?.name || job?.job_name}`} onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Job Name</label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cron Expression</label>
          <Input value={form.cronExpression} onChange={e => set('cronExpression', e.target.value)} placeholder="e.g. 0 2 * * *" />
          <p className="text-xs text-gray-400 mt-1">Format: minute hour day-of-month month day-of-week</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <Input value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TriggerConfigPage() {
  const toast = useToast()
  const [tab, setTab] = useState('rollups')
  const [recalculating, setRecalculating] = useState(false)
  const [schedulerJobs, setSchedulerJobs] = useState([])
  const [lastRecalc, setLastRecalc] = useState(null)

  // Editable local state for hardcoded definitions
  const [rollupFields, setRollupFields] = useState(INIT_ROLLUP_FIELDS)
  const [triggerTypes, setTriggerTypes] = useState(INIT_TRIGGER_TYPES)

  // Edit modal state
  const [editingRollup, setEditingRollup] = useState(null)  // { index, rollup }
  const [editingTrigger, setEditingTrigger] = useState(null) // { index, trigger }
  const [editingJob, setEditingJob] = useState(null)         // job object

  useEffect(() => {
    api('/api/v1/scheduler').then(r => setSchedulerJobs(Array.isArray(r) ? r : r?.jobs || [])).catch(() => {})
  }, [])

  const recalculate = async () => {
    setRecalculating(true)
    try {
      const start = Date.now()
      await api('/api/v1/triggers/recalculate', { method: 'POST' })
      const duration = Date.now() - start
      setLastRecalc({ time: new Date().toLocaleString(), duration })
      toast.success(`Rollups recalculated in ${duration}ms!`)
    } catch (e) { toast.error(e.message) }
    setRecalculating(false)
  }

  const runJob = async (jobName) => {
    try {
      await api('/api/v1/scheduler/run', { method: 'POST', body: JSON.stringify({ jobName }) })
      toast.success(`Job "${jobName}" triggered!`)
    } catch (e) { toast.error(e.message) }
  }

  const toggleJob = async (jobName) => {
    try {
      await api('/api/v1/scheduler/toggle', { method: 'POST', body: JSON.stringify({ jobName }) })
      const r = await api('/api/v1/scheduler')
      setSchedulerJobs(Array.isArray(r) ? r : r?.jobs || [])
      toast.success('Job toggled!')
    } catch (e) { toast.error(e.message) }
  }

  const saveRollup = (updated) => {
    setRollupFields(prev => prev.map((rf, i) => i === editingRollup.index ? updated : rf))
    setEditingRollup(null)
    toast.success('Rollup field updated!')
  }

  const saveTrigger = (updated) => {
    setTriggerTypes(prev => prev.map((t, i) => i === editingTrigger.index ? updated : t))
    setEditingTrigger(null)
    toast.success('Trigger updated!')
  }

  const saveJob = async (id, form) => {
    try {
      await api(`/api/v1/scheduler/${id}`, { method: 'PUT', body: JSON.stringify(form) })
      const r = await api('/api/v1/scheduler')
      setSchedulerJobs(Array.isArray(r) ? r : r?.jobs || [])
      setEditingJob(null)
      toast.success('Scheduled job updated!')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Page title="Triggers & Rollup Fields" subtitle="Automatic field calculations and event triggers"
      actions={
        <Button onClick={recalculate} disabled={recalculating}>
          <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
          {recalculating ? 'Recalculating...' : 'Recalculate All Rollups'}
        </Button>
      }>
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'rollups', label: 'Rollup Fields' },
        { id: 'triggers', label: 'Triggers' },
        { id: 'scheduler', label: 'Scheduled Jobs' },
      ]} />

      <div className="mt-6">

        {/* ═══ ROLLUP FIELDS ═══ */}
        {tab === 'rollups' && (<>
          {lastRecalc && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
              <CheckCircle size={16} className="text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-medium">Last recalculated: {lastRecalc.time}</p>
                <p className="text-xs text-green-600">Took {lastRecalc.duration}ms</p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Database size={16} className="text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Rollup fields automatically calculate values from child records</p>
                <p className="text-xs text-blue-600 mt-1">For example, submissionCount on students counts how many submissions each student has. These update automatically when child records change.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rollupFields.map((rf, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-card flex items-center gap-5">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <Database size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-gray-900">{rf.object}</span>
                    <span className="text-gray-400">.</span>
                    <span className="font-mono text-sm font-bold text-blue-600">{rf.field}</span>
                    <Badge color="blue">{rf.rollupFn}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{rf.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Source: <span className="font-mono">{rf.rollupObject}</span> · Trigger: <span className="font-mono">{rf.trigger}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge color={rf.active ? 'green' : 'gray'}>{rf.active ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => setEditingRollup({ index: i, rollup: rf })}>
                    <Edit2 size={12} /> Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* ═══ TRIGGERS ═══ */}
        {tab === 'triggers' && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Zap size={16} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Triggers fire automatically when records change</p>
                  <p className="text-xs text-amber-600 mt-1">They recalculate rollup fields, fire flows, send notifications, and call webhooks. These run in the backend after every create/update/delete operation.</p>
                </div>
              </div>
            </div>

            {triggerTypes.map((t, i) => {
              const Icon = t.icon
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.color + '15' }}>
                      <Icon size={18} style={{ color: t.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.fires}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Affects: {t.objects}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge color={t.enabled ? 'green' : 'gray'}>{t.enabled ? 'Enabled' : 'Disabled'}</Badge>
                      <Button size="sm" variant="secondary" onClick={() => setEditingTrigger({ index: i, trigger: t })}>
                        <Edit2 size={12} /> Edit
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 ml-14 space-y-1">
                    {rollupFields.filter(rf => rf.trigger === t.name).map((rf, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle size={10} className="text-green-500" />
                        <span>Updates <span className="font-mono font-medium text-gray-700">{rf.object}.{rf.field}</span> ({rf.rollupFn} of {rf.rollupObject})</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle size={10} className="text-blue-500" />
                      <span>Fires matching Flows (if active)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle size={10} className="text-purple-500" />
                      <span>Fires matching Webhooks (if configured)</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ SCHEDULED JOBS ═══ */}
        {tab === 'scheduler' && (
          <div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Scheduled jobs run at configured intervals. Use the Recalculate button above to manually trigger all rollup recalculations.</p>
            </div>

            {schedulerJobs.length > 0 ? (
              <DataTable searchable={false} columns={[
                { key: 'job_name', label: 'Job', render: (v, r) => (
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-gray-400" />
                    <span className="font-mono font-medium text-gray-900">{r.name || v}</span>
                  </div>
                )},
                { key: 'cron_expression', label: 'Schedule', render: v => <span className="font-mono text-xs text-gray-500">{v || '—'}</span> },
                { key: 'is_active', label: 'Active', render: (v, r) => (
                  <button onClick={() => toggleJob(r.job_name || r.name)}>
                    <Badge color={v ? 'green' : 'gray'}>{v ? 'Active' : 'Paused'}</Badge>
                  </button>
                )},
                { key: 'last_run_at', label: 'Last Run', render: (v, r) => { const d = v || r.last_run; return d ? new Date(d).toLocaleString() : 'Never' } },
                { key: 'next_run', label: 'Next Run', render: v => v ? new Date(v).toLocaleString() : '—' },
                { key: 'actions', label: '', render: (_, r) => (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingJob(r)}>
                      <Edit2 size={12} /> Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => runJob(r.job_name || r.name)}>
                      <Play size={12} /> Run Now
                    </Button>
                  </div>
                )},
              ]} rows={schedulerJobs} />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <Clock size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No scheduled jobs configured.</p>
                <p className="text-gray-300 text-xs mt-1">Rollup triggers fire automatically on record changes. Use the "Recalculate" button for manual runs.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modals ── */}
      {editingRollup && (
        <RollupEditModal
          rollup={editingRollup.rollup}
          onSave={saveRollup}
          onClose={() => setEditingRollup(null)}
        />
      )}
      {editingTrigger && (
        <TriggerEditModal
          trigger={editingTrigger.trigger}
          onSave={saveTrigger}
          onClose={() => setEditingTrigger(null)}
        />
      )}
      {editingJob && (
        <JobEditModal
          job={editingJob}
          onSave={saveJob}
          onClose={() => setEditingJob(null)}
        />
      )}
    </Page>
  )
}
