import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Save, Plus, Trash2, GripVertical, X, ChevronRight,
  Columns, AlignLeft, Eye, EyeOff, RotateCcw, Copy,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button, Modal, Select } from '../../../components/Shared'
import { useToast } from '../../../context/ToastContext'
import * as api from '../../../utils/api'
import LivePreview from './LivePreview'

// ─── Section color swatches ───────────────────────────────────────────────────

const SECTION_COLORS = [
  null,
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
]

// ─── Section templates ────────────────────────────────────────────────────────

const TEMPLATES = {
  salesforce_standard: {
    label: 'Salesforce Standard',
    sections: [
      { name: 'Basic Information',    columns: 2 },
      { name: 'Contact Information',  columns: 2 },
      { name: 'Status & Tracking',    columns: 2 },
      { name: 'Metrics & Financials', columns: 2 },
      { name: 'Dates & History',      columns: 2 },
      { name: 'Custom Fields',        columns: 2 },
      { name: 'System Information',   columns: 2 },
    ],
  },
  compact: {
    label: 'Compact',
    sections: [
      { name: 'Key Information', columns: 2 },
      { name: 'Details',         columns: 2 },
    ],
  },
  full_detail: {
    label: 'Full Detail',
    sections: [
      { name: 'Overview',    columns: 1 },
      { name: 'Details',     columns: 2 },
      { name: 'Metadata',    columns: 2 },
      { name: 'Attachments', columns: 1 },
    ],
  },
}

// ─── Section ID factory ───────────────────────────────────────────────────────

let _sectionId = 0
const newSection = (name = 'New Section', columns = 2, color = null) => ({
  _id: ++_sectionId,
  name,
  columns,
  color,
  fields: [],
})

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  text:     'bg-blue-50 text-blue-600',
  number:   'bg-green-50 text-green-600',
  decimal:  'bg-green-50 text-green-600',
  currency: 'bg-emerald-50 text-emerald-600',
  date:     'bg-orange-50 text-orange-600',
  datetime: 'bg-orange-50 text-orange-600',
  picklist: 'bg-purple-50 text-purple-600',
  boolean:  'bg-yellow-50 text-yellow-700',
  checkbox: 'bg-yellow-50 text-yellow-700',
  email:    'bg-sky-50 text-sky-600',
  phone:    'bg-teal-50 text-teal-600',
  url:      'bg-indigo-50 text-indigo-600',
  textarea: 'bg-gray-100 text-gray-600',
}

function TypeBadge({ type }) {
  const cls = TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0 ${cls}`}>
      {(type || 'txt').substring(0, 4)}
    </span>
  )
}

// ─── Clone from Role modal ────────────────────────────────────────────────────

const ROLES = ['HEAD', 'BU_ADMIN', 'RECRUITER', 'STUDENT']

function CloneModal({ objectName, onClose, onCloned }) {
  const { toast } = useToast()
  const [layouts,    setLayouts]    = useState([])
  const [srcId,      setSrcId]      = useState('')
  const [targetRole, setTargetRole] = useState('HEAD')
  const [cloning,    setCloning]    = useState(false)

  useEffect(() => {
    api.getLayouts(objectName)
      .then(r => {
        const ls = r?.layouts || []
        setLayouts(ls)
        if (ls.length > 0) setSrcId(String(ls[0].id))
      })
      .catch(() => {})
  }, [objectName])

  const doClone = async () => {
    if (!srcId) return toast('Select a layout to clone', 'error')
    setCloning(true)
    try {
      const r = await api.cloneLayout(parseInt(srcId), { targetRole })
      toast('Layout cloned successfully', 'success')
      onCloned(r?.layout || r)
      onClose()
    } catch (e) { toast(e.message, 'error') }
    setCloning(false)
  }

  return (
    <Modal title="Clone Layout from Role" onClose={onClose} size="sm">
      <div className="space-y-4">
        <Select
          label="Source Layout"
          value={srcId}
          onChange={setSrcId}
          options={layouts.map(l => ({ value: String(l.id), label: `${l.name}${l.role ? ` (${l.role})` : ''}` }))}
        />
        <Select
          label="Apply to Role"
          value={targetRole}
          onChange={setTargetRole}
          options={ROLES.map(r => ({ value: r, label: r }))}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={doClone} disabled={cloning || !srcId}>
            {cloning ? 'Cloning…' : 'Clone Layout'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Drag handle ──────────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <GripVertical
      size={14}
      className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
    />
  )
}

// ─── Available fields panel ───────────────────────────────────────────────────

function AvailableFields({ fields, placed, onDragStart }) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const grouped = {}
  fields.forEach(f => {
    const sec = f.sectionName || f.section_name || 'Standard Fields'
    if (!grouped[sec]) grouped[sec] = []
    grouped[sec].push(f)
  })

  return (
    <div className="w-[220px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Field Palette</p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search fields…"
          className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {Object.entries(grouped).map(([sec, flds]) => {
          const visible = flds.filter(f => {
            const fn = f.fieldName || f.field_name
            return (!q || f.label?.toLowerCase().includes(q)) && fn
          })
          if (visible.length === 0) return null
          return (
            <div key={sec}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">{sec}</p>
              {visible.map(f => {
                const fn = f.fieldName || f.field_name
                const isPlaced = placed.has(fn)
                const type = f.fieldType || f.field_type || 'text'
                return (
                  <div
                    key={fn}
                    draggable={!isPlaced}
                    onDragStart={!isPlaced ? () => onDragStart({ source: 'panel', fieldName: fn, field: f }) : undefined}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[12px] mb-0.5 transition-colors select-none ${
                      isPlaced
                        ? 'opacity-30 cursor-not-allowed text-gray-400'
                        : 'cursor-grab active:cursor-grabbing hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {!isPlaced && <DragHandle />}
                    <span className="flex-1 truncate">{f.label}</span>
                    {!isPlaced && <TypeBadge type={type} />}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Field slot ───────────────────────────────────────────────────────────────

function FieldSlot({
  fieldName, label, fieldType, isRequired,
  sectionIdx, fieldIdx,
  onDragStart, onDragOver, onDrop, onRemove, isOver,
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart({ source: 'canvas', fieldName, sectionIdx, fieldIdx })}
      onDragOver={e => { e.preventDefault(); onDragOver(sectionIdx, fieldIdx) }}
      onDrop={e => { e.preventDefault(); onDrop(sectionIdx, fieldIdx) }}
      className={`relative flex items-center gap-2 px-2.5 py-2 rounded border text-[12px] text-gray-800 cursor-grab active:cursor-grabbing transition-all ${
        isOver
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <DragHandle />
      <span className="flex-1 truncate">{label}</span>
      {isRequired && <span className="text-red-400 text-[10px] shrink-0">*</span>}
      {fieldType && <TypeBadge type={fieldType} />}
      <button
        onClick={e => { e.stopPropagation(); onRemove(sectionIdx, fieldIdx) }}
        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
      >
        <X size={11} />
      </button>
    </div>
  )
}

// ─── Empty drop zone ──────────────────────────────────────────────────────────

function EmptyDropZone({ sectionIdx, onDragOver, onDrop, isOver }) {
  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver(sectionIdx, 0) }}
      onDrop={e => { e.preventDefault(); onDrop(sectionIdx, 0) }}
      className={`border-2 border-dashed rounded-lg p-5 text-center text-[12px] transition-colors ${
        isOver ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-gray-300 text-gray-400'
      }`}
    >
      Drag fields here
    </div>
  )
}

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {SECTION_COLORS.map((c, i) => (
        <button
          key={i}
          onClick={() => onChange(c)}
          title={c || 'Default'}
          className={`w-3.5 h-3.5 rounded-full border-2 transition-transform ${
            value === c ? 'border-gray-600 scale-125' : 'border-transparent hover:border-gray-400'
          }`}
          style={{ backgroundColor: c || '#e5e7eb' }}
        />
      ))}
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  section, sectionIdx, fieldMap,
  dragState, overTarget,
  onDragStartSection, onDragOverSection, onDropSection,
  onDragStartField, onDragOverSlot, onDropSlot,
  onRemoveField, onUpdateSection, onDeleteSection,
}) {
  const [collapsed, setCollapsed] = useState(false)

  const isOverSection = overTarget?.sectionIdx === sectionIdx && overTarget?.fieldIdx === undefined
  const headerBg     = section.color ? section.color + '1a' : undefined
  const headerBorder = section.color ? section.color + '44' : undefined

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-shadow ${
        isOverSection ? 'border-indigo-400' : 'border-gray-200'
      }`}
      onDragOver={e => { e.preventDefault(); if (overTarget?.fieldIdx === undefined) onDragOverSection(sectionIdx) }}
      onDrop={e => { e.preventDefault(); onDropSection(sectionIdx) }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200"
        style={headerBg ? { backgroundColor: headerBg, borderColor: headerBorder } : {}}
      >
        <div
          draggable
          onDragStart={() => onDragStartSection(sectionIdx)}
          className="cursor-grab active:cursor-grabbing"
        >
          <DragHandle />
        </div>

        <input
          value={section.name}
          onChange={e => onUpdateSection(sectionIdx, 'name', e.target.value)}
          style={section.color ? { color: section.color } : {}}
          className="flex-1 bg-transparent text-[13px] font-semibold text-gray-900 focus:outline-none border-b border-transparent focus:border-indigo-400 transition-colors min-w-0"
        />

        <ColorPicker value={section.color ?? null} onChange={c => onUpdateSection(sectionIdx, 'color', c)} />

        {/* Columns toggle */}
        <div className="flex items-center gap-0.5 border border-gray-200 rounded p-0.5 ml-1">
          <button
            onClick={() => onUpdateSection(sectionIdx, 'columns', 1)}
            title="1 column"
            className={`p-1 rounded transition-colors ${section.columns === 1 ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-700'}`}
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() => onUpdateSection(sectionIdx, 'columns', 2)}
            title="2 columns"
            className={`p-1 rounded transition-colors ${section.columns === 2 ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-700'}`}
          >
            <Columns size={13} />
          </button>
        </div>

        <button onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-gray-600 transition-colors">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        <button onClick={() => onDeleteSection(sectionIdx)} className="text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Fields grid */}
      {!collapsed && (
        <div className={`p-3 grid gap-2 ${section.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {section.fields.length === 0 ? (
            <div className={section.columns === 2 ? 'col-span-2' : ''}>
              <EmptyDropZone
                sectionIdx={sectionIdx}
                onDragOver={onDragOverSlot}
                onDrop={onDropSlot}
                isOver={overTarget?.sectionIdx === sectionIdx && overTarget?.fieldIdx === 0}
              />
            </div>
          ) : (
            section.fields.map((fn, fieldIdx) => {
              const field = fieldMap[fn]
              const isOver = overTarget?.sectionIdx === sectionIdx && overTarget?.fieldIdx === fieldIdx
              return (
                <FieldSlot
                  key={fn}
                  fieldName={fn}
                  label={field?.label || fn}
                  fieldType={field?.fieldType || field?.field_type}
                  isRequired={field?.isRequired || field?.is_required}
                  sectionIdx={sectionIdx}
                  fieldIdx={fieldIdx}
                  onDragStart={onDragStartField}
                  onDragOver={onDragOverSlot}
                  onDrop={onDropSlot}
                  onRemove={onRemoveField}
                  isOver={isOver}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LayoutBuilderPage() {
  const { objectName, layoutId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [fields,       setFields]       = useState([])
  const [sections,     setSections]     = useState([])
  const [name,         setName]         = useState('New Layout')
  const [saving,       setSaving]       = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [showPreview,  setShowPreview]  = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showClone,    setShowClone]    = useState(false)

  const [dragState,  setDragState]  = useState(null)
  const [overTarget, setOverTarget] = useState(null)
  const sectionDragIdx = useRef(null)
  const templateRef    = useRef(null)

  const fieldMap = {}
  fields.forEach(f => {
    const fn = f.fieldName || f.field_name
    if (fn) fieldMap[fn] = f
  })

  const placed = new Set(sections.flatMap(s => s.fields))

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const fieldsR = await api.getSchemaFields(objectName)
        const flds = fieldsR?.fields || fieldsR || []
        setFields(flds)

        if (layoutId !== 'new') {
          const r = await api.get(`/api/v1/schema/layouts/${layoutId}`)
          const lay = r?.layout || r
          setName(lay.name || 'Layout')
          const sec = lay.sections
          const parsed = typeof sec === 'string' ? JSON.parse(sec) : sec
          const arr = Array.isArray(parsed) ? parsed : (parsed?.sections || [])
          _sectionId = arr.length
          setSections(arr.map((s, i) => ({ ...s, _id: i + 1 })))
        } else {
          _sectionId = 0
          setSections([
            newSection('Basic Information'),
            newSection('Details'),
          ])
        }
      } catch (e) { toast(e.message, 'error') }
      setLoading(false)
    }
    init()
  }, [objectName, layoutId, toast])

  // Close template dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) {
        setShowTemplates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Apply template ────────────────────────────────────────────────────────

  const applyTemplate = (tplKey) => {
    const tpl = TEMPLATES[tplKey]
    if (!tpl) return
    _sectionId = 0
    setSections(tpl.sections.map(s => newSection(s.name, s.columns)))
    setShowTemplates(false)
  }

  // ── Reset to default (rebuild from field section_name) ────────────────────

  const resetToDefault = () => {
    _sectionId = 0
    const groups = {}
    fields.forEach(f => {
      const sec = f.sectionName || f.section_name || 'Standard Fields'
      const fn  = f.fieldName  || f.field_name
      if (!groups[sec]) groups[sec] = []
      if (fn) groups[sec].push(fn)
    })
    setSections(
      Object.entries(groups).map(([secName, flds]) => ({
        ...newSection(secName),
        fields: flds,
      }))
    )
    setShowTemplates(false)
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragStartField = (state) => setDragState(state)

  const handleDragOverSlot = (sectionIdx, fieldIdx) => {
    setOverTarget({ sectionIdx, fieldIdx })
  }

  const handleDropSlot = (toSection, toField) => {
    if (!dragState) return
    setSections(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }))
      if (dragState.source === 'panel') {
        next[toSection].fields.splice(toField, 0, dragState.fieldName)
      } else {
        const { sectionIdx: fromS, fieldIdx: fromF, fieldName } = dragState
        next[fromS].fields.splice(fromF, 1)
        const adjustedTo = fromS === toSection && fromF < toField ? toField - 1 : toField
        next[toSection].fields.splice(adjustedTo, 0, fieldName)
      }
      return next
    })
    setDragState(null)
    setOverTarget(null)
  }

  const handleRemoveField = (sectionIdx, fieldIdx) => {
    setSections(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }))
      next[sectionIdx].fields.splice(fieldIdx, 1)
      return next
    })
  }

  const handleUpdateSection = (idx, key, val) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }

  const handleDeleteSection = (idx) => {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDragStartSection = (idx) => { sectionDragIdx.current = idx }
  const handleDragOverSection  = (idx) => setOverTarget({ sectionIdx: idx })
  const handleDropSection = (toIdx) => {
    const fromIdx = sectionDragIdx.current
    if (fromIdx === null || fromIdx === toIdx) {
      sectionDragIdx.current = null
      setOverTarget(null)
      return
    }
    setSections(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    sectionDragIdx.current = null
    setOverTarget(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        objectName,
        name,
        sections: sections.map(s => ({
          name:    s.name,
          columns: s.columns,
          color:   s.color ?? null,
          fields:  s.fields,
        })),
      }
      if (layoutId === 'new') {
        const r = await api.post('/api/v1/schema/layouts', { ...payload, isDefault: true })
        const id = r?.layout?.id || r?.id
        toast('Layout saved', 'success')
        navigate(`/head/setup/objects/${objectName}/layouts/${id}`, { replace: true })
      } else {
        await api.put(`/api/v1/schema/layouts/${layoutId}`, payload)
        toast('Layout saved', 'success')
      }
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-400 text-[13px]">Loading layout editor…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => navigate(`/head/setup/objects/${objectName}`)}
          className="text-gray-500 hover:text-gray-800 text-[12px] flex items-center gap-1 transition-colors shrink-0"
        >
          {objectName} <ChevronRight size={12} /> Layouts
        </button>

        <div className="flex-1 min-w-[120px] max-w-xs">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-[14px] font-semibold text-gray-900 focus:outline-none focus:border-indigo-400"
            placeholder="Layout name"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">

          {/* Templates dropdown */}
          <div ref={templateRef} className="relative">
            <button
              onClick={() => setShowTemplates(t => !t)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] border border-gray-200 text-gray-600 hover:text-gray-900 bg-white transition-colors"
            >
              Templates <ChevronDown size={11} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  >
                    {tpl.label}
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={resetToDefault}
                  className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                >
                  <RotateCcw size={12} /> Reset to Default
                </button>
              </div>
            )}
          </div>

          {/* Clone from role */}
          <button
            onClick={() => setShowClone(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] border border-gray-200 text-gray-600 hover:text-gray-900 bg-white transition-colors"
          >
            <Copy size={12} /> Clone from Role
          </button>

          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] border transition-colors ${
              showPreview
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:text-gray-900 bg-white'
            }`}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            Preview
          </button>

          <Button variant="primary" icon={Save} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Builder */}
        <div className={`flex overflow-hidden ${showPreview ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>

          {/* Field palette */}
          <AvailableFields
            fields={fields}
            placed={placed}
            onDragStart={handleDragStartField}
          />

          {/* Layout canvas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {sections.map((section, sectionIdx) => (
              <SectionCard
                key={section._id}
                section={section}
                sectionIdx={sectionIdx}
                fieldMap={fieldMap}
                dragState={dragState}
                overTarget={overTarget}
                onDragStartSection={handleDragStartSection}
                onDragOverSection={handleDragOverSection}
                onDropSection={handleDropSection}
                onDragStartField={handleDragStartField}
                onDragOverSlot={handleDragOverSlot}
                onDropSlot={handleDropSlot}
                onRemoveField={handleRemoveField}
                onUpdateSection={handleUpdateSection}
                onDeleteSection={handleDeleteSection}
              />
            ))}

            <button
              onClick={() => setSections(prev => [...prev, newSection(`Section ${prev.length + 1}`)])}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-[13px] text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Plus size={15} /> Add Section
            </button>

            {sections.length === 0 && dragState?.source === 'panel' && (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  const sec = newSection('New Section')
                  setSections([sec])
                  setTimeout(() => handleDropSlot(0, 0), 0)
                }}
                className="border-2 border-dashed border-indigo-300 rounded-xl p-12 text-center text-gray-400 text-[13px]"
              >
                Drop field here to create first section
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        {showPreview && (
          <div className="w-1/2 overflow-hidden">
            <LivePreview
              objectName={objectName}
              sections={sections}
              fields={fields}
            />
          </div>
        )}
      </div>

      {/* Clone modal */}
      {showClone && (
        <CloneModal
          objectName={objectName}
          onClose={() => setShowClone(false)}
          onCloned={(cloned) => {
            if (!cloned?.sections) return
            const sec = typeof cloned.sections === 'string'
              ? JSON.parse(cloned.sections)
              : cloned.sections
            const arr = Array.isArray(sec) ? sec : (sec?.sections || [])
            _sectionId = 0
            setSections(arr.map(s => ({ ...s, _id: ++_sectionId })))
          }}
        />
      )}
    </div>
  )
}
