import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Database, RefreshCw, Layers } from 'lucide-react'
import { Page, Tabs, DataTable, Badge, Button, Modal, Input } from '../../../components/Shared'
import { useToast } from '../../../context/ToastContext'
import * as api from '../../../utils/api'

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_OPTIONS = ['box', 'users', 'file', 'calendar', 'briefcase', 'building', 'chart', 'clipboard', 'database']

// ─── Create object modal ──────────────────────────────────────────────────────

function CreateObjectModal({ onClose, onCreated }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', label: '', pluralLabel: '', description: '', icon: 'box' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      // Auto-generate API name from label
      if (k === 'label') {
        next.name = v.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
        if (!f.pluralLabel || f.pluralLabel === f.label + 's') next.pluralLabel = v + 's'
      }
      return next
    })
  }

  const save = async () => {
    if (!form.label.trim()) return toast('Label is required', 'error')
    if (!form.name.trim())  return toast('API Name is required', 'error')
    setSaving(true)
    try {
      await api.post('/api/v1/schema/objects', form)
      toast('Custom object created', 'success')
      onCreated()
      onClose()
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  return (
    <Modal title="Create Custom Object" onClose={onClose} size="md">
      <div className="space-y-4">
        <Input label="Object Label *" value={form.label} onChange={v => set('label', v)} placeholder="e.g. Job Opening" />
        <Input label="Plural Label"   value={form.pluralLabel} onChange={v => set('pluralLabel', v)} placeholder="e.g. Job Openings" />
        <div>
          <label className="block text-[12px] text-gray-600 mb-1">API Name *</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-[12px] text-indigo-600 font-mono">
              {form.name || 'auto_generated'}
            </code>
          </div>
          <p className="text-gray-400 text-[11px] mt-1">Auto-generated from label. Used in API calls.</p>
        </div>
        <div>
          <label className="block text-[12px] text-gray-600 mb-1">Icon</label>
          <div className="flex gap-2 flex-wrap">
            {ICON_OPTIONS.map(ic => (
              <button
                key={ic}
                onClick={() => set('icon', ic)}
                className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                  form.icon === ic
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Description"
          value={form.description}
          onChange={v => set('description', v)}
          placeholder="What is this object used for?"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Creating…' : 'Create Object'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ObjectManagerPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [objects,  setObjects]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('standard')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.getSchemaObjects()
      setObjects(r?.objects || r || [])
    } catch (e) { toast(e.message, 'error') }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  const standard = objects.filter(o => !o.isCustom)
  const custom   = objects.filter(o =>  o.isCustom)
  const shown    = (tab === 'standard' ? standard : custom).map(o => ({ ...o, id: o.id ?? `obj_${o.name}` }))

  const columns = [
    {
      key: 'label',
      label: 'Object Label',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Database size={14} className="text-indigo-400 shrink-0" />
          <span className="text-gray-900 font-medium">{row.label}</span>
        </div>
      ),
    },
    { key: 'name',      label: 'API Name', render: v => <code className="text-indigo-600 text-[11px] font-mono">{v}</code> },
    { key: 'fieldCount', label: 'Fields',  render: v => <span className="text-gray-700">{v ?? '—'}</span> },
    {
      key: 'isCustom',
      label: 'Type',
      render: v => <Badge color={v ? 'indigo' : 'slate'}>{v ? 'Custom' : 'Standard'}</Badge>,
    },
    { key: 'description', label: 'Description', render: v => <span className="text-gray-500 text-[12px] truncate max-w-[200px] block">{v || '—'}</span> },
  ]

  return (
    <Page
      title="Object Manager"
      subtitle={`${standard.length} standard · ${custom.length} custom objects`}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" icon={RefreshCw} onClick={load} size="sm">Refresh</Button>
          <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>New Object</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Tabs
          tabs={[
            { id: 'standard', label: `Standard Objects (${standard.length})` },
            { id: 'custom',   label: `Custom Objects (${custom.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />

        <DataTable
          rows={shown}
          columns={columns}
          loading={loading}
          searchable={false}
          emptyText={tab === 'custom' ? 'No custom objects yet. Create one to get started.' : 'No standard objects found.'}
          onRowClick={row => navigate(`/head/setup/objects/${row.name}`)}
        />
      </div>

      {showCreate && (
        <CreateObjectModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </Page>
  )
}
