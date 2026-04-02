import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, put } from '../../utils/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Choose a Template',    subtitle: 'Pick a starting point for your CRM'           },
  { id: 2, title: 'Your Modules',         subtitle: 'Turn on the sections you need'                 },
  { id: 3, title: 'Add Details',          subtitle: 'Define the fields each module will capture'    },
  { id: 4, title: 'Preview Layout',       subtitle: 'See how your records will look'                },
  { id: 5, title: 'Set Permissions',      subtitle: 'Control who can see and do what'               },
  { id: 6, title: 'Invite Your Team',     subtitle: 'Bring your colleagues on board'                },
  { id: 7, title: "You're All Set!",      subtitle: 'Your CRM is ready to go'                       },
]

const TEMPLATES = [
  { id: 'recruitment', emoji: '👥', label: 'Recruitment',  color: 'indigo',  description: 'Track candidates, job openings and placements end-to-end.' },
  { id: 'sales',       emoji: '💼', label: 'Sales CRM',    color: 'emerald', description: 'Manage leads, deals and accounts for your sales team.' },
  { id: 'education',   emoji: '🎓', label: 'Education',    color: 'violet',  description: 'Follow students from enrolment through graduation.' },
  { id: 'healthcare',  emoji: '🏥', label: 'Healthcare',   color: 'rose',    description: 'Coordinate patients, appointments and care providers.' },
  { id: 'realestate',  emoji: '🏠', label: 'Real Estate',  color: 'amber',   description: 'Handle properties, listings and buyer pipelines.' },
  { id: 'blank',       emoji: '📄', label: 'Start Blank',  color: 'slate',   description: 'Build your CRM from scratch exactly the way you want.' },
]

const COLOR_MAP = {
  indigo:  { border: 'border-indigo-400',  bg: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700',  btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'ring-indigo-400'  },
  emerald: { border: 'border-emerald-400', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700',btn: 'bg-emerald-600 hover:bg-emerald-700',ring: 'ring-emerald-400' },
  violet:  { border: 'border-violet-400',  bg: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700',  ring: 'ring-violet-400'  },
  rose:    { border: 'border-rose-400',    bg: 'bg-rose-50',    badge: 'bg-rose-100 text-rose-700',      btn: 'bg-rose-600 hover:bg-rose-700',      ring: 'ring-rose-400'    },
  amber:   { border: 'border-amber-400',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',    btn: 'bg-amber-600 hover:bg-amber-700',    ring: 'ring-amber-400'   },
  slate:   { border: 'border-slate-400',   bg: 'bg-slate-50',   badge: 'bg-slate-100 text-slate-700',    btn: 'bg-slate-600 hover:bg-slate-700',    ring: 'ring-slate-400'   },
}

const FIELD_TYPES = [
  { type: 'text',       emoji: '📝', label: 'Text',           description: 'Short text answer'             },
  { type: 'number',     emoji: '🔢', label: 'Number',         description: 'Whole or decimal numbers'      },
  { type: 'date',       emoji: '📅', label: 'Date',           description: 'Pick a date'                   },
  { type: 'boolean',    emoji: '✅', label: 'Yes / No',       description: 'A simple checkbox'             },
  { type: 'picklist',   emoji: '📋', label: 'Dropdown',       description: 'Choose from a list'            },
  { type: 'email',      emoji: '📧', label: 'Email',          description: 'Email address'                 },
  { type: 'phone',      emoji: '📱', label: 'Phone',          description: 'Phone number'                  },
  { type: 'url',        emoji: '🔗', label: 'Link',           description: 'A web address'                 },
  { type: 'currency',   emoji: '💰', label: 'Money',          description: 'Currency value'                },
  { type: 'percent',    emoji: '📊', label: 'Percentage',     description: 'A percentage value'            },
  { type: 'lookup',     emoji: '🔍', label: 'Link to Module', description: 'Connect to another module'     },
  { type: 'textarea',   emoji: '📝', label: 'Long Text',      description: 'Multi-line notes or comments'  },
  { type: 'autonumber', emoji: '🔢', label: 'Auto-Number',    description: 'Auto-incrementing ID'          },
]

const ROLES_CONFIG = [
  { key: 'admin',      label: 'Admins',       emoji: '🛡️', color: 'bg-indigo-50 border-indigo-200'  },
  { key: 'teamlead',   label: 'Team Leads',   emoji: '⭐', color: 'bg-violet-50 border-violet-200'  },
  { key: 'member',     label: 'Team Members', emoji: '👤', color: 'bg-emerald-50 border-emerald-200' },
  { key: 'contact',    label: 'Contacts',     emoji: '📇', color: 'bg-amber-50 border-amber-200'    },
]

// ─── Small reusable pieces ────────────────────────────────────────────────────

function Toggle({ checked, onChange, size = 'md' }) {
  const w = size === 'sm' ? 'w-8 h-4' : 'w-11 h-6'
  const dot = size === 'sm' ? 'w-3 h-3 translate-x-0' : 'w-5 h-5'
  const on  = size === 'sm' ? 'translate-x-4' : 'translate-x-5'
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${w} ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block rounded-full bg-white shadow transition-transform ${dot} ${checked ? on : 'translate-x-0.5'}`}
        style={{ margin: '2px' }}
      />
    </button>
  )
}

function SavedBadge({ show }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-emerald-600 font-medium transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      Saved
    </span>
  )
}

// ─── Step 1 — Template Selection ─────────────────────────────────────────────

function StepTemplate({ onSelect, selectedTemplate }) {
  const [applying, setApplying]   = useState(false)
  const [progress, setProgress]   = useState(0)
  const [chosen, setChosen]       = useState(null)
  const timerRef                  = useRef(null)

  const handleSelect = async (tpl) => {
    setChosen(tpl.id)
    setApplying(true)
    setProgress(0)

    // Fake progress bar 0 → 100 over 3 s
    let pct = 0
    timerRef.current = setInterval(() => {
      pct += 100 / 60          // ~60 ticks in 3 s
      if (pct >= 100) {
        pct = 100
        clearInterval(timerRef.current)
      }
      setProgress(Math.min(pct, 100))
    }, 50)

    try {
      await post('/api/v1/setup/template', { templateId: tpl.id })
    } catch (_) {
      // Non-blocking: proceed even if server errors
    }

    // Ensure bar finishes visually before moving on
    await new Promise((r) => setTimeout(r, 3100))
    clearInterval(timerRef.current)
    setApplying(false)
    onSelect(tpl.id)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  return (
    <div className="relative">
      {/* Loading overlay */}
      {applying && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="text-5xl mb-4 animate-bounce">{TEMPLATES.find((t) => t.id === chosen)?.emoji}</div>
          <p className="text-lg font-semibold text-gray-800 mb-1">Setting up your workspace…</p>
          <p className="text-sm text-gray-500 mb-6">Hang tight, this only takes a moment</p>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">{Math.round(progress)}%</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEMPLATES.map((tpl) => {
          const c = COLOR_MAP[tpl.color]
          const active = selectedTemplate === tpl.id
          return (
            <div
              key={tpl.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col gap-3 cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 ${c.border} ${c.bg} ${active ? `ring-2 ${c.ring} ring-offset-2` : ''}`}
              onClick={() => handleSelect(tpl)}
            >
              {active && (
                <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  Selected
                </span>
              )}
              <div className="text-5xl">{tpl.emoji}</div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{tpl.label}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{tpl.description}</p>
              </div>
              <button
                className={`mt-auto self-start text-sm font-medium text-white rounded-lg px-4 py-1.5 transition-colors ${c.btn}`}
                onClick={(e) => { e.stopPropagation(); handleSelect(tpl) }}
              >
                Use This →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2 — Module Builder ──────────────────────────────────────────────────

function StepModules({ onSaved }) {
  const [modules, setModules]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [editingName, setEditingName] = useState(null)   // objectName being renamed
  const [nameVal, setNameVal]         = useState('')
  const [addingNew, setAddingNew]     = useState(false)
  const [newMod, setNewMod]           = useState({ label: '', description: '', emoji: '📦' })
  const [saving, setSaving]           = useState(null)

  useEffect(() => {
    get('/api/v1/setup/modules')
      .then((data) => setModules(data?.modules || data || []))
      .catch(() => setModules([]))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (mod) => {
    const updated = !mod.isActive
    setModules((prev) => prev.map((m) => m.objectName === mod.objectName ? { ...m, isActive: updated } : m))
    setSaving(mod.objectName)
    try {
      await put(`/api/v1/setup/modules/${mod.objectName}`, { isActive: updated })
      onSaved()
    } catch (_) {
      setModules((prev) => prev.map((m) => m.objectName === mod.objectName ? { ...m, isActive: mod.isActive } : m))
    } finally {
      setSaving(null)
    }
  }

  const startRename = (mod) => {
    setEditingName(mod.objectName)
    setNameVal(mod.label)
  }

  const commitRename = async (mod) => {
    if (!nameVal.trim() || nameVal === mod.label) { setEditingName(null); return }
    setModules((prev) => prev.map((m) => m.objectName === mod.objectName ? { ...m, label: nameVal } : m))
    setEditingName(null)
    setSaving(mod.objectName)
    try {
      await put(`/api/v1/setup/modules/${mod.objectName}`, { label: nameVal })
      onSaved()
    } catch (_) { /* revert silently */ }
    finally { setSaving(null) }
  }

  const handleAdd = async () => {
    if (!newMod.label.trim()) return
    try {
      const created = await post('/api/v1/setup/modules', newMod)
      setModules((prev) => [...prev, created])
      setNewMod({ label: '', description: '', emoji: '📦' })
      setAddingNew(false)
      onSaved()
    } catch (_) { /* toast handled by api.js */ }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {modules.map((mod) => (
        <div
          key={mod.objectName}
          className={`rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all duration-150 ${mod.isActive ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50 opacity-70'}`}
        >
          <div className="flex items-start justify-between">
            <div className="text-3xl">{mod.emoji || '📦'}</div>
            <Toggle checked={!!mod.isActive} onChange={() => handleToggle(mod)} />
          </div>

          {editingName === mod.objectName ? (
            <input
              autoFocus
              className="text-sm font-semibold border border-indigo-400 rounded-md px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => commitRename(mod)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(mod); if (e.key === 'Escape') setEditingName(null) }}
            />
          ) : (
            <button
              className="text-left text-sm font-semibold text-gray-900 hover:text-indigo-600 focus:outline-none"
              title="Click to rename"
              onClick={() => startRename(mod)}
            >
              {mod.label}
              <span className="ml-1 text-gray-400 text-xs">✏️</span>
            </button>
          )}

          <p className="text-xs text-gray-500 leading-relaxed flex-1">{mod.description}</p>

          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-200">
            {saving === mod.objectName
              ? <span className="text-xs text-gray-400">Saving…</span>
              : <span className="text-xs text-gray-400">{mod.fieldCount ?? 0} details</span>
            }
            <button className="text-xs font-medium text-indigo-600 hover:underline">
              Customize Details →
            </button>
          </div>
        </div>
      ))}

      {/* Add new module card */}
      {addingNew ? (
        <div className="rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50 p-5 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              className="w-12 text-2xl bg-transparent border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={newMod.emoji}
              onChange={(e) => setNewMod((p) => ({ ...p, emoji: e.target.value }))}
              maxLength={2}
            />
            <input
              autoFocus
              placeholder="Module name"
              className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={newMod.label}
              onChange={(e) => setNewMod((p) => ({ ...p, label: e.target.value }))}
            />
          </div>
          <input
            placeholder="Short description (optional)"
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={newMod.description}
            onChange={(e) => setNewMod((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleAdd}
              className="flex-1 text-sm font-medium bg-indigo-600 text-white rounded-lg py-1.5 hover:bg-indigo-700 transition-colors"
            >
              Add Module
            </button>
            <button
              onClick={() => setAddingNew(false)}
              className="flex-1 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg py-1.5 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors min-h-[160px]"
        >
          <span className="text-4xl">+</span>
          <span className="text-sm font-medium">Add a Module</span>
        </button>
      )}
    </div>
  )
}

// ─── Step 3 — Field Builder ───────────────────────────────────────────────────

function StepFields({ modules, onSaved }) {
  const [selectedModule, setSelectedModule] = useState(modules[0]?.objectName || '')
  const [fields, setFields]                 = useState([])
  const [loadingFields, setLoadingFields]   = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [chosenType, setChosenType]         = useState(null)
  const [form, setForm]                     = useState({ label: '', required: false, section: 'General', choices: '' })
  const [saving, setSaving]                 = useState(false)

  // Derive sections from fields
  const sections = [...new Set(fields.map((f) => f.section || 'General'))]

  const loadFields = useCallback((objectName) => {
    if (!objectName) return
    setLoadingFields(true)
    get(`/api/v1/schema/fields?objectName=${objectName}`)
      .then((data) => setFields(data?.fields || data || []))
      .catch(() => setFields([]))
      .finally(() => setLoadingFields(false))
  }, [])

  useEffect(() => { loadFields(selectedModule) }, [selectedModule, loadFields])

  const handleTypeClick = (ft) => {
    setChosenType(ft)
    setShowTypePicker(false)
    setForm({ label: '', required: false, section: sections[0] || 'General', choices: '' })
  }

  const handleAddField = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    const body = {
      label: form.label,
      fieldType: chosenType.type,
      required: form.required,
      section: form.section,
      ...(chosenType.type === 'picklist' ? { choices: form.choices.split(',').map((s) => s.trim()).filter(Boolean) } : {}),
    }
    try {
      const created = await post(`/api/v1/setup/modules/${selectedModule}/fields`, body)
      setFields((prev) => [...prev, created])
      setChosenType(null)
      onSaved()
    } catch (_) { /* handled */ }
    finally { setSaving(false) }
  }

  const fieldsBySection = sections.reduce((acc, s) => {
    acc[s] = fields.filter((f) => (f.section || 'General') === s)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      {/* Module selector */}
      <div className="flex flex-wrap gap-2">
        {modules.map((mod) => (
          <button
            key={mod.objectName}
            onClick={() => { setSelectedModule(mod.objectName); setChosenType(null); setShowTypePicker(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedModule === mod.objectName
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
            }`}
          >
            <span>{mod.emoji || '📦'}</span>
            <span>{mod.label}</span>
            {mod.fieldCount != null && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${selectedModule === mod.objectName ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {mod.fieldCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Fields area */}
      {loadingFields ? (
        <LoadingSpinner />
      ) : (
        <div className="flex flex-col gap-4">
          {fields.length === 0 && !chosenType && !showTypePicker && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">🗂️</div>
              <p className="font-medium text-gray-500">No details yet</p>
              <p className="text-sm mt-1">Click "+ Add Detail" to start building this module</p>
            </div>
          )}

          {sections.map((section) => (
            <div key={section} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{section}</span>
                <span className="text-xs text-gray-400">{fieldsBySection[section]?.length} detail(s)</span>
              </div>
              <div className="divide-y divide-gray-100">
                {(fieldsBySection[section] || []).map((field) => {
                  const ft = FIELD_TYPES.find((t) => t.type === field.fieldType) || { emoji: '📝', label: field.fieldType }
                  return (
                    <div key={field._id || field.fieldName} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <span className="text-lg w-7 text-center">{ft.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{field.label}</span>
                        {field.required && <span className="ml-2 text-xs text-rose-500 font-medium">Required</span>}
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{ft.label}</span>
                      <span className="text-gray-300 cursor-grab">⠿</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Add detail flow */}
          {!chosenType && !showTypePicker && (
            <button
              onClick={() => setShowTypePicker(true)}
              className="flex items-center gap-2 self-start px-4 py-2 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors"
            >
              <span className="text-lg">+</span>
              Add Detail
            </button>
          )}

          {/* Type picker grid */}
          {showTypePicker && (
            <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800">What type of detail?</h4>
                <button onClick={() => setShowTypePicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {FIELD_TYPES.map((ft) => (
                  <button
                    key={ft.type}
                    onClick={() => handleTypeClick(ft)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-center"
                  >
                    <span className="text-2xl">{ft.emoji}</span>
                    <span className="text-xs font-semibold text-gray-800 leading-tight">{ft.label}</span>
                    <span className="text-xs text-gray-400 leading-tight">{ft.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add detail form */}
          {chosenType && (
            <div className="rounded-2xl border-2 border-indigo-300 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{chosenType.emoji}</span>
                <div>
                  <h4 className="font-semibold text-gray-800">Add {chosenType.label} Detail</h4>
                  <p className="text-xs text-gray-500">{chosenType.description}</p>
                </div>
                <button onClick={() => setChosenType(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Label <span className="text-rose-400">*</span></label>
                  <input
                    autoFocus
                    placeholder={`e.g. ${chosenType.label} Detail`}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Section</label>
                  <input
                    placeholder="e.g. General"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={form.section}
                    onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                    list="section-options"
                  />
                  <datalist id="section-options">
                    {sections.map((s) => <option key={s} value={s} />)}
                    <option value="General" />
                    <option value="Contact Info" />
                    <option value="Details" />
                  </datalist>
                </div>
              </div>

              {chosenType.type === 'picklist' && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Choices <span className="text-gray-400">(comma-separated)</span></label>
                  <textarea
                    placeholder="Option A, Option B, Option C"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    rows={3}
                    value={form.choices}
                    onChange={(e) => setForm((p) => ({ ...p, choices: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={form.required} onChange={(v) => setForm((p) => ({ ...p, required: v }))} size="sm" />
                  <span className="text-sm text-gray-600">Required field</span>
                </label>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleAddField}
                  disabled={saving || !form.label.trim()}
                  className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving…' : 'Add Detail'}
                </button>
                <button
                  onClick={() => setChosenType(null)}
                  className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 4 — Layout Preview ──────────────────────────────────────────────────

function StepLayoutPreview({ modules }) {
  const [selectedModule, setSelectedModule] = useState(modules[0]?.objectName || '')
  const [fields, setFields]                 = useState([])
  const [loading, setLoading]               = useState(false)

  useEffect(() => {
    if (!selectedModule) return
    setLoading(true)
    get(`/api/v1/schema/fields?objectName=${selectedModule}`)
      .then((data) => setFields(data?.fields || data || []))
      .catch(() => setFields([]))
      .finally(() => setLoading(false))
  }, [selectedModule])

  const sections = [...new Set(fields.map((f) => f.section || 'General'))]
  const bySection = sections.reduce((acc, s) => {
    acc[s] = fields.filter((f) => (f.section || 'General') === s)
    return acc
  }, {})

  const mod = modules.find((m) => m.objectName === selectedModule)

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">👀</span>
        <p className="text-sm font-medium text-indigo-800">This is how your record page will look!</p>
      </div>

      {/* Module tabs */}
      <div className="flex flex-wrap gap-2">
        {modules.map((m) => (
          <button
            key={m.objectName}
            onClick={() => setSelectedModule(m.objectName)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedModule === m.objectName
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
            }`}
          >
            <span>{m.emoji || '📦'}</span> {m.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: section/field outline */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Structure</h3>
            {sections.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-2">🗂️</div>
                <p className="text-sm">No details added yet for this module</p>
              </div>
            ) : sections.map((section) => (
              <div key={section} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex-1">{section}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {bySection[section].map((f) => {
                    const ft = FIELD_TYPES.find((t) => t.type === f.fieldType) || { emoji: '📝' }
                    return (
                      <div key={f._id || f.fieldName} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                        <span className="text-gray-300 text-sm cursor-grab">⠿</span>
                        <span className="text-base">{ft.emoji}</span>
                        <span className="text-sm text-gray-700 flex-1">{f.label}</span>
                        {f.required && <span className="text-xs text-rose-400">*</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right: record preview */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</h3>
            <div className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
              {/* Fake header */}
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                    {mod?.emoji || '📦'}
                  </div>
                  <div>
                    <p className="font-semibold text-base">Example {mod?.label || 'Record'}</p>
                    <p className="text-xs text-indigo-200">Record · #{Math.floor(Math.random() * 900 + 100)}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-5">
                {sections.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Add details on the left to see them here</p>
                ) : sections.map((section) => (
                  <div key={section}>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{section}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {bySection[section].map((f) => {
                        const ft = FIELD_TYPES.find((t) => t.type === f.fieldType) || { type: 'text' }
                        return (
                          <div key={f._id || f.fieldName} className="flex flex-col gap-1">
                            <label className="text-xs text-gray-400 font-medium">{f.label}{f.required ? ' *' : ''}</label>
                            <div className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-300 bg-gray-50">
                              {ft.type === 'boolean' ? <span className="text-xs">☐ Yes / No</span>
                               : ft.type === 'date' ? <span>mm / dd / yyyy</span>
                               : ft.type === 'picklist' ? <span className="flex items-center justify-between">Choose… <span>▾</span></span>
                               : ft.type === 'textarea' ? <span>Long text…</span>
                               : <span>—</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 5 — Permissions ─────────────────────────────────────────────────────

const ACTIONS = ['view', 'create', 'edit', 'delete']
const ACTION_LABELS = { view: 'Can View', create: 'Can Create', edit: 'Can Edit', delete: 'Can Delete' }

function defaultPerms() {
  return ROLES_CONFIG.reduce((acc, r) => {
    acc[r.key] = { view: true, create: true, edit: true, delete: false, scope: 'all' }
    return acc
  }, {})
}

function StepPermissions({ modules, onSaved }) {
  const [selectedModule, setSelectedModule] = useState(modules[0]?.objectName || '')
  const [perms, setPerms]                   = useState(defaultPerms())
  const [applyAll, setApplyAll]             = useState(false)
  const [saving, setSaving]                 = useState(false)

  const toggle = (roleKey, action) => {
    setPerms((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [action]: !prev[roleKey][action] },
    }))
  }

  const setScope = (roleKey, scope) => {
    setPerms((prev) => ({ ...prev, [roleKey]: { ...prev[roleKey], scope } }))
  }

  const handleSave = async () => {
    setSaving(true)
    const targets = applyAll ? modules.map((m) => m.objectName) : [selectedModule]
    try {
      await Promise.all(
        targets.map((obj) => put(`/api/v1/setup/modules/${obj}/permissions`, { permissions: perms }))
      )
      onSaved()
    } catch (_) { /* handled */ }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Module selector */}
      <div className="flex flex-wrap gap-2">
        {modules.map((m) => (
          <button
            key={m.objectName}
            onClick={() => setSelectedModule(m.objectName)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedModule === m.objectName
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
            }`}
          >
            <span>{m.emoji || '📦'}</span> {m.label}
          </button>
        ))}
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ROLES_CONFIG.map((role) => {
          const rp = perms[role.key]
          return (
            <div key={role.key} className={`rounded-2xl border-2 p-5 flex flex-col gap-4 ${role.color}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{role.emoji}</span>
                <h4 className="font-semibold text-gray-800">{role.label}</h4>
              </div>

              {/* CRUD toggles */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {ACTIONS.map((action) => (
                  <label key={action} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700">{ACTION_LABELS[action]}</span>
                    <Toggle checked={rp[action]} onChange={() => toggle(role.key, action)} size="sm" />
                  </label>
                ))}
              </div>

              {/* Scope */}
              <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-1">Record visibility</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={`scope-${role.key}`} value="all" checked={rp.scope === 'all'} onChange={() => setScope(role.key, 'all')} className="accent-indigo-600" />
                  <span className="text-sm text-gray-700">See all records</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={`scope-${role.key}`} value="own" checked={rp.scope === 'own'} onChange={() => setScope(role.key, 'own')} className="accent-indigo-600" />
                  <span className="text-sm text-gray-700">Only their own records</span>
                </label>
              </div>
            </div>
          )
        })}
      </div>

      {/* Apply all + save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="accent-indigo-600 w-4 h-4 rounded"
            checked={applyAll}
            onChange={(e) => setApplyAll(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Apply same permissions to all modules</span>
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  )
}

// ─── Step 6 — Invite Team ─────────────────────────────────────────────────────

const INVITE_ROLES = [
  { value: 'head',     label: 'Head'      },
  { value: 'bu_admin', label: 'BU Admin'  },
  { value: 'recruiter',label: 'Recruiter' },
]

function StepInvite({ onSkip, onSaved }) {
  const [email, setEmail]       = useState('')
  const [role, setRole]         = useState('recruiter')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited]   = useState([])
  const [error, setError]       = useState('')

  const handleInvite = async () => {
    if (!email.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return }
    setError('')
    setInviting(true)
    try {
      await post('/api/v1/tenants/invite', { email: email.trim(), role })
      setInvited((prev) => [...prev, { email: email.trim(), role, id: Date.now() }])
      setEmail('')
      onSaved()
    } catch (_) { /* handled by api.js */ }
    finally { setInviting(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleInvite() }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Invite form */}
      <div className="rounded-2xl border border-gray-200 p-5 flex flex-col gap-4 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-800">Send an invite</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="colleague@company.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {INVITE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !email.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>

      {/* Invited list */}
      {invited.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-gray-600">Invites sent ({invited.length})</h4>
          {invited.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 bg-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-sm font-bold text-emerald-700">
                  {inv.email[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-800">{inv.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  {INVITE_ROLES.find((r) => r.value === inv.role)?.label}
                </span>
                <span className="text-emerald-500 text-xs font-medium">✓ Sent</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skip */}
      <button
        onClick={onSkip}
        className="self-start text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        Skip for now →
      </button>
    </div>
  )
}

// ─── Step 7 — Success ─────────────────────────────────────────────────────────

function Confetti() {
  const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899']
  const pieces = Array.from({ length: 40 }, (_, i) => i)

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10" aria-hidden>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          top: -10px;
          animation: confetti-fall linear infinite;
        }
      `}</style>
      {pieces.map((i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left:            `${Math.random() * 100}%`,
            width:           `${6 + Math.random() * 8}px`,
            height:          `${6 + Math.random() * 8}px`,
            backgroundColor: colors[i % colors.length],
            borderRadius:    Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${2.5 + Math.random() * 3}s`,
            animationDelay:    `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  )
}

function StepSuccess({ stats }) {
  const navigate = useNavigate()

  const handleTour = () => {
    localStorage.setItem('showTour', '1')
    navigate('/head')
  }

  return (
    <div className="relative flex flex-col items-center gap-8 py-4 text-center">
      <Confetti />

      <div className="relative z-10">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">You're all set!</h2>
        <p className="text-gray-500 text-base max-w-sm mx-auto">Your CRM is live and ready. Here's a quick summary of what was set up:</p>
      </div>

      {/* Stats */}
      <div className="relative z-10 grid grid-cols-3 gap-4 w-full max-w-sm">
        {[
          { label: 'Modules',  value: stats.modules,  emoji: '📦' },
          { label: 'Details',  value: stats.fields,   emoji: '🗂️' },
          { label: 'Layouts',  value: stats.layouts,  emoji: '🖼️' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <span className="text-2xl">{s.emoji}</span>
            <span className="text-2xl font-extrabold text-indigo-600">{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          onClick={() => navigate('/head/import')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-indigo-300 text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-colors"
        >
          📥 Import Data
        </button>
        <button
          onClick={handleTour}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-violet-300 text-violet-700 font-semibold text-sm hover:bg-violet-50 transition-colors"
        >
          👀 Start a Tour
        </button>
        <button
          onClick={() => navigate('/head')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md"
        >
          🚀 Start Using Your CRM
        </button>
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}

// ─── Progress bar + step indicators ──────────────────────────────────────────

function WizardProgress({ currentStep, totalSteps }) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100
  return (
    <div className="flex flex-col gap-2 mb-8">
      {/* Step labels — desktop only */}
      <div className="hidden sm:flex justify-between mb-1">
        {STEPS.map((s) => (
          <span
            key={s.id}
            className={`text-xs font-medium transition-colors ${s.id < currentStep ? 'text-indigo-600' : s.id === currentStep ? 'text-indigo-800 font-semibold' : 'text-gray-300'}`}
            style={{ width: `${100 / totalSteps}%`, textAlign: 'center' }}
          >
            {s.id === currentStep ? s.title : s.id}
          </span>
        ))}
      </div>

      {/* Bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Dots */}
      <div className="flex justify-between">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
              s.id < currentStep  ? 'bg-indigo-600 border-indigo-600' :
              s.id === currentStep ? 'bg-white border-indigo-600 ring-2 ring-indigo-300' :
              'bg-white border-gray-300'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 text-right">Step {currentStep} of {totalSteps}</p>
    </div>
  )
}

// ─── Main Wizard Shell ────────────────────────────────────────────────────────

export default function SetupWizard() {
  const navigate                        = useNavigate()
  const [step, setStep]                 = useState(1)
  const [selectedTemplate, setTemplate] = useState(null)
  const [modules, setModules]           = useState([])
  const [savedAt, setSavedAt]           = useState(null)
  const [showSaved, setShowSaved]       = useState(false)
  const savedTimer                      = useRef(null)

  // Stats for success step
  const [stats, setStats] = useState({ modules: 0, fields: 0, layouts: 1 })

  // Animate step transitions
  const [visible, setVisible] = useState(true)
  const [animating, setAnimating] = useState(false)

  const markSaved = useCallback(() => {
    setSavedAt(Date.now())
    setShowSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setShowSaved(false), 2500)
  }, [])

  useEffect(() => () => clearTimeout(savedTimer.current), [])

  // Load modules whenever we enter step 2+
  useEffect(() => {
    if (step >= 2 && modules.length === 0) {
      get('/api/v1/setup/modules')
        .then((data) => {
          const mods = data?.modules || data || []
          setModules(mods)
          setStats((s) => ({ ...s, modules: mods.filter((m) => m.isActive).length }))
        })
        .catch(() => {})
    }
  }, [step, modules.length])

  const goTo = (next) => {
    if (animating) return
    setAnimating(true)
    setVisible(false)
    setTimeout(() => {
      setStep(next)
      setVisible(true)
      setAnimating(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 220)
  }

  const handleNext = () => {
    if (step < STEPS.length) goTo(step + 1)
  }

  const handleBack = () => {
    if (step > 1) goTo(step - 1)
  }

  const handleTemplateSelect = (templateId) => {
    setTemplate(templateId)
    markSaved()
    goTo(2)
  }

  const currentStepInfo = STEPS[step - 1]
  const activeModules   = modules.filter((m) => m.isActive)

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepTemplate
            selectedTemplate={selectedTemplate}
            onSelect={handleTemplateSelect}
          />
        )
      case 2:
        return <StepModules onSaved={markSaved} />
      case 3:
        return (
          <StepFields
            modules={activeModules.length > 0 ? activeModules : modules}
            onSaved={markSaved}
          />
        )
      case 4:
        return (
          <StepLayoutPreview
            modules={activeModules.length > 0 ? activeModules : modules}
          />
        )
      case 5:
        return (
          <StepPermissions
            modules={activeModules.length > 0 ? activeModules : modules}
            onSaved={markSaved}
          />
        )
      case 6:
        return (
          <StepInvite
            onSkip={handleNext}
            onSaved={markSaved}
          />
        )
      case 7:
        return <StepSuccess stats={stats} />
      default:
        return null
    }
  }

  const showBack   = step > 1 && step < 7
  const showNext   = step > 1 && step < 6
  const showFinish = step === 6

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-indigo-600 tracking-tight">Fyxo</span>
            <span className="text-gray-300 text-lg">·</span>
            <span className="text-sm text-gray-500">CRM Setup</span>
          </div>
          <SavedBadge show={showSaved} />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress */}
        <WizardProgress currentStep={step} totalSteps={STEPS.length} />

        {/* Step heading */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
            {currentStepInfo.title}
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">{currentStepInfo.subtitle}</p>
        </div>

        {/* Step content with transition */}
        <div
          className="transition-all duration-200"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {renderStep()}
        </div>

        {/* Navigation footer */}
        {step < 7 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
            <div>
              {showBack ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              {step === 1 && (
                <p className="text-xs text-gray-400">Select a template to continue</p>
              )}
              {showNext && (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Next →
                </button>
              )}
              {showFinish && (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
                >
                  Finish Setup 🚀
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
