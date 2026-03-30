import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus, Edit3, Trash2, ChevronRight, ExternalLink, Save,
  Eye, EyeOff, CheckSquare, Square, Layout,
} from 'lucide-react'
import {
  Page, Tabs, DataTable, Badge, Button, Modal, Input, Select, ConfirmDialog,
} from '../../../components/Shared'
import { useToast } from '../../../context/ToastContext'
import * as api from '../../../utils/api'

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { type: 'text',         icon: 'Aa', label: 'Text' },
  { type: 'textarea',     icon: '¶',  label: 'Text Area' },
  { type: 'number',       icon: '#',  label: 'Number' },
  { type: 'currency',     icon: '$',  label: 'Currency' },
  { type: 'percent',      icon: '%',  label: 'Percent' },
  { type: 'date',         icon: 'dt', label: 'Date' },
  { type: 'datetime',     icon: 'dtt', label: 'Date/Time' },
  { type: 'boolean',      icon: 'cb', label: 'Checkbox' },
  { type: 'picklist',     icon: 'pl', label: 'Picklist' },
  { type: 'multipicklist',icon: 'mpl', label: 'Multi-Picklist' },
  { type: 'email',        icon: '@',  label: 'Email' },
  { type: 'phone',        icon: 'ph', label: 'Phone' },
  { type: 'url',          icon: '→',  label: 'URL' },
  { type: 'lookup',       icon: '↗',  label: 'Lookup' },
  { type: 'formula',      icon: 'fx', label: 'Formula' },
  { type: 'auto_number',  icon: '++', label: 'Auto Number' },
]

const ROLES = ['HEAD', 'BU_ADMIN', 'RECRUITER', 'STUDENT']

// ─── Field creator modal ──────────────────────────────────────────────────────

function FieldModal({ objectName, objects, editField, onClose, onSaved }) {
  const toast = useToast()
  const [step, setStep] = useState(editField ? 1 : 0)
  const [form, setForm] = useState(() => editField
    ? { ...editField }
    : { fieldType: '', label: '', fieldName: '', description: '', defaultValue: '',
        isRequired: false, maxLength: '', decimalPlaces: '', formulaExpression: '',
        lookupObject: '', sectionName: 'Custom Fields', picklistValues: '' }
  )
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'label' && !editField) {
      next.fieldName = `cf_${v.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}`
    }
    return next
  })

  const save = async () => {
    if (!form.label.trim()) return toast.error('Label is required')
    setSaving(true)
    try {
      if (editField?.id && editField.isCustom) {
        await api.put(`/api/v1/schema/fields/${editField.id}`, {
          label: form.label, description: form.description,
          isRequired: form.isRequired, sectionName: form.sectionName,
          picklistValues: form.picklistValues || null,
        })
      } else {
        await api.post('/api/v1/schema/fields', {
          objectName, ...form,
          maxLength: form.maxLength ? parseInt(form.maxLength) : null,
          decimalPlaces: form.decimalPlaces ? parseInt(form.decimalPlaces) : null,
        })
      }
      toast.success(editField ? 'Field updated' : 'Field created')
      onSaved()
      onClose()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  // Step 0: pick type
  if (step === 0) {
    return (
      <Modal open title="New Field — Choose Type" onClose={onClose} width="max-w-2xl">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {FIELD_TYPES.map(ft => (
            <button
              key={ft.type}
              onClick={() => { set('fieldType', ft.type); setStep(1) }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:border-indigo-500 hover:bg-indigo-500/10 ${
                form.fieldType === ft.type ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <span className="text-xl">{ft.icon}</span>
              <span className="text-[11px] text-gray-600">{ft.label}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </Modal>
    )
  }

  // Step 1: configure
  const selectedType = FIELD_TYPES.find(ft => ft.type === form.fieldType)

  return (
    <Modal
      open
      title={editField ? `Edit Field: ${editField.label}` : `New ${selectedType?.label || ''} Field`}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Field Label *" value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. LinkedIn URL" />
          <div>
            <label className="block text-[12px] text-gray-500 mb-1">API Name</label>
            <code className="block bg-gray-50 border border-gray-200 rounded px-3 py-2 text-[12px] text-indigo-600 font-mono">
              {form.fieldName || form.field_name || '—'}
            </code>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Description" value={form.description || ''} onChange={e => set('description', e.target.value)} />
          <Input label="Default Value" value={form.defaultValue || form.default_value || ''} onChange={e => set('defaultValue', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-gray-500 mb-1">Section</label>
            <input
              className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-indigo-400"
              value={form.sectionName || form.section_name || 'Custom Fields'}
              onChange={e => set('sectionName', e.target.value)}
              placeholder="Section name"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isRequired || form.is_required || false}
                onChange={e => set('isRequired', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
              />
              <span className="text-[13px] text-gray-600">Required field</span>
            </label>
          </div>
        </div>

        {/* Type-specific options */}
        {(form.fieldType === 'text') && (
          <Input label="Max Length" value={form.maxLength || ''} onChange={e => set('maxLength', e.target.value)} type="number" />
        )}
        {(form.fieldType === 'number' || form.fieldType === 'currency' || form.fieldType === 'percent') && (
          <Input label="Decimal Places" value={form.decimalPlaces || ''} onChange={e => set('decimalPlaces', e.target.value)} type="number" />
        )}
        {(form.fieldType === 'picklist' || form.fieldType === 'multipicklist') && (
          <div>
            <label className="block text-[12px] text-gray-500 mb-1">Picklist Values (one per line)</label>
            <textarea
              className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-indigo-400 min-h-[80px] resize-y"
              value={form.picklistValues || ''}
              onChange={e => set('picklistValues', e.target.value)}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
            <p className="text-gray-400 text-[11px] mt-1">You can add colors later in the Picklist editor.</p>
          </div>
        )}
        {form.fieldType === 'lookup' && (
          <Select
            label="Related To Object"
            value={form.lookupObject || ''}
            onChange={e => set('lookupObject', e.target.value)}
          >
            <option value="">— Select Object —</option>
            {objects.map(o => (
              <option key={o.name} value={o.name}>{o.label || o.name}</option>
            ))}
          </Select>
        )}
        {form.fieldType === 'formula' && (
          <div>
            <label className="block text-[12px] text-gray-500 mb-1">Formula Expression</label>
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-[13px] text-indigo-700 font-mono focus:outline-none focus:border-indigo-400 min-h-[80px]"
              value={form.formulaExpression || ''}
              onChange={e => set('formulaExpression', e.target.value)}
              placeholder="e.g. {first_name} & ' ' & {last_name}"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
        {!editField && (
          <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : (editField ? 'Save Changes' : 'Create Field')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Picklist editor modal ────────────────────────────────────────────────────

function PicklistModal({ objectName, field, onClose }) {
  const toast = useToast()
  const [values,  setValues]  = useState([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')

  const PRESET_COLORS = [
    '#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6',
    '#ec4899','#14b8a6','#f97316','#8b5cf6','#64748b',
  ]

  useEffect(() => {
    api.get(`/api/v1/schema/picklists?objectName=${objectName}&fieldName=${field.fieldName || field.field_name}`)
      .then(r => setValues(r?.values || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [objectName, field])

  const addValue = async () => {
    if (!newLabel.trim()) return
    try {
      const r = await api.post('/api/v1/schema/picklists', {
        objectName,
        fieldName: field.fieldName || field.field_name,
        value: newLabel.trim().toLowerCase().replace(/\s+/g, '_'),
        label: newLabel.trim(),
        sortOrder: values.length,
        color: newColor,
      })
      setValues(v => [...v, r?.value || r])
      setNewLabel('')
      toast.success('Value added')
    } catch (e) { toast.error(e.message) }
  }

  const deleteValue = async (id) => {
    try {
      await api.del(`/api/v1/schema/picklists/${id}`)
      setValues(v => v.filter(x => x.id !== id))
      toast.success('Value removed')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open title={`Picklist Values: ${field.label}`} onClose={onClose}>
      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {values.length === 0 && (
              <p className="text-gray-400 text-[13px] text-center py-4">No values yet.</p>
            )}
            {values.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <div
                  className="w-4 h-4 rounded shrink-0 cursor-pointer"
                  style={{ backgroundColor: v.color || '#6366f1' }}
                  title="Click preset to change"
                />
                <span className="flex-1 text-[13px] text-gray-800">{v.label}</span>
                <code className="text-indigo-600 text-[11px] font-mono">{v.value}</code>
                <button onClick={() => deleteValue(v.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add value */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex gap-2 mb-3">
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addValue()}
                placeholder="New value label"
                className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-indigo-400"
              />
              <div className="flex gap-1 items-center">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button variant="primary" onClick={addValue} size="sm">Add</Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Tab: Fields ──────────────────────────────────────────────────────────────

function FieldsTab({ objectName, fields, loading, objects, onReload }) {
  const toast = useToast()
  const [showField,         setShowField]         = useState(false)
  const [editField,         setEditField]         = useState(null)
  const [picklistFor,       setPicklistFor]       = useState(null)
  const [deleteTarget,      setDeleteTarget]      = useState(null)
  const [collapsedSections, setCollapsedSections] = useState({ 'System Fields': true })

  const deleteField = async (id) => {
    try {
      await api.del(`/api/v1/schema/fields/${id}`)
      toast.success('Field deactivated')
      onReload()
    } catch (e) { toast.error(e.message) }
    setDeleteTarget(null)
  }

  const columns = [
    {
      key: 'label',
      label: 'Field Label',
      render: (v, row) => (
        <div>
          <span className="text-gray-900">{v}</span>
          {row.isRequired && <span className="ml-2 text-rose-400 text-[10px]">Required</span>}
        </div>
      ),
    },
    {
      key: 'fieldName',
      label: 'API Name',
      render: v => <code className="text-indigo-600 text-[11px] font-mono">{v || '—'}</code>,
    },
    {
      key: 'fieldType',
      label: 'Type',
      render: v => {
        const ft = FIELD_TYPES.find(f => f.type === v)
        return (
          <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
            <span>{ft?.icon}</span> {ft?.label || v}
          </span>
        )
      },
    },
    {
      key: 'sectionName',
      label: 'Section',
      render: v => <span className="text-gray-500 text-[12px]">{v || '—'}</span>,
    },
    {
      key: 'isCustom',
      label: '',
      render: (isCustom, row) => (
        <div className="flex items-center gap-2 justify-end">
          {isCustom && (
            <>
              {(row.fieldType === 'picklist' || row.fieldType === 'multipicklist') && (
                <button
                  onClick={e => { e.stopPropagation(); setPicklistFor(row) }}
                  className="text-gray-500 hover:text-amber-600 p-1 rounded"
                  title="Edit picklist values"
                >
                  <CheckSquare size={14} />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setEditField(row); setShowField(true) }}
                className="text-gray-500 hover:text-indigo-600 p-1 rounded"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeleteTarget(row) }}
                className="text-gray-500 hover:text-red-500 p-1 rounded"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {!isCustom && <Badge color="slate" className="text-[10px]">Standard</Badge>}
        </div>
      ),
    },
  ]

  // Group by section — System Fields always last
  const sectionsMap = {}
  fields.forEach(f => {
    const sec = f.sectionName || f.section_name || 'Standard Fields'
    if (!sectionsMap[sec]) sectionsMap[sec] = []
    sectionsMap[sec].push(f)
  })
  const sectionEntries = Object.entries(sectionsMap).sort(([a], [b]) => {
    if (a === 'System Fields') return 1
    if (b === 'System Fields') return -1
    return 0
  })

  const toggleSec = (name) => setCollapsedSections(prev => ({ ...prev, [name]: !prev[name] }))

  const visibleFieldCount = fields.filter(f => {
    const sec = f.sectionName || f.section_name || 'Standard Fields'
    return sec !== 'System Fields'
  }).length

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 text-[13px]">{visibleFieldCount} fields <span className="text-gray-600">({fields.length} total incl. system)</span></p>
        <Button variant="primary" icon={Plus} onClick={() => { setEditField(null); setShowField(true) }}>
          New Field
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading fields…</div>
      ) : (
        sectionEntries.map(([sec, secFields]) => {
          const isSystem   = sec === 'System Fields'
          const isCollapsed = !!collapsedSections[sec]
          return (
            <div key={sec} className="mb-6">
              <button
                onClick={() => toggleSec(sec)}
                className="w-full flex items-center gap-2 mb-2 group text-left"
              >
                <span className={`w-2 h-2 rounded-full inline-block ${isSystem ? 'bg-slate-500' : 'bg-indigo-500'}`} />
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                  {sec}
                </span>
                <span className="text-[11px] text-gray-500">({secFields.length})</span>
                <span className={`ml-auto text-[10px] text-gray-600 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
              </button>
              {!isCollapsed && <DataTable rows={secFields} columns={columns} emptyText="No fields" />}
            </div>
          )
        })
      )}

      {showField && (
        <FieldModal
          objectName={objectName}
          objects={objects}
          editField={editField}
          onClose={() => { setShowField(false); setEditField(null) }}
          onSaved={onReload}
        />
      )}
      {picklistFor && (
        <PicklistModal
          objectName={objectName}
          field={picklistFor}
          onClose={() => setPicklistFor(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Deactivate Field"
        description={`Deactivate "${deleteTarget?.label}"? The database column will remain but the field will be hidden.`}
        onConfirm={() => deleteField(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  )
}

// ─── Tab: Layouts ─────────────────────────────────────────────────────────────

function LayoutsTab({ objectName }) {
  const navigate = useNavigate()
  const toast    = useToast()
  const [layouts,  setLayouts]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [newName,  setNewName]  = useState('')
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/api/v1/schema/layouts?objectName=${objectName}`)
      setLayouts(Array.isArray(r) ? r : r?.layouts || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }, [objectName])

  useEffect(() => { load() }, [load])

  const createLayout = async () => {
    const name = newName.trim() || 'Default Layout'
    setSaving(true)
    try {
      const r  = await api.post('/api/v1/schema/layouts', {
        objectName, name, sections: [], isDefault: layouts.length === 0,
      })
      const id = r?.layout?.id || r?.id
      navigate(`/head/setup/objects/${objectName}/layouts/${id}`)
    } catch (e) { toast.error(e.message); setSaving(false) }
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-[13px]">Loading…</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-gray-800">Page Layouts</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">Choose a layout to edit which fields appear on record pages.</p>
        </div>
      </div>

      {/* Existing layouts */}
      {layouts.length > 0 ? (
        <div className="space-y-2 mb-8">
          {layouts.map(l => (
            <button
              key={l.id}
              onClick={() => navigate(`/head/setup/objects/${objectName}/layouts/${l.id}`)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-indigo-100 flex items-center justify-center">
                  <Layout size={13} className="text-indigo-600" />
                </div>
                <div>
                  <span className="text-[13px] font-medium text-gray-800">{l.name}</span>
                  {l.isDefault && <span className="ml-2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Default</span>}
                  {l.role && <span className="ml-2 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">{l.role}</span>}
                </div>
              </div>
              <span className="text-[12px] text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Edit Layout →</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300 text-center text-[13px] text-gray-400">
          No layouts yet.
        </div>
      )}

      {/* Create new */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-[12px] font-semibold text-gray-700 mb-3">Create a new layout</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createLayout()}
            placeholder="Layout name (e.g. Default Layout)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-400 bg-gray-50"
          />
          <Button variant="primary" icon={Plus} onClick={createLayout} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: List Views ──────────────────────────────────────────────────────────

function ListViewsTab({ objectName }) {
  const navigate = useNavigate()
  const [views,   setViews]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await api.get(`/api/v1/schema/list-views?objectName=${objectName}`)
      setViews(r?.views || [])
    } catch (e) { setError(e.message || 'Failed to load list views.') }
    setLoading(false)
  }, [objectName])

  useEffect(() => { load() }, [load])

  const columns = [
    { key: 'name',       label: 'View Name',   render: v => <span className="text-gray-900 font-medium">{v}</span> },
    { key: 'columns',    label: 'Columns',     render: v => <span className="text-gray-500 text-[12px]">{Array.isArray(v) ? v.length + ' columns' : '—'}</span> },
    { key: 'sharedWith', label: 'Shared With', render: v => <Badge color={v === 'all' ? 'indigo' : 'slate'}>{v || 'all'}</Badge> },
    { key: 'isDefault',  label: 'Default',     render: v => v ? <Badge color="emerald">Default</Badge> : null },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 text-[13px]">{views.length} view(s)</p>
        <Button variant="primary" icon={Plus}
          onClick={() => navigate(`/head/setup/objects/${objectName}/list-views/new`)}
        >
          New List View
        </Button>
      </div>
      {error
        ? <div className="py-8 text-center text-red-500 text-sm">{error}</div>
        : (
          <DataTable
            rows={views}
            columns={columns}
            loading={loading}
            emptyText="No list views configured."
            onRowClick={row => navigate(`/head/setup/objects/${objectName}/list-views/${row.id}`)}
            rowClassName="cursor-pointer hover:bg-white/5"
          />
        )
      }
    </div>
  )
}

// ─── Tab: Permissions ────────────────────────────────────────────────────────

function PermissionsTab({ objectName, fields }) {
  const toast = useToast()
  const [perms,   setPerms]   = useState({})  // role__field → { visible, editable }
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.getPermissions('', objectName)
      .then(r => {
        const map = {}
        const ps = r?.permissions || []
        ps.forEach(p => { map[`${p.role}__${p.fieldName || p.field_name}`] = { visible: p.visible, editable: p.editable } })
        setPerms(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [objectName])

  const customFields = fields.filter(f => f.isCustom)

  const toggle = (role, fieldName, prop) => {
    const key = `${role}__${fieldName}`
    setPerms(p => {
      const cur = p[key] || { visible: true, editable: true }
      const next = { ...cur, [prop]: !cur[prop] }
      // editable implies visible
      if (prop === 'editable' && next.editable) next.visible = true
      return { ...p, [key]: next }
    })
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const calls = []
      Object.entries(perms).forEach(([key, v]) => {
        const [role, fieldName] = key.split('__')
        calls.push(api.post('/api/v1/schema/permissions', { role, objectName, fieldName, visible: v.visible, editable: v.editable }))
      })
      await Promise.all(calls)
      toast.success('Permissions saved')
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>
  if (customFields.length === 0) return (
    <div className="py-12 text-center text-gray-400">No custom fields to set permissions on.</div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 text-[13px]">Field-level security for custom fields</p>
        <Button variant="primary" icon={Save} onClick={saveAll} disabled={saving}>
          {saving ? 'Saving…' : 'Save Permissions'}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Field</th>
              {ROLES.map(role => (
                <th key={role} colSpan={2} className="text-center py-2 px-3 text-gray-500 font-medium">
                  {role}
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-200">
              <th className="py-1 px-3" />
              {ROLES.map(role => (
                <React.Fragment key={role}>
                  <th className="text-center py-1 px-2 text-gray-500 font-normal">
                    <span className="flex gap-1 items-center justify-center"><Eye size={11} /> Visible</span>
                  </th>
                  <th className="text-center py-1 px-2 text-gray-500 font-normal">Editable</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {customFields.map(field => {
              const fn = field.fieldName || field.field_name
              return (
                <tr key={fn} className="border-b border-white/5 hover:bg-white/3">
                  <td className="py-2 px-3 text-gray-700">{field.label}</td>
                  {ROLES.map(role => {
                    const k = `${role}__${fn}`
                    const p = perms[k] || { visible: true, editable: true }
                    return (
                      <React.Fragment key={role}>
                        <td className="text-center py-2 px-2">
                          <button onClick={() => toggle(role, fn, 'visible')} className="text-gray-500 hover:text-gray-900">
                            {p.visible ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} />}
                          </button>
                        </td>
                        <td className="text-center py-2 px-2">
                          <button onClick={() => toggle(role, fn, 'editable')} className="text-gray-500 hover:text-gray-900">
                            {p.editable ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} />}
                          </button>
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Object Detail Page ──────────────────────────────────────────────────

export default function ObjectDetailPage() {
  const { objectName } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [object,  setObject]  = useState(null)
  const [fields,  setFields]  = useState([])
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('fields')

  const loadFields = useCallback(async () => {
    try {
      const r = await api.getSchemaFields(objectName)
      setFields(r?.fields || r || [])
    } catch { /* ignore */ }
  }, [objectName])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [objR] = await Promise.all([
          api.getSchemaObjects(),
        ])
        const all = objR?.objects || objR || []
        setObjects(all)
        const obj = all.find(o => o.name === objectName)
        setObject(obj || { name: objectName, label: objectName, isCustom: false })
        await loadFields()
      } catch (e) { toast.error(e.message) }
      setLoading(false)
    }
    init()
  }, [objectName, loadFields, toast])

  const tabs = [
    { id: 'fields',      label: 'Fields & Relationships' },
    { id: 'layouts',     label: 'Page Layouts' },
    { id: 'list-views',  label: 'List Views' },
    { id: 'rules',       label: 'Validation Rules' },
    { id: 'automation',  label: 'Automation' },
    { id: 'permissions', label: 'Field Permissions' },
  ]

  return (
    <Page
      title={object?.label || objectName}
      subtitle={
        <span className="flex items-center gap-2">
          <code className="text-indigo-600 text-[11px] font-mono">{objectName}</code>
          {object?.isCustom && <Badge color="indigo">Custom Object</Badge>}
          {!object?.isCustom && <Badge color="slate">Standard Object</Badge>}
        </span>
      }
      breadcrumb={
        <button onClick={() => navigate('/head/setup/objects')}
          className="text-gray-500 hover:text-gray-800 text-[12px] flex items-center gap-1 transition-colors"
        >
          Object Manager <ChevronRight size={12} /> {object?.label || objectName}
        </button>
      }
      actions={
        <Button
          variant="ghost"
          icon={ExternalLink}
          size="sm"
          onClick={() => navigate(`/head/dynamic/${objectName}`)}
        >
          Open in CRM
        </Button>
      }
    >
      <div className="space-y-4">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'fields' && (
          <FieldsTab
            objectName={objectName}
            fields={fields}
            loading={loading}
            objects={objects}
            onReload={loadFields}
          />
        )}
        {tab === 'layouts' && <LayoutsTab objectName={objectName} />}
        {tab === 'list-views' && <ListViewsTab objectName={objectName} />}
        {tab === 'rules' && (
          <div className="py-8 text-center">
            <p className="text-gray-500 mb-4">Manage validation rules for {object?.label || objectName}</p>
            <Button variant="primary" icon={ExternalLink} onClick={() => navigate('/head/rules')}>
              Open Validation Rules Builder
            </Button>
          </div>
        )}
        {tab === 'automation' && (
          <div className="py-8 text-center">
            <p className="text-gray-500 mb-4">Build automation flows triggered by {object?.label || objectName} changes</p>
            <Button variant="primary" icon={ExternalLink} onClick={() => navigate('/head/flows')}>
              Open Flow Builder
            </Button>
          </div>
        )}
        {tab === 'permissions' && (
          <PermissionsTab objectName={objectName} fields={fields} />
        )}
      </div>
    </Page>
  )
}
