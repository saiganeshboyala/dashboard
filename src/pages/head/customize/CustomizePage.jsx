import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { get, post, put } from '../../../utils/api'
import RoleCRMSimulator from './RoleCRMSimulator'
import {
  Users, User, Building2, FileText, Calendar, Briefcase, Layers, Package,
  Settings, BarChart2, Clipboard, Mail, Phone, Link2, DollarSign, Percent,
  Search, AlignLeft, Hash, Type, Grid3x3, ToggleLeft, CheckSquare,
  Layout, Shield, Sliders, Eye, EyeOff, Lock, Unlock, ChevronRight,
  X, Monitor, Smartphone, Tablet, AlertCircle, CheckCircle2, Info,
  LayoutGrid, List, Star, TrendingUp, Box, GraduationCap, UserCheck,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'modules',  label: 'Modules',  Icon: LayoutGrid },
  { id: 'details',  label: 'Details',  Icon: List },
  { id: 'layouts',  label: 'Layouts',  Icon: Layout },
  { id: 'access',   label: 'Access',   Icon: Shield },
  { id: 'rules',    label: 'Rules',    Icon: Sliders },
]

const FIELD_TYPES = [
  { value: 'text',        label: 'Text',            Icon: Type },
  { value: 'number',      label: 'Number',          Icon: Hash },
  { value: 'date',        label: 'Date',            Icon: Calendar },
  { value: 'checkbox',    label: 'Yes/No',          Icon: CheckSquare },
  { value: 'picklist',    label: 'Dropdown',        Icon: Grid3x3 },
  { value: 'email',       label: 'Email',           Icon: Mail },
  { value: 'phone',       label: 'Phone',           Icon: Phone },
  { value: 'url',         label: 'Link',            Icon: Link2 },
  { value: 'currency',    label: 'Money',           Icon: DollarSign },
  { value: 'percent',     label: 'Percentage',      Icon: Percent },
  { value: 'lookup',      label: 'Link to Module',  Icon: Search },
  { value: 'textarea',    label: 'Long Text',       Icon: AlignLeft },
  { value: 'auto_number', label: 'Auto-Number',     Icon: Hash },
]

const SYSTEM_FIELD_NAMES = ['id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'is_active']

const ROLES = [
  { key: 'admin',      label: 'Admins',           Icon: Shield },
  { key: 'team_lead',  label: 'Team Leads',        Icon: Star },
  { key: 'recruiter',  label: 'Team Members',      Icon: UserCheck },
  { key: 'student',    label: 'Students/Contacts', Icon: GraduationCap },
]

const OPERATORS = [
  { value: 'equals',      label: 'is equal to' },
  { value: 'not_equals',  label: 'is not equal to' },
  { value: 'contains',    label: 'contains' },
  { value: 'is_empty',    label: 'is empty' },
  { value: 'is_not_empty',label: 'is not empty' },
  { value: 'changed_to',  label: 'changes to' },
  { value: 'is_changed',  label: 'is changed' },
  { value: 'greater_than',label: 'is greater than' },
  { value: 'less_than',   label: 'is less than' },
]

const SECTION_COLORS = ['bg-indigo-50 border-indigo-200','bg-purple-50 border-purple-200','bg-blue-50 border-blue-200','bg-emerald-50 border-emerald-200','bg-amber-50 border-amber-200']

// Map backend icon-name strings → lucide components
const ICON_COMPONENTS = {
  users: Users, user: User, recruiter: UserCheck,
  building: Building2, file: FileText, calendar: Calendar,
  briefcase: Briefcase, layers: Layers, chart: BarChart2,
  clipboard: Clipboard, dashboard: Monitor, settings: Settings,
  mail: Mail, phone: Phone, star: Star, box: Box,
  student: GraduationCap, trending: TrendingUp,
}
function ModuleIcon({ icon, size = 18, className = '' }) {
  const Comp = ICON_COMPONENTS[icon] || Package
  return <Comp size={size} className={className} strokeWidth={1.75} />
}

// ─── Saved indicator ─────────────────────────────────────────────────────────

function SavedBadge({ show }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 animate-fade-in">
      Saved ✓
    </span>
  )
}

function useSavedFeedback() {
  const [saved, setSaved] = useState(false)
  const timerRef = useRef(null)
  const triggerSaved = useCallback(() => {
    setSaved(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSaved(false), 2200)
  }, [])
  return [saved, triggerSaved]
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${
        checked ? 'bg-indigo-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ─── Slide-out Panel ──────────────────────────────────────────────────────────

function SlidePanel({ open, onClose, title, children }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <div className="relative z-50 w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-lg">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative z-50 bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-xs text-gray-500 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="px-3 py-1.5 text-xs text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 1: Modules ───────────────────────────────────────────────────────────

function ModulesTab({ onCustomizeDetails }) {
  const [modules, setModules]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [editingName, setEditingName] = useState(null)
  const [nameValue, setNameValue]   = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newModName, setNewModName] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [saved, triggerSaved]       = useSavedFeedback()

  const fetchModules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await get('/api/v1/setup/modules')
      setModules(Array.isArray(data) ? data : data?.modules || [])
    } catch {
      setModules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchModules() }, [fetchModules])

  const toggleModule = async (mod) => {
    try {
      await put(`/api/v1/setup/modules/${mod.objectName}`, { isActive: !mod.isActive })
      setModules(prev => prev.map(m => m.objectName === mod.objectName ? { ...m, isActive: !m.isActive } : m))
      triggerSaved()
    } catch {}
  }

  const startRename = (mod) => {
    setEditingName(mod.objectName)
    setNameValue(mod.label || mod.objectName)
  }

  const saveRename = async (mod) => {
    if (!nameValue.trim()) { setEditingName(null); return }
    try {
      await put(`/api/v1/setup/modules/${mod.objectName}`, { label: nameValue.trim() })
      setModules(prev => prev.map(m => m.objectName === mod.objectName ? { ...m, label: nameValue.trim() } : m))
      triggerSaved()
    } catch {}
    setEditingName(null)
  }

  const addModule = async () => {
    if (!newModName.trim()) return
    setAddLoading(true)
    try {
      await post('/api/v1/setup/modules', { name: newModName.trim() })
      setShowAddModal(false)
      setNewModName('')
      await fetchModules()
      triggerSaved()
    } catch {}
    setAddLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading modules…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-gray-600">Enable or disable modules and customize their names.</p>
        </div>
        <div className="flex items-center gap-3">
          <SavedBadge show={saved} />
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <span>+</span> Add Module
          </button>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
          <p className="text-sm">No modules yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(mod => (
            <div
              key={mod.objectName}
              className={`bg-white border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                mod.isActive ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <ModuleIcon icon={mod.icon} size={17} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingName === mod.objectName ? (
                      <input
                        autoFocus
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onBlur={() => saveRename(mod)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(mod); if (e.key === 'Escape') setEditingName(null) }}
                        className="w-full text-sm font-medium border-b border-indigo-400 bg-transparent focus:outline-none text-gray-900"
                      />
                    ) : (
                      <button
                        onClick={() => startRename(mod)}
                        className="text-sm font-semibold text-gray-900 hover:text-indigo-600 truncate block w-full text-left transition-colors"
                        title="Click to rename"
                      >
                        {mod.label || mod.objectName}
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{mod.fieldCount ?? 0} detail{mod.fieldCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <Toggle checked={!!mod.isActive} onChange={() => toggleModule(mod)} />
              </div>

              {mod.description && (
                <p className="text-xs text-gray-500 leading-relaxed">{mod.description}</p>
              )}

              <button
                onClick={() => onCustomizeDetails(mod.objectName)}
                className="mt-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
              >
                Customize Details <span>→</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Module Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddModal(false)} />
          <div className="relative z-50 bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Module</h3>
            <input
              autoFocus
              value={newModName}
              onChange={e => setNewModName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addModule() }}
              placeholder="e.g. Clients, Vendors, Locations…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={addModule}
                disabled={addLoading || !newModName.trim()}
                className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {addLoading ? 'Creating…' : 'Create Module'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Details ────────────────────────────────────────────────────────────

function DetailsTab({ initialModule }) {
  const [modules, setModules]           = useState([])
  const [selectedMod, setSelectedMod]   = useState(initialModule || '')
  const [fields, setFields]             = useState([])
  const [loading, setLoading]           = useState(false)
  const [search, setSearch]             = useState('')
  const [panelOpen, setPanelOpen]       = useState(false)
  const [editField, setEditField]       = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [systemExpanded, setSystemExpanded] = useState(false)
  const [saved, triggerSaved]           = useSavedFeedback()

  const [form, setForm] = useState({
    type: 'text', label: '', section: '', required: false, choices: '', newSection: ''
  })

  useEffect(() => {
    get('/api/v1/setup/modules')
      .then(data => {
        const mods = Array.isArray(data) ? data : data?.modules || []
        setModules(mods)
        if (!selectedMod && mods.length > 0) setSelectedMod(mods[0].objectName)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedMod) return
    setLoading(true)
    get(`/api/v1/schema/fields?objectName=${selectedMod}`)
      .then(data => {
        const f = Array.isArray(data) ? data : data?.fields || []
        setFields(f)
      })
      .catch(() => setFields([]))
      .finally(() => setLoading(false))
  }, [selectedMod])

  const systemFields = fields.filter(f => SYSTEM_FIELD_NAMES.includes(f.fieldName || f.name))
  const userFields   = fields.filter(f => !SYSTEM_FIELD_NAMES.includes(f.fieldName || f.name))

  const filtered = userFields.filter(f =>
    (f.label || f.fieldName || '').toLowerCase().includes(search.toLowerCase())
  )

  const sections = [...new Set(userFields.map(f => f.section || 'General').filter(Boolean))]

  const openAdd = () => {
    setEditField(null)
    setForm({ type: 'text', label: '', section: sections[0] || '', required: false, choices: '', newSection: '' })
    setPanelOpen(true)
  }

  const openEdit = (field) => {
    setEditField(field)
    setForm({
      type: field.fieldType || field.type || 'text',
      label: field.label || '',
      section: field.section || 'General',
      required: !!field.isRequired,
      choices: (field.choices || []).join('\n'),
      newSection: ''
    })
    setPanelOpen(true)
  }

  const saveField = async () => {
    if (!form.label.trim()) return
    const sectionVal = form.section === '__new__' ? form.newSection : form.section
    const payload = {
      objectName: selectedMod,
      type: form.type,
      label: form.label.trim(),
      section: sectionVal || 'General',
      required: form.required,
      ...(form.type === 'picklist' ? { choices: form.choices.split('\n').map(s => s.trim()).filter(Boolean) } : {}),
    }
    try {
      if (editField) {
        await put(`/api/v1/setup/fields/${editField.id}`, payload)
      } else {
        await post(`/api/v1/setup/modules/${selectedMod}/fields`, payload)
      }
      setPanelOpen(false)
      triggerSaved()
      const data = await get(`/api/v1/schema/fields?objectName=${selectedMod}`)
      setFields(Array.isArray(data) ? data : data?.fields || [])
    } catch {}
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await put(`/api/v1/setup/fields/${deleteTarget.id}`, { isActive: false })
      setDeleteTarget(null)
      triggerSaved()
      const data = await get(`/api/v1/schema/fields?objectName=${selectedMod}`)
      setFields(Array.isArray(data) ? data : data?.fields || [])
    } catch {}
    setDeleteLoading(false)
  }

  const typeInfo = (type) => FIELD_TYPES.find(t => t.value === type) || { Icon: Type, label: type }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={selectedMod}
          onChange={e => setSelectedMod(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          {modules.map(m => (
            <option key={m.objectName} value={m.objectName}>{m.label || m.objectName}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search fields…"
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-32"
        />
        <div className="flex items-center gap-2 ml-auto">
          <SavedBadge show={saved} />
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ➕ Add Detail
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading fields…</div>
      ) : filtered.length === 0 && !search ? (
        <div className="text-center py-16 text-gray-400">
          <List size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
          <p className="text-sm">No custom fields yet.</p>
          <button onClick={openAdd} className="mt-3 text-xs text-indigo-600 hover:underline">Add your first field →</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group by section */}
          {[...new Set(filtered.map(f => f.section || 'General'))].map(section => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{section}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filtered.filter(f => (f.section || 'General') === section).map((field, fi) => {
                  const ti = typeInfo(field.fieldType || field.type)
                  return (
                    <div key={field.id ?? field.fieldName ?? field.name ?? fi} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                        <ti.Icon size={13} className="text-gray-500" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">{field.label}</span>
                          {field.isRequired && (
                            <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full px-1.5 py-px">Required</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{ti.label} · {field.fieldName || field.name}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => openEdit(field)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Edit">✏️</button>
                        <button onClick={() => setDeleteTarget(field)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete">🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Fields */}
      {systemFields.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setSystemExpanded(!systemExpanded)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span>{systemExpanded ? '▼' : '▶'}</span>
            <span>🔧 System Details (hidden) — {systemFields.length} fields</span>
          </button>
          {systemExpanded && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {systemFields.map(field => (
                <div key={field.id || field.fieldName} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-sm text-gray-700">{field.label || field.fieldName}</p>
                    <p className="text-[11px] text-gray-400">{field.fieldType || field.type} · system</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Field Slide Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editField ? 'Edit Field' : 'Add New Field'}
      >
        <div className="space-y-5">
          {/* Type grid */}
          {!editField && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Field Type</label>
              <div className="grid grid-cols-3 gap-2">
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft.value}
                    onClick={() => setForm(f => ({ ...f, type: ft.value }))}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${
                      form.type === ft.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <ft.Icon size={14} strokeWidth={2} />
                    <span className="text-center leading-tight">{ft.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Label */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Label</label>
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Full Name"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Section</label>
            <select
              value={form.section}
              onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__new__">+ New section…</option>
            </select>
            {form.section === '__new__' && (
              <input
                value={form.newSection}
                onChange={e => setForm(f => ({ ...f, newSection: e.target.value }))}
                placeholder="New section name"
                className="mt-2 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </div>

          {/* Required */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Required</span>
            <Toggle checked={form.required} onChange={v => setForm(f => ({ ...f, required: v }))} />
          </div>

          {/* Dropdown choices */}
          {form.type === 'picklist' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Choices (one per line)</label>
              <textarea
                value={form.choices}
                onChange={e => setForm(f => ({ ...f, choices: e.target.value }))}
                rows={4}
                placeholder={"Option 1\nOption 2\nOption 3"}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>
          )}

          <button
            onClick={saveField}
            disabled={!form.label.trim()}
            className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {editField ? 'Save Changes' : 'Add Field'}
          </button>
        </div>
      </SlidePanel>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete field?"
        message={`"${deleteTarget?.label}" will be hidden from the form. This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  )
}

// ─── Tab 3: Layouts ───────────────────────────────────────────────────────────

function LayoutsTab() {
  const [modules, setModules]         = useState([])
  const [selectedMod, setSelectedMod] = useState('')
  const [sections, setSections]       = useState([])
  const [fields, setFields]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, triggerSaved]         = useSavedFeedback()
  const debounceRef                   = useRef(null)

  useEffect(() => {
    get('/api/v1/setup/modules')
      .then(data => {
        const mods = Array.isArray(data) ? data : data?.modules || []
        setModules(mods)
        if (mods.length > 0) setSelectedMod(mods[0].objectName)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedMod) return
    let alive = true
    setLoading(true)
    Promise.all([
      get(`/api/v1/schema/fields?objectName=${selectedMod}`).catch(() => null),
      get(`/api/v1/setup/modules/${selectedMod}/layout`).catch(() => null),
    ]).then(([fieldsData, layoutData]) => {
      if (!alive) return

      const raw = Array.isArray(fieldsData) ? fieldsData : fieldsData?.fields || []
      const allFields = raw.filter(Boolean)
      const userFields = allFields.filter(fld =>
        !SYSTEM_FIELD_NAMES.includes(fld.fieldName || fld.field_name || fld.name)
      )
      setFields(userFields)

      if (layoutData?.sections && layoutData.sections.length > 0) {
        setSections(layoutData.sections)
      } else {
        // Build default sections from field sectionName grouping
        const sectionMap = {}
        allFields.forEach(fld => {
          const sec = fld.sectionName || fld.section_name || fld.section || 'General'
          const name = fld.fieldName || fld.field_name || fld.name
          if (!name) return
          if (!sectionMap[sec]) sectionMap[sec] = { name: sec, columns: 2, fields: [] }
          if (!SYSTEM_FIELD_NAMES.includes(name)) sectionMap[sec].fields.push(name)
        })
        // Remove empty sections
        const built = Object.values(sectionMap).filter(s => s.fields.length > 0)
        setSections(built)
      }
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [selectedMod])

  const autoSave = useCallback((newSections) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await put(`/api/v1/setup/modules/${selectedMod}/layout`, { sections: newSections })
        triggerSaved()
      } catch {}
      setSaving(false)
    }, 800)
  }, [selectedMod, triggerSaved])

  const updateSections = (newSections) => {
    setSections(newSections)
    autoSave(newSections)
  }

  const moveSection = (idx, dir) => {
    const next = [...sections]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]]
    updateSections(next)
  }

  const toggleColumns = (idx) => {
    const next = sections.map((s, i) => i === idx ? { ...s, columns: s.columns === 2 ? 1 : 2 } : s)
    updateSections(next)
  }

  const removeSection = (idx) => {
    updateSections(sections.filter((_, i) => i !== idx))
  }

  const addSection = () => {
    updateSections([...sections, { name: 'New Section', columns: 2, fields: [] }])
  }

  const renameSection = (idx, name) => {
    updateSections(sections.map((s, i) => i === idx ? { ...s, name } : s))
  }

  const getFieldLabel = (fieldName) => {
    const f = fields.find(fld => (fld.fieldName || fld.name) === fieldName)
    return f?.label || fieldName
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={selectedMod}
          onChange={e => setSelectedMod(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          {modules.map(m => (
            <option key={m.objectName} value={m.objectName}>{m.label || m.objectName}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          {saving && <span className="text-xs text-gray-400">Saving…</span>}
          <SavedBadge show={saved} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading layout…</div>
      ) : (
        <div className="flex gap-6">
          {/* Editor */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sections</h4>
              <button
                onClick={addSection}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add Section
              </button>
            </div>

            {sections.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No sections. Add one to define your layout.</p>
              </div>
            ) : (
              sections.map((section, idx) => (
                <div key={idx} className={`border rounded-xl overflow-hidden ${SECTION_COLORS[idx % SECTION_COLORS.length]}`}>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <input
                      value={section.name}
                      onChange={e => renameSection(idx, e.target.value)}
                      className="flex-1 text-sm font-semibold bg-transparent focus:outline-none focus:border-b focus:border-indigo-400 text-gray-800"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleColumns(idx)}
                        className="text-[11px] text-gray-500 border border-gray-300 bg-white rounded px-2 py-0.5 hover:bg-gray-100"
                      >
                        {section.columns === 2 ? '2 cols' : '1 col'}
                      </button>
                      <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                      <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                      <button onClick={() => removeSection(idx)} className="p-1 text-gray-400 hover:text-red-500">✕</button>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    {section.fields && section.fields.length > 0 ? (
                      <div className={`grid gap-2 ${section.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {section.fields.map(fn => (
                          <div key={fn} className="bg-white/70 border border-white rounded-lg px-3 py-2 text-xs text-gray-700">
                            {getFieldLabel(fn)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No fields in this section</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Live Preview */}
          <div className="w-72 shrink-0">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
              {sections.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Add sections to preview</p>
              ) : (
                sections.map((section, idx) => (
                  <div key={idx}>
                    <div className={`text-xs font-semibold text-gray-600 mb-1.5 pb-1 border-b ${SECTION_COLORS[idx % SECTION_COLORS.length].split(' ')[1]}`}>
                      {section.name || 'Unnamed Section'}
                    </div>
                    <div className={`grid gap-1.5 ${section.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {(section.fields || []).map(fn => (
                        <div key={fn} className="bg-gray-50 rounded px-2 py-1 text-[11px] text-gray-600 border border-gray-100">
                          {getFieldLabel(fn)}
                        </div>
                      ))}
                      {(!section.fields || section.fields.length === 0) && (
                        <div className="col-span-2 text-[11px] text-gray-300 italic">empty</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab 4: Access ─────────────────────────────────────────────────────────────

const DEFAULT_PERMS = () => ({
  canView: true, canCreate: false, canEdit: false, canDelete: false, scope: 'all'
})

function AccessTab() {
  const [modules, setModules]         = useState([])
  const [selectedMod, setSelectedMod] = useState('')
  const [perms, setPerms]             = useState({})
  const [applyAll, setApplyAll]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [saved, triggerSaved]         = useSavedFeedback()
  const debounceRef                   = useRef(null)

  useEffect(() => {
    get('/api/v1/setup/modules')
      .then(data => {
        const mods = Array.isArray(data) ? data : data?.modules || []
        setModules(mods)
        if (mods.length > 0) setSelectedMod(mods[0].objectName)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedMod) return
    setLoading(true)
    get(`/api/v1/setup/modules/${selectedMod}/permissions`)
      .then(data => {
        const init = {}
        ROLES.forEach(r => {
          init[r.key] = (data && data[r.key]) ? data[r.key] : DEFAULT_PERMS()
        })
        setPerms(init)
      })
      .catch(() => {
        const init = {}
        ROLES.forEach(r => { init[r.key] = DEFAULT_PERMS() })
        setPerms(init)
      })
      .finally(() => setLoading(false))
  }, [selectedMod])

  const autoSave = useCallback((newPerms, mod) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const target = applyAll ? modules.map(m => m.objectName) : [mod]
        await Promise.all(target.map(objName =>
          put(`/api/v1/setup/modules/${objName}/permissions`, newPerms)
        ))
        triggerSaved()
      } catch {}
    }, 600)
  }, [applyAll, modules, triggerSaved])

  const update = (role, key, value) => {
    const next = { ...perms, [role]: { ...perms[role], [key]: value } }
    setPerms(next)
    autoSave(next, selectedMod)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={selectedMod}
          onChange={e => setSelectedMod(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          {modules.map(m => (
            <option key={m.objectName} value={m.objectName}>{m.label || m.objectName}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 ml-auto text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={e => setApplyAll(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
          />
          Apply to all modules
        </label>
        <SavedBadge show={saved} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading permissions…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLES.map(role => {
            const p = perms[role.key] || DEFAULT_PERMS()
            return (
              <div key={role.key} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <role.Icon size={14} className="text-indigo-600" strokeWidth={2} />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{role.label}</h4>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'canView',   label: 'Can View' },
                    { key: 'canCreate', label: 'Can Add New' },
                    { key: 'canEdit',   label: 'Can Edit' },
                    { key: 'canDelete', label: 'Can Delete' },
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">{perm.label}</span>
                      <Toggle
                        checked={!!p[perm.key]}
                        onChange={v => update(role.key, perm.key, v)}
                      />
                    </div>
                  ))}

                  {/* Scope radio */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">See:</p>
                    <div className="flex gap-3">
                      {[
                        { value: 'all',  label: 'All Records' },
                        { value: 'own',  label: 'Only Their Own' },
                      ].map(opt => (
                        <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`scope-${role.key}`}
                            value={opt.value}
                            checked={p.scope === opt.value}
                            onChange={() => update(role.key, 'scope', opt.value)}
                            className="text-indigo-600 focus:ring-indigo-400"
                          />
                          <span className="text-xs text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab 5: Rules ─────────────────────────────────────────────────────────────

function RulesTab() {
  const [modules, setModules]         = useState([])
  const [selectedMod, setSelectedMod] = useState('')
  const [rules, setRules]             = useState([])
  const [loading, setLoading]         = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [saved, triggerSaved]         = useSavedFeedback()

  useEffect(() => {
    get('/api/v1/setup/modules')
      .then(data => {
        const mods = Array.isArray(data) ? data : data?.modules || []
        setModules(mods)
        if (mods.length > 0) setSelectedMod(mods[0].objectName)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedMod) return
    setLoading(true)
    Promise.all([
      get(`/api/v1/validation-rules?objectType=${selectedMod}`).catch(() => []),
      get(`/api/v1/notification-rules?objectType=${selectedMod}`).catch(() => []),
    ]).then(([valRules, notifRules]) => {
      const vr = Array.isArray(valRules) ? valRules : valRules?.rules || []
      const nr = Array.isArray(notifRules) ? notifRules : notifRules?.rules || []
      setRules([...vr, ...nr])
    }).finally(() => setLoading(false))
  }, [selectedMod])

  const toggleRule = async (rule) => {
    try {
      await put(`/api/v1/setup/rules/${rule.id}`, { isActive: !rule.is_active && !rule.isActive })
      triggerSaved()
      setRules(prev => prev.map(r => r.id === rule.id
        ? { ...r, is_active: !(r.is_active ?? r.isActive), isActive: !(r.is_active ?? r.isActive) }
        : r
      ))
    } catch {}
  }

  const ruleTypeLabel = (type) => {
    const map = { error: 'Block save', warning: 'Warning', notification: 'Notification', email: 'Email', update: 'Update field' }
    return map[type] || type
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={selectedMod}
          onChange={e => setSelectedMod(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          {modules.map(m => (
            <option key={m.objectName} value={m.objectName}>{m.label || m.objectName}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <SavedBadge show={saved} />
          <button
            onClick={() => setShowBuilder(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Rule
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading rules…</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📏</div>
          <p className="text-sm">No rules yet for this module.</p>
          <button onClick={() => setShowBuilder(true)} className="mt-3 text-xs text-indigo-600 hover:underline">
            Create your first rule →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const isActive = rule.is_active ?? rule.isActive ?? true
            return (
              <div key={rule.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-opacity ${isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                      {ruleTypeLabel(rule.ruleType || rule.rule_type)}
                    </span>
                    {rule.objectType && (
                      <span className="text-xs text-gray-400">{rule.objectType}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 leading-snug">
                    When <strong>{rule.objectType || selectedMod}</strong>{' '}
                    {rule.trigger && <span>is <strong>{rule.trigger}</strong></span>}
                    {rule.conditions?.length > 0 && (
                      <span> and <strong>{rule.conditions[0]?.field}</strong> {rule.conditions[0]?.operator} <strong>{rule.conditions[0]?.value}</strong></span>
                    )}
                    {rule.message && <span> → <em>{rule.message}</em></span>}
                  </p>
                  {rule.name && <p className="text-xs text-gray-400 mt-1">{rule.name}</p>}
                </div>
                <Toggle checked={isActive} onChange={() => toggleRule(rule)} />
              </div>
            )
          })}
        </div>
      )}

      {/* Rule Builder Modal */}
      {showBuilder && (
        <RuleBuilderModal
          modules={modules}
          defaultModule={selectedMod}
          onClose={() => setShowBuilder(false)}
          onSave={async (payload) => {
            try {
              await post('/api/v1/setup/rules', payload)
              setShowBuilder(false)
              triggerSaved()
              // Refresh rules
              const [vr, nr] = await Promise.all([
                get(`/api/v1/validation-rules?objectType=${selectedMod}`).catch(() => []),
                get(`/api/v1/notification-rules?objectType=${selectedMod}`).catch(() => []),
              ])
              const a = Array.isArray(vr) ? vr : vr?.rules || []
              const b = Array.isArray(nr) ? nr : nr?.rules || []
              setRules([...a, ...b])
            } catch {}
          }}
        />
      )}
    </div>
  )
}

// ─── Rule Builder Modal ────────────────────────────────────────────────────────

function RuleBuilderModal({ modules, defaultModule, onClose, onSave }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1 — WHEN
  const [whenModule, setWhenModule]   = useState(defaultModule || '')
  const [whenEvent, setWhenEvent]     = useState('updated')
  const [modFields, setModFields]     = useState([])

  // Step 2 — IF
  const [conditions, setConditions]   = useState([{ field: '', operator: 'equals', value: '' }])

  // Step 3 — THEN
  const [thenType, setThenType]       = useState('error')
  const [thenMessage, setThenMessage] = useState('')
  const [thenRole, setThenRole]       = useState('')
  const [thenField, setThenField]     = useState('')
  const [thenValue, setThenValue]     = useState('')
  const [thenRecipient, setThenRecipient] = useState('')

  useEffect(() => {
    if (!whenModule) return
    get(`/api/v1/schema/fields?objectName=${whenModule}`)
      .then(data => {
        const f = Array.isArray(data) ? data : data?.fields || []
        setModFields(f.filter(fld => !SYSTEM_FIELD_NAMES.includes(fld.fieldName || fld.name)))
      })
      .catch(() => {})
  }, [whenModule])

  const addCondition = () => setConditions(prev => [...prev, { field: '', operator: 'equals', value: '' }])
  const updateCond = (idx, key, val) => setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c))
  const removeCond = (idx) => setConditions(prev => prev.filter((_, i) => i !== idx))

  const moduleName = modules.find(m => m.objectName === whenModule)?.label || whenModule

  const condPreview = conditions
    .filter(c => c.field)
    .map(c => `${c.field} ${OPERATORS.find(o => o.value === c.operator)?.label || c.operator} "${c.value}"`)
    .join(' AND ')

  const thenPreview = {
    error: `they will see: "${thenMessage}"`,
    warning: `they will see a warning: "${thenMessage}"`,
    notification: `a notification is sent to ${thenRole || 'the team'}`,
    email: `an email is sent to ${thenRecipient || '(recipient)'}`,
    update: `${thenField || '(field)'} is set to "${thenValue}"`,
  }[thenType] || ''

  const buildPayload = () => ({
    objectType: whenModule,
    trigger: whenEvent,
    conditions,
    ruleType: thenType,
    message: thenMessage,
    notifyRole: thenRole,
    updateField: thenField,
    updateValue: thenValue,
    emailRecipient: thenRecipient,
  })

  const handleSave = async () => {
    setSaving(true)
    await onSave(buildPayload())
    setSaving(false)
  }

  const THEN_OPTIONS = [
    { value: 'error',        label: 'Block the save',               Icon: AlertCircle },
    { value: 'warning',      label: 'Show a warning but allow save', Icon: Info },
    { value: 'notification', label: 'Send a notification',           Icon: CheckCircle2 },
    { value: 'email',        label: 'Send an email',                 Icon: Mail },
    { value: 'update',       label: 'Update a field automatically',  Icon: Sliders },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">New Rule</h3>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2">
          {['WHEN', 'IF', 'THEN'].map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => setStep(i + 1)}
                className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors flex items-center justify-center ${
                  step === i + 1 ? 'bg-indigo-600 text-white' : step > i + 1 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i + 1}
              </button>
              <span className={`ml-1 text-xs font-medium mr-3 ${step === i + 1 ? 'text-indigo-600' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <span className="text-gray-200 mr-3">→</span>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">When a</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={whenModule}
                  onChange={e => setWhenModule(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {modules.map(m => <option key={m.objectName} value={m.objectName}>{m.label || m.objectName}</option>)}
                </select>
                <span className="text-sm text-gray-600">is</span>
                <select
                  value={whenEvent}
                  onChange={e => setWhenEvent(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="created">created</option>
                  <option value="updated">updated</option>
                  <option value="deleted">deleted</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-3">Add conditions (optional)</p>
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={cond.field}
                    onChange={e => updateCond(idx, 'field', e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white flex-1"
                  >
                    <option value="">Select field…</option>
                    {modFields.map(f => (
                      <option key={f.fieldName || f.name} value={f.fieldName || f.name}>{f.label || f.fieldName}</option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={e => updateCond(idx, 'operator', e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  {!['is_empty', 'is_not_empty', 'is_changed'].includes(cond.operator) && (
                    <input
                      value={cond.value}
                      onChange={e => updateCond(idx, 'value', e.target.value)}
                      placeholder="value"
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-24"
                    />
                  )}
                  {conditions.length > 1 && (
                    <button onClick={() => removeCond(idx)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
                  )}
                </div>
              ))}
              <button onClick={addCondition} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1">
                + Add condition
              </button>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                {THEN_OPTIONS.map(opt => (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    thenType === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="thenType"
                      value={opt.value}
                      checked={thenType === opt.value}
                      onChange={() => setThenType(opt.value)}
                      className="text-indigo-600"
                    />
                    <opt.Icon size={15} className="text-indigo-500 shrink-0" strokeWidth={2} />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Contextual inputs */}
              <div className="pt-2 space-y-3">
                {(thenType === 'error' || thenType === 'warning') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {thenType === 'error' ? 'Error message' : 'Warning message'}
                    </label>
                    <input
                      value={thenMessage}
                      onChange={e => setThenMessage(e.target.value)}
                      placeholder="e.g. Status cannot be set to Exit without a reason"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                )}
                {thenType === 'notification' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notify role</label>
                    <select
                      value={thenRole}
                      onChange={e => setThenRole(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="">Select role…</option>
                      {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                )}
                {thenType === 'email' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Recipient</label>
                      <input value={thenRecipient} onChange={e => setThenRecipient(e.target.value)} placeholder="email or role" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                      <textarea value={thenMessage} onChange={e => setThenMessage(e.target.value)} rows={2} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                    </div>
                  </>
                )}
                {thenType === 'update' && (
                  <div className="flex gap-2">
                    <select
                      value={thenField}
                      onChange={e => setThenField(e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="">Select field…</option>
                      {modFields.map(f => (
                        <option key={f.fieldName || f.name} value={f.fieldName || f.name}>{f.label || f.fieldName}</option>
                      ))}
                    </select>
                    <input value={thenValue} onChange={e => setThenValue(e.target.value)} placeholder="new value" className="w-28 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                )}
              </div>

              {/* Preview */}
              {(condPreview || thenPreview) && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Preview</p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    If someone <strong>{whenEvent}s</strong> a <strong>{moduleName}</strong>
                    {condPreview && <span> where <em>{condPreview}</em></span>},
                    {' '}{thenPreview}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5">
              ← Back
            </button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !whenModule}
              className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-1.5 disabled:opacity-60"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-1.5 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE PREVIEW SIMULATOR
// "See exactly what a Recruiter/Student/BU Admin sees when they log in"
// ═══════════════════════════════════════════════════════════════════════════════

const PREVIEW_ROLES = [
  {
    key: 'BU_ADMIN', label: 'BU Admin', color: 'indigo',
    Icon: Building2, description: 'Manager / Business Unit head',
    nav: ['Students','Submissions','Interviews','Recruiters','Reports','Analytics'],
    canCRUD: { view: true, create: true, edit: true, delete: false },
    hiddenFields: ['tenant_id','password_hash','invite_token','mfa_secret','deleted_at','sf_id'],
    readonlyFields: ['id','created_at','updated_at'],
  },
  {
    key: 'RECRUITER', label: 'Recruiter', color: 'violet',
    Icon: UserCheck, description: 'Team member / recruiter',
    nav: ['Students','Submissions','Interviews'],
    canCRUD: { view: true, create: true, edit: true, delete: false },
    hiddenFields: ['tenant_id','password_hash','invite_token','mfa_secret','deleted_at','sf_id','bu_id','cluster_id'],
    readonlyFields: ['id','created_at','updated_at','recruiter_id'],
  },
  {
    key: 'STUDENT', label: 'Student', color: 'emerald',
    Icon: GraduationCap, description: 'Candidate / student contact',
    nav: ['My Profile','My Submissions','My Interviews'],
    canCRUD: { view: true, create: false, edit: false, delete: false },
    hiddenFields: ['tenant_id','password_hash','invite_token','mfa_secret','deleted_at','sf_id','bu_id','cluster_id','recruiter_id','rate','pay_rate','bill_rate','ssn'],
    readonlyFields: ['id','created_at','updated_at','marketing_status','activity_status'],
  },
]

const DEVICE_MODES = [
  { key: 'desktop', Icon: Monitor,    label: 'Desktop' },
  { key: 'tablet',  Icon: Tablet,     label: 'Tablet'  },
  { key: 'mobile',  Icon: Smartphone, label: 'Mobile'  },
]

const COLOR_CLASSES = {
  indigo: { bg: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'ring-indigo-500' },
  violet: { bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', ring: 'ring-violet-500' },
  emerald:{ bg: 'bg-emerald-600',light: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',ring: 'ring-emerald-500' },
}

function RolePreviewModal({ onClose }) {
  const [role,       setRole]       = useState(PREVIEW_ROLES[0])
  const [device,     setDevice]     = useState('desktop')
  const [module,     setModule]     = useState('students')
  const [allModules, setAllModules] = useState([])
  const [fields,     setFields]     = useState([])
  const [record,     setRecord]     = useState(null)
  const [showHidden, setShowHidden] = useState(true)
  const [activeView, setActiveView] = useState('record') // 'record' | 'list' | 'diff'
  const [fieldsLoading, setFieldsLoading] = useState(false)

  // Load all modules once
  useEffect(() => {
    get('/api/v1/setup/modules').then(d => {
      const mods = Array.isArray(d) ? d : (d?.modules || [])
      setAllModules(mods)
    }).catch(() => setAllModules([]))
  }, [])

  useEffect(() => {
    setFieldsLoading(true)
    setFields([])
    setRecord(null)
    get(`/api/v1/schema/fields?objectName=${module}`).then(d => {
      setFields(Array.isArray(d) ? d : (d?.fields || []))
    }).catch(() => setFields([])).finally(() => setFieldsLoading(false))
    get(`/api/v1/dynamic/${module}?limit=1`).then(d => {
      const recs = d?.records || d?.data || (Array.isArray(d) ? d : [])
      setRecord(recs[0] || null)
    }).catch(() => setRecord(null))
  }, [module])

  const isHidden   = f => role.hiddenFields.includes(f.field_name)
  const isReadonly = f => role.readonlyFields.includes(f.field_name)

  const visibleFields  = fields.filter(f => !isHidden(f))
  const hiddenFields   = fields.filter(f => isHidden(f))
  const editableFields = visibleFields.filter(f => !isReadonly(f))

  const clr = COLOR_CLASSES[role.color]

  const deviceWidth = { desktop: '100%', tablet: '768px', mobile: '375px' }[device]

  // Format a field value for display
  const fmtVal = (field, val) => {
    if (val === null || val === undefined || val === '') return <span className="text-gray-300 italic text-xs">—</span>
    if (typeof val === 'boolean') return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{val ? 'Yes' : 'No'}</span>
    if (field.field_name?.includes('status') || field.field_name?.includes('marketing')) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{String(val)}</span>
    if (field.field_name?.includes('_at') || field.field_name?.includes('date')) { try { return <span className="text-xs">{new Date(val).toLocaleDateString()}</span> } catch { return String(val) } }
    const s = String(val)
    return <span className="text-xs text-gray-800 truncate max-w-[180px] inline-block">{s.length > 60 ? s.slice(0, 60) + '…' : s}</span>
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Top toolbar */}
      <div className="bg-slate-900 text-white flex items-center gap-3 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-indigo-400" />
          <span className="text-sm font-semibold">Preview Mode</span>
          <span className="text-gray-500 text-xs">— See your CRM exactly as this person would</span>
        </div>

        {/* Role selector */}
        <div className="flex items-center gap-1 ml-4 bg-slate-800 rounded-lg p-1">
          {PREVIEW_ROLES.map(r => (
            <button
              key={r.key}
              onClick={() => setRole(r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                role.key === r.key
                  ? `${COLOR_CLASSES[r.color].bg} text-white shadow-sm`
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <r.Icon size={12} />
              {r.label}
            </button>
          ))}
        </div>

        {/* View mode */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 ml-2">
          {[
            { key: 'record', label: 'Record', Icon: FileText },
            { key: 'list',   label: 'List',   Icon: List     },
            { key: 'diff',   label: 'Diff',   Icon: Eye      },
          ].map(v => (
            <button key={v.key} onClick={() => setActiveView(v.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${activeView === v.key ? 'bg-slate-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <v.Icon size={11} />{v.label}
            </button>
          ))}
        </div>

        {/* Device */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 ml-auto">
          {DEVICE_MODES.map(d => (
            <button key={d.key} onClick={() => setDevice(d.key)} title={d.label}
              className={`p-1.5 rounded transition-colors ${device === d.key ? 'bg-slate-600 text-white' : 'text-gray-500 hover:text-white'}`}>
              <d.Icon size={13} />
            </button>
          ))}
        </div>

        {/* Toggle hidden */}
        <button onClick={() => setShowHidden(s => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-2 ${showHidden ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-700 text-gray-400 hover:text-white'}`}>
          {showHidden ? <Eye size={12} /> : <EyeOff size={12} />}
          {showHidden ? 'Showing hidden' : 'Hidden invisible'}
        </button>

        <button onClick={onClose} className="ml-2 p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Simulated sidebar */}
        <div className="w-52 bg-slate-950 flex flex-col shrink-0 border-r border-white/5">
          <div className="px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg ${clr.bg} flex items-center justify-center`}>
                <role.Icon size={14} className="text-white" />
              </div>
              <div>
                <p className="text-white text-[12px] font-semibold leading-none">Fyxo CRM</p>
                <p className="text-gray-500 text-[10px] mt-0.5">{role.label}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-2 overflow-y-auto">
            <p className="px-2 mb-1 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
              {role.label} can access
            </p>
            {allModules.filter(m => m.isActive !== false).map(m => (
              <button key={m.objectName || m.name}
                onClick={() => setModule(m.objectName || m.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all mb-0.5 ${
                  module === (m.objectName || m.name)
                    ? `${clr.light} ${clr.text}`
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <ModuleIcon icon={m.icon} size={13} className="" />
                <span className="truncate">{m.label}</span>
              </button>
            ))}
            {allModules.length === 0 && (
              <p className="text-[10px] text-gray-600 px-2 py-2">Loading modules…</p>
            )}
          </nav>
          {/* Stats */}
          <div className="p-3 border-t border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600">Modules visible</span>
              <span className={`font-semibold ${clr.text}`}>{allModules.filter(m => m.isActive !== false).length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600">Fields visible</span>
              <span className="text-emerald-400 font-semibold">{visibleFields.length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600">Fields hidden</span>
              <span className="text-rose-400 font-semibold">{hiddenFields.length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600">Can edit</span>
              <span className={role.canCRUD.edit ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{role.canCRUD.edit ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Simulated content area */}
        <div className="flex-1 bg-gray-100 overflow-auto p-6 flex justify-center">
          <div style={{ width: deviceWidth, maxWidth: '100%', transition: 'width 0.3s ease' }}>

            {/* Module selector */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <select value={module} onChange={e => setModule(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {allModules.filter(m => m.isActive !== false).map(m => (
                    <option key={m.objectName || m.name} value={m.objectName || m.name}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {fieldsLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${clr.light} ${clr.text}`}>
                  Viewing as {role.label}
                </span>
              </div>
              {/* CRUD capability badges */}
              <div className="flex items-center gap-1.5">
                {Object.entries(role.canCRUD).map(([action, allowed]) => (
                  <span key={action} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    allowed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-500 border-red-200'
                  }`}>
                    {allowed ? '✓' : '✗'} {action}
                  </span>
                ))}
              </div>
            </div>

            {activeView === 'diff' ? (
              // ── DIFF VIEW ─────────────────────────────────────────────────
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800">Field Access Comparison — You vs {role.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Green = visible · Red = hidden · Yellow = read-only
                  </p>
                </div>
                <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                  {fields.filter(f => !['tenant_id','password_hash'].includes(f.field_name)).map(f => {
                    const hidden   = isHidden(f)
                    const readonly = !hidden && isReadonly(f)
                    return (
                      <div key={f.field_name} className={`flex items-center gap-3 px-5 py-2.5 ${hidden ? 'bg-red-50/40' : readonly ? 'bg-amber-50/40' : ''}`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${hidden ? 'bg-red-400' : readonly ? 'bg-amber-400' : 'bg-green-400'}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-800">{f.label || f.field_name}</span>
                          <span className="text-[10px] text-gray-400 ml-2">{f.field_type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] shrink-0">
                          <span className="text-gray-400">You: <span className="text-green-600 font-medium">visible + edit</span></span>
                          <ChevronRight size={10} className="text-gray-300" />
                          <span className={hidden ? 'text-red-500 font-medium' : readonly ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                            {role.label}: {hidden ? 'hidden' : readonly ? 'read-only' : 'visible + edit'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            ) : activeView === 'list' ? (
              // ── LIST VIEW ─────────────────────────────────────────────────
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">{allModules.find(m => (m.objectName||m.name) === module)?.label || module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} List</h3>
                  {role.canCRUD.create && (
                    <span className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-medium cursor-default">+ New Record</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {visibleFields.slice(0, 6).map(f => (
                          <th key={f.field_name} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {f.label || f.field_name}
                          </th>
                        ))}
                        {(role.canCRUD.edit || role.canCRUD.delete) && <th className="px-4 py-2.5" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[1,2,3].map(i => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          {visibleFields.slice(0, 6).map(f => (
                            <td key={f.field_name} className="px-4 py-2.5 text-gray-600">
                              {record ? fmtVal(f, record[f.field_name]) : <span className="text-gray-200 text-xs">—</span>}
                            </td>
                          ))}
                          {(role.canCRUD.edit || role.canCRUD.delete) && (
                            <td className="px-4 py-2.5 text-right">
                              {role.canCRUD.edit && <span className="text-[10px] text-indigo-500 hover:text-indigo-700 cursor-default font-medium mr-2">Edit</span>}
                              {role.canCRUD.delete && <span className="text-[10px] text-red-400 hover:text-red-600 cursor-default font-medium">Delete</span>}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            ) : (
              // ── RECORD VIEW ───────────────────────────────────────────────
              <div className="space-y-4">
                {/* Record header */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {record
                          ? (record.name || record.full_name || record.email || `Record #${record.id}`)
                          : <span className="text-gray-300">Sample Record</span>
                        }
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{allModules.find(m => (m.objectName||m.name) === module)?.label || module.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {role.canCRUD.edit && (
                        <span className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg font-medium cursor-default hover:bg-indigo-50 transition-colors">Edit</span>
                      )}
                      {role.canCRUD.delete && (
                        <span className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg font-medium cursor-default">Delete</span>
                      )}
                      {!role.canCRUD.edit && !role.canCRUD.delete && (
                        <span className="text-[10px] px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full font-medium flex items-center gap-1">
                          <Lock size={9} /> View only
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visible fields */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-gray-700">{visibleFields.length} Visible Fields</span>
                    <span className="text-[10px] text-gray-400 ml-1">— {role.label} can see these</span>
                  </div>
                  <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-50">
                    {visibleFields.filter(f => !['tenant_id','password_hash','deleted_at'].includes(f.field_name)).map(f => (
                      <div key={f.field_name} className={`px-4 py-3 ${isReadonly(f) ? 'bg-amber-50/30' : ''}`}>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                          {f.label || f.field_name}
                          {isReadonly(f) && <Lock size={8} className="text-amber-400" />}
                        </p>
                        <div className="mt-0.5">
                          {record ? fmtVal(f, record[f.field_name]) : (
                            <div className="h-3 bg-gray-100 rounded w-24 mt-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hidden fields */}
                {showHidden && hiddenFields.length > 0 && (
                  <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden opacity-60">
                    <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                      <EyeOff size={13} className="text-red-400" />
                      <span className="text-xs font-semibold text-red-600">{hiddenFields.length} Hidden Fields</span>
                      <span className="text-[10px] text-red-400 ml-1">— {role.label} cannot see these (shown here for reference)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-red-50/50">
                      {hiddenFields.map(f => (
                        <div key={f.field_name} className="px-4 py-3 relative overflow-hidden">
                          <p className="text-[10px] font-semibold text-red-300 uppercase tracking-wide">{f.label || f.field_name}</p>
                          <div className="mt-1 blur-[3px] select-none pointer-events-none">
                            <div className="h-3 bg-red-100 rounded w-20" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-red-400 flex items-center gap-0.5 bg-red-50/90 px-1.5 py-0.5 rounded">
                              <Lock size={7} /> HIDDEN
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className={`${clr.bg} px-6 py-2 flex items-center gap-4 text-white text-xs shrink-0`}>
        <role.Icon size={13} />
        <span className="font-semibold">{role.label}</span>
        <span className="opacity-70">·</span>
        <span className="opacity-80">{role.description}</span>
        <span className="opacity-70">·</span>
        <span><span className="font-semibold">{visibleFields.length}</span> fields visible</span>
        <span className="opacity-70">·</span>
        <span><span className="font-semibold">{hiddenFields.length}</span> fields hidden</span>
        <span className="opacity-70">·</span>
        <span><span className="font-semibold">{editableFields.length}</span> editable</span>
        <span className="ml-auto opacity-70 text-[10px]">This is exactly what {role.label}s see when they log in</span>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showPreview, setShowPreview] = useState(false)

  const tabParam       = searchParams.get('tab') || 'modules'
  const moduleParam    = searchParams.get('module') || ''
  const [activeTab, setActiveTab] = useState(tabParam)

  const switchTab = (tabId, extra = {}) => {
    setActiveTab(tabId)
    const params = { tab: tabId, ...extra }
    setSearchParams(params, { replace: true })
  }

  const handleCustomizeDetails = (objectName) => {
    switchTab('details', { module: objectName })
  }

  return (
    <div className="ml-0 md:ml-[220px] min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings size={18} className="text-indigo-500" strokeWidth={2} />
              Customize Your CRM
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Tailor Fyxo to exactly how you work</p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            <Eye size={15} />
            Preview as Role
          </button>
        </div>
      </div>

      {showPreview && <RoleCRMSimulator onClose={() => setShowPreview(false)} />}

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.Icon size={14} strokeWidth={2} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-6 max-w-6xl">
        {activeTab === 'modules' && (
          <ModulesTab onCustomizeDetails={handleCustomizeDetails} />
        )}
        {activeTab === 'details' && (
          <DetailsTab initialModule={moduleParam} />
        )}
        {activeTab === 'layouts' && (
          <LayoutsTab />
        )}
        {activeTab === 'access' && (
          <AccessTab />
        )}
        {activeTab === 'rules' && (
          <RulesTab />
        )}
      </div>

      {/* Footer link */}
      <div className="px-6 pb-8 max-w-6xl">
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/head/schema')}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            Need more control? → Advanced Settings
          </button>
        </div>
      </div>
    </div>
  )
}
