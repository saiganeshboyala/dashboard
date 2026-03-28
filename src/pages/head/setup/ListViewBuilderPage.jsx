import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Plus, Trash2, GripVertical, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'
import { Button, Input, Select } from '../../../components/Shared'
import { useToast } from '../../../context/ToastContext'
import * as api from '../../../utils/api'

// ─── Filter operators by type ─────────────────────────────────────────────────

const OPS_BY_TYPE = {
  text:     ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'is_blank', 'is_not_blank'],
  number:   ['equals', 'not_equals', 'greater_than', 'less_than', 'between'],
  date:     ['equals', 'before', 'after', 'last_n_days', 'this_month', 'this_year'],
  datetime: ['equals', 'before', 'after', 'last_n_days', 'this_month', 'this_year'],
  picklist: ['equals', 'not_equals', 'includes', 'excludes'],
  boolean:  ['equals'],
  default:  ['equals', 'not_equals', 'contains'],
}

function getOps(fieldType) {
  return OPS_BY_TYPE[fieldType] || OPS_BY_TYPE.default
}

// ─── Columns picker (dual list) ───────────────────────────────────────────────

function ColumnsPicker({ fields, selected, onChange }) {
  const available = fields.filter(f => {
    const fn = f.fieldName || f.field_name
    return fn && !selected.includes(fn)
  })

  const add    = (fn) => onChange([...selected, fn])
  const remove = (fn) => onChange(selected.filter(x => x !== fn))
  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...selected]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next)
  }
  const moveDown = (idx) => {
    if (idx === selected.length - 1) return
    const next = [...selected]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next)
  }

  const getLabel = (fn) => {
    const f = fields.find(x => (x.fieldName || x.field_name) === fn)
    return f?.label || fn
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Available */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Available Fields</p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
          {available.length === 0 && (
            <p className="text-gray-400 text-[12px] text-center py-4">All fields selected</p>
          )}
          {available.map(f => {
            const fn = f.fieldName || f.field_name
            return (
              <button
                key={fn}
                onClick={() => add(fn)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
              >
                <Plus size={12} className="text-indigo-500 shrink-0" />
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Selected Columns</p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
          {selected.length === 0 && (
            <p className="text-gray-400 text-[12px] text-center py-4">No columns selected</p>
          )}
          {selected.map((fn, idx) => (
            <div
              key={fn}
              className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-800 border-b border-gray-100 last:border-0"
            >
              <GripVertical size={12} className="text-gray-300" />
              <span className="flex-1 truncate">{getLabel(fn)}</span>
              <button onClick={() => moveUp(idx)} className="text-gray-400 hover:text-gray-700 p-0.5">
                <ArrowUp size={11} />
              </button>
              <button onClick={() => moveDown(idx)} className="text-gray-400 hover:text-gray-700 p-0.5">
                <ArrowDown size={11} />
              </button>
              <button onClick={() => remove(fn)} className="text-gray-400 hover:text-red-500 p-0.5">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Filter row ───────────────────────────────────────────────────────────────

function FilterRow({ filter, fields, onChange, onDelete }) {
  const field = fields.find(f => (f.fieldName || f.field_name) === filter.field)
  const ops   = getOps(field?.fieldType || field?.field_type || 'default')
  const set   = (k, v) => onChange({ ...filter, [k]: v })

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filter.field}
        onChange={v => set('field', v)}
        options={fields
          .filter(f => f.fieldName || f.field_name)
          .map(f => ({ value: f.fieldName || f.field_name, label: f.label }))}
        placeholder="Field"
        className="flex-1"
      />
      <Select
        value={filter.operator}
        onChange={v => set('operator', v)}
        options={ops.map(op => ({ value: op, label: op.replace(/_/g, ' ') }))}
        className="flex-1"
      />
      {filter.operator !== 'is_blank' && filter.operator !== 'is_not_blank' &&
       filter.operator !== 'this_month' && filter.operator !== 'this_year' && (
        <input
          value={filter.value || ''}
          onChange={e => set('value', e.target.value)}
          placeholder="Value"
          className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-indigo-400"
        />
      )}
      <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1.5 transition-colors">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ListViewBuilderPage() {
  const { objectName, viewId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [fields,     setFields]     = useState([])
  const [name,       setName]       = useState('New View')
  const [columns,    setColumns]    = useState([])
  const [filters,    setFilters]    = useState([])
  const [sortField,  setSortField]  = useState('')
  const [sortDir,    setSortDir]    = useState('asc')
  const [sharedWith, setSharedWith] = useState('all')
  const [saving,     setSaving]     = useState(false)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const r    = await api.getSchemaFields(objectName)
        const flds = r?.fields || r || []
        setFields(flds)

        if (viewId !== 'new') {
          const vr    = await api.get(`/api/v1/schema/list-views?objectName=${objectName}`)
          const views = vr?.views || []
          const view  = views.find(v => String(v.id) === String(viewId))
          if (view) {
            setName(view.name)
            setColumns(view.columns || [])
            setFilters(view.filters || [])
            setSortField(view.sortField || '')
            setSortDir(view.sortDir || 'asc')
            setSharedWith(view.sharedWith || 'all')
          }
        } else {
          const def = flds
            .filter(f => {
              const fn = f.fieldName || f.field_name
              return fn && fn !== 'id' && fn !== 'tenant_id' && fn !== 'created_by'
            })
            .slice(0, 5)
            .map(f => f.fieldName || f.field_name)
          setColumns(def)
        }
      } catch (e) { toast(e.message, 'error') }
      setLoading(false)
    }
    init()
  }, [objectName, viewId, toast])

  const addFilter = () => {
    const firstField = fields.find(f => f.fieldName || f.field_name)
    if (!firstField) return
    setFilters(f => [...f, {
      field: firstField.fieldName || firstField.field_name,
      operator: 'equals',
      value: '',
    }])
  }

  const updateFilter = (idx, val) => setFilters(f => f.map((x, i) => i === idx ? val : x))
  const deleteFilter = (idx)      => setFilters(f => f.filter((_, i) => i !== idx))

  const save = async () => {
    if (!name.trim()) return toast('View name required', 'error')
    setSaving(true)
    try {
      const payload = {
        objectName, name, columns, filters,
        sortField: sortField || null,
        sortDir, sharedWith,
      }
      if (viewId === 'new') {
        await api.post('/api/v1/schema/list-views', payload)
        toast('List view created', 'success')
        navigate(`/head/setup/objects/${objectName}`, { replace: true })
      } else {
        await api.put(`/api/v1/schema/list-views/${viewId}`, payload)
        toast('List view updated', 'success')
      }
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  const fieldOptions = fields
    .filter(f => f.fieldName || f.field_name)
    .map(f => ({ value: f.fieldName || f.field_name, label: f.label }))

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-400">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-1 text-[12px] text-gray-500 mb-1">
          <button onClick={() => navigate(`/head/setup/objects/${objectName}`)} className="hover:text-gray-900 transition-colors">
            {objectName}
          </button>
          <ChevronRight size={12} />
          <span className="text-gray-900">{viewId === 'new' ? 'New List View' : 'Edit List View'}</span>
        </div>
        <h1 className="text-[17px] font-semibold text-gray-900">
          {viewId === 'new' ? 'New List View' : 'Edit List View'}
        </h1>
      </div>

      <div className="px-8 py-6 max-w-3xl space-y-8">
        {/* Name */}
        <div>
          <Input label="View Name *" value={name} onChange={setName} placeholder="e.g. Active Students" />
        </div>

        {/* Columns */}
        <div>
          <h2 className="text-[12px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">Columns</h2>
          <ColumnsPicker fields={fields} selected={columns} onChange={setColumns} />
        </div>

        {/* Filters */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-semibold text-gray-700 uppercase tracking-wider">Filters</h2>
            <Button variant="ghost" icon={Plus} size="sm" onClick={addFilter}>Add Filter</Button>
          </div>
          <div className="space-y-2">
            {filters.length === 0 && (
              <p className="text-gray-400 text-[13px]">No filters — shows all records.</p>
            )}
            {filters.map((filter, idx) => (
              <FilterRow
                key={idx}
                filter={filter}
                fields={fields}
                onChange={val => updateFilter(idx, val)}
                onDelete={() => deleteFilter(idx)}
              />
            ))}
          </div>
          {filters.length > 1 && (
            <p className="text-gray-400 text-[11px] mt-2">All filters are combined with AND logic.</p>
          )}
        </div>

        {/* Sort */}
        <div>
          <h2 className="text-[12px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">Sort</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select
                label="Sort Field"
                value={sortField}
                onChange={setSortField}
                options={[{ value: '', label: '— No sort —' }, ...fieldOptions]}
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-600 mb-1">Direction</label>
              <div className="flex gap-2">
                {['asc', 'desc'].map(d => (
                  <button
                    key={d}
                    onClick={() => setSortDir(d)}
                    className={`px-4 py-2 rounded text-[12px] border transition-colors ${
                      sortDir === d
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {d === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <h2 className="text-[12px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">Visibility</h2>
          <div className="flex gap-3">
            {[
              { value: 'me',       label: 'Only me' },
              { value: 'all',      label: 'All users' },
              { value: 'profiles', label: 'Specific profiles' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSharedWith(opt.value)}
                className={`px-4 py-2 rounded-lg text-[13px] border transition-colors ${
                  sharedWith === opt.value
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={() => navigate(`/head/setup/objects/${objectName}`)}>
            Cancel
          </Button>
          <Button variant="primary" icon={Save} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save List View'}
          </Button>
        </div>
      </div>
    </div>
  )
}
