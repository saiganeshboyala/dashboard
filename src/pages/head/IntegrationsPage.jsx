import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Alert, Tabs } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getExternalConnections, createExternalConn, syncExternalConn, configureSlack, getPlatformReleases, aiQuery } from '../../utils/api'
import { Plus, RefreshCw, Zap, Link2, MessageSquare, RotateCcw, Send, Sparkles } from 'lucide-react'

export default function IntegrationsPage() {
  const toast = useToast()
  const [tab, setTab] = useState('connections')
  const [connections, setConnections] = useState([])
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [slackModal, setSlackModal] = useState(false)
  const [aiModal, setAiModal] = useState(false)
  const [form, setForm] = useState({})
  const [slackForm, setSlackForm] = useState({})
  const [aiQuery_text, setAiQuery_text] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [syncing, setSyncing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      if (tab === 'connections') {
        const data = await getExternalConnections()
        setConnections(Array.isArray(data) ? data : data?.connections || data?.data || [])
      } else if (tab === 'releases') {
        const data = await getPlatformReleases()
        setReleases(Array.isArray(data) ? data : data?.releases || [])
      }
    } catch (e) { toast.error(`Failed to load ${tab}`) }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const handleCreate = async () => {
    if (!form.name || !form.type) return toast.error('Name and type required')
    setCreating(true)
    try {
      await createExternalConn(form)
      toast.success('Connection created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleSync = async (id) => {
    setSyncing(id)
    try {
      await syncExternalConn(id)
      toast.success('Sync triggered')
    } catch (e) { toast.error(e.message) }
    setSyncing(null)
  }

  const handleSlack = async () => {
    try {
      await configureSlack(slackForm)
      toast.success('Slack configured')
      setSlackModal(false); setSlackForm({})
    } catch (e) { toast.error(e.message) }
  }

  const handleAiQuery = async () => {
    if (!aiQuery_text.trim()) return
    setAiLoading(true); setAiResult(null)
    try {
      const result = await aiQuery({ query: aiQuery_text })
      setAiResult(result)
    } catch (e) { toast.error(e.message) }
    setAiLoading(false)
  }

  return (
    <Page
      title="Integrations & Platform"
      subtitle="External connections, AI query, Slack, and release notes"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAiModal(true)}><Sparkles size={13} /> AI Query</Button>
          <Button variant="secondary" size="sm" onClick={() => setSlackModal(true)}><MessageSquare size={13} /> Slack</Button>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          {tab === 'connections' && <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Add Connection</Button>}
        </div>
      }
    >
      <Tabs active={tab} onChange={t => { setTab(t); setLoading(true) }} tabs={[
        { id: 'connections', label: 'External Connections' },
        { id: 'releases',    label: 'Release Notes' },
      ]} />

      <div className="mt-5">
        {tab === 'connections' && (
          <DataTable
            columns={[
              { key: 'name', label: 'Connection', render: v => (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center"><Link2 size={13} className="text-brand-600" /></div>
                  <span className="font-medium">{v}</span>
                </div>
              )},
              { key: 'type', label: 'Type', render: v => <Badge color="blue">{v}</Badge> },
              { key: 'status', label: 'Status', render: v => <Badge color={v === 'connected' ? 'green' : v === 'error' ? 'red' : 'amber'} dot>{v || 'pending'}</Badge> },
              { key: 'last_synced_at', label: 'Last Sync', render: v => v ? new Date(v).toLocaleString() : 'Never' },
              { key: 'records_synced', label: 'Records', render: v => <span className="tabular-nums">{v != null ? v.toLocaleString() : '—'}</span> },
              { key: 'actions', label: '', sortable: false, render: (_, r) => (
                <Button size="xs" variant="secondary" onClick={() => handleSync(r.id)} loading={syncing === r.id}>
                  <RotateCcw size={11} /> Sync
                </Button>
              )},
            ]}
            rows={connections}
            loading={loading}
            emptyText="No external connections configured"
          />
        )}

        {tab === 'releases' && (
          loading ? null : (
            <div className="space-y-4">
              {releases.length === 0 && <p className="text-[13px] text-gray-400">No releases found</p>}
              {releases.map((rel, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge color={rel.type === 'major' ? 'red' : rel.type === 'minor' ? 'blue' : 'gray'}>{rel.version || `v${rel.version_number}`}</Badge>
                    <span className="text-[12px] text-gray-400">{rel.released_at ? new Date(rel.released_at).toLocaleDateString() : '—'}</span>
                    <span className="text-[13px] font-semibold text-gray-900 flex-1">{rel.title}</span>
                  </div>
                  {rel.changes?.length > 0 && (
                    <ul className="space-y-1">
                      {rel.changes.map((c, j) => (
                        <li key={j} className="flex items-start gap-2 text-[12px] text-gray-600">
                          <span className="text-brand-400 mt-0.5">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  )}
                  {rel.description && !rel.changes?.length && (
                    <p className="text-[12px] text-gray-600">{rel.description}</p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Create connection modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="Add External Connection"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Type" required value={form.type || ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="">Select type</option>
            {['Salesforce', 'HubSpot', 'Zapier', 'REST API', 'Webhook', 'SFTP', 'Google Sheets', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="API URL" value={form.apiUrl || ''} onChange={e => setForm(f => ({ ...f, apiUrl: e.target.value }))} placeholder="https://api.example.com" />
          <Input label="API Key" type="password" value={form.apiKey || ''} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>

      {/* Slack config modal */}
      <Modal open={slackModal} onClose={() => { setSlackModal(false); setSlackForm({}) }} title="Configure Slack Integration"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setSlackModal(false); setSlackForm({}) }}>Cancel</Button>
            <Button onClick={handleSlack}>Save Slack Config</Button>
          </div>
        }>
        <div className="space-y-4">
          <Alert type="info">Connect Slack to receive notifications about placements, interviews, and system events.</Alert>
          <Input label="Bot Token" type="password" value={slackForm.botToken || ''} onChange={e => setSlackForm(f => ({ ...f, botToken: e.target.value }))} placeholder="xoxb-..." />
          <Input label="Default Channel" value={slackForm.channelId || ''} onChange={e => setSlackForm(f => ({ ...f, channelId: e.target.value }))} placeholder="#placements" />
          <div className="space-y-2">
            {['new_placement', 'new_interview', 'new_submission', 'daily_report'].map(evt => (
              <label key={evt} className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input type="checkbox" checked={!!slackForm[evt]} onChange={e => setSlackForm(f => ({ ...f, [evt]: e.target.checked }))} className="rounded" />
                <span className="capitalize">{evt.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* AI Query modal */}
      <Modal open={aiModal} onClose={() => { setAiModal(false); setAiQuery_text(''); setAiResult(null) }} title="AI Query" width="max-w-xl">
        <div className="space-y-4">
          <p className="text-[12px] text-gray-500">Ask questions about your data in plain English.</p>
          <div className="flex gap-2">
            <input value={aiQuery_text} onChange={e => setAiQuery_text(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiQuery()}
              placeholder="e.g. How many students are in market this week?"
              className="field-input flex-1" />
            <Button onClick={handleAiQuery} loading={aiLoading}><Send size={13} /></Button>
          </div>
          {aiResult && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Sparkles size={15} className="text-brand-600 mt-0.5 shrink-0" />
                <div>
                  {aiResult.answer && <p className="text-[13px] text-brand-800 mb-2">{aiResult.answer}</p>}
                  {aiResult.data && (
                    <pre className="text-[11px] font-mono text-gray-600 bg-white rounded p-2 overflow-auto max-h-40">
                      {JSON.stringify(aiResult.data, null, 2)}
                    </pre>
                  )}
                  {aiResult.sql && (
                    <p className="text-[11px] font-mono text-gray-400 mt-2">SQL: {aiResult.sql}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Page>
  )
}
