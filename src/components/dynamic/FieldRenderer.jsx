import { useState, useEffect, useRef } from 'react'
import { Badge } from '../ui/Badge'
import { get } from '../../utils/api'

// Fields that are always read-only
const READONLY_FIELDS = new Set(['id', 'created_at', 'updated_at', 'tenant_id', 'sf_id'])

// ─── VIEW MODE ──────────────────────────────────────────────────────────────

function ViewField({ field, value, picklists }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-300">—</span>
  }

  const type = field.field_type
  const fieldName = field.field_name

  // Resolve picklist: schema picklists first, then field.picklist_values JSON
  let pl = picklists?.[fieldName]
  if (!pl && field.picklist_values) {
    try { pl = typeof field.picklist_values === 'string' ? JSON.parse(field.picklist_values) : field.picklist_values }
    catch { /* ignore */ }
  }

  if (pl && pl.length > 0) {
    const pv = pl.find(p => p.value === String(value))
    if (pv) return <Badge color={pv.color || 'blue'}>{pv.label || pv.value}</Badge>
    return <Badge color="gray">{String(value)}</Badge>
  }

  if (type === 'boolean' || type === 'checkbox') {
    return <Badge color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Badge>
  }

  if (type === 'formula') {
    return <span className="text-purple-700 font-medium">{String(value)}</span>
  }

  if (type === 'date' || (fieldName.includes('date') && !fieldName.includes('updated') && !fieldName.includes('created'))) {
    try {
      const d = new Date(value)
      if (isNaN(d.getTime())) return String(value)
      return d.toLocaleDateString()
    } catch { return String(value) }
  }

  if (type === 'datetime' || fieldName.endsWith('_at')) {
    try {
      const d = new Date(value)
      if (isNaN(d.getTime())) return String(value)
      return d.toLocaleString()
    } catch { return String(value) }
  }

  if (type === 'currency' || fieldName.includes('rate') || fieldName.includes('amount') || fieldName.includes('salary') || fieldName.includes('bill_')) {
    const n = Number(value)
    return isNaN(n) ? String(value) : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (type === 'percent') {
    return `${Number(value).toFixed(1)}%`
  }

  if (type === 'email' || fieldName.includes('email')) {
    return <a href={`mailto:${value}`} className="text-blue-600 hover:underline">{value}</a>
  }

  if (type === 'url' || fieldName.includes('_url') || fieldName.includes('_link')) {
    return <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">{value}</a>
  }

  if (type === 'phone' || fieldName.includes('phone') || fieldName.includes('mobile')) {
    return <a href={`tel:${value}`} className="text-blue-600 hover:underline">{value}</a>
  }

  const str = String(value)
  if (str.length > 200) {
    return <span title={str} className="cursor-help">{str.substring(0, 200)}…</span>
  }

  return str
}

// ─── LOOKUP FIELD EDIT ───────────────────────────────────────────────────────

function LookupField({ field, value, onChange }) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [display, setDisplay] = useState(null)
  const searchRef = useRef(null)

  const targetObject = field.lookup_object || field.lookupObject

  // Load display name for existing value
  useEffect(() => {
    if (!value || !targetObject) { setDisplay(null); return }
    get(`/api/v1/dynamic/${targetObject}/${value}`)
      .then(res => {
        const r = res?.record || res
        const name = r?.first_name ? `${r.first_name} ${r.last_name || ''}`.trim()
          : r?.name || r?.email || r?.cluster_name || `#${value}`
        setDisplay(name)
      })
      .catch(() => setDisplay(`#${value}`))
  }, [value, targetObject])

  const searchRecords = async (q) => {
    if (!targetObject) return
    setLoading(true)
    try {
      const res = await get(`/api/v1/dynamic/${targetObject}/lookup?field=${field.field_name}&search=${encodeURIComponent(q)}&limit=20`)
      setResults(res?.records || [])
    } catch { setResults([]) }
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => searchRecords(search), 200)
    return () => clearTimeout(timer)
  }, [search, open])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const select = (record) => {
    onChange(record.id)
    const name = record.first_name ? `${record.first_name} ${record.last_name || ''}`.trim()
      : record.name || record.email || record.cluster_name || `#${record.id}`
    setDisplay(name)
    setOpen(false)
    setSearch('')
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange(null)
    setDisplay(null)
  }

  const getRecordName = (r) => r.first_name
    ? `${r.first_name} ${r.last_name || ''}`.trim()
    : r.name || r.email || r.cluster_name || `#${r.id}`

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 rounded-lg text-[13px] bg-white cursor-pointer hover:border-blue-400"
        onClick={() => { setOpen(true); searchRecords('') }}
      >
        <span className="flex-1 text-gray-700">{display || (value ? `#${value}` : <span className="text-gray-400">Search {targetObject}…</span>)}</span>
        {value && (
          <button onClick={clear} className="text-gray-400 hover:text-red-500 text-xs px-1">×</button>
        )}
        <span className="text-gray-400 text-xs">▼</span>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${targetObject}…`}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center text-[12px] text-gray-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="py-4 text-center text-[12px] text-gray-400">No results</div>
            ) : (
              results.map(r => (
                <div
                  key={r.id}
                  onClick={() => select(r)}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                >
                  <span className="text-[13px] text-gray-800">{getRecordName(r)}</span>
                  <span className="text-[11px] text-gray-400">#{r.id}</span>
                </div>
              ))
            )}
          </div>
          <div className="p-1.5 border-t border-gray-100">
            <button onClick={() => setOpen(false)} className="w-full text-[11px] text-gray-400 hover:text-gray-600 py-0.5">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EDIT MODE ──────────────────────────────────────────────────────────────

const inputCls = 'flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white'

function EditField({ field, value, picklists, onChange, dependentPicklists }) {
  const type = field.field_type
  const fieldName = field.field_name

  // Formula fields are always read-only
  if (type === 'formula') {
    return <span className="text-purple-700 font-medium italic text-[12px]">{String(value ?? '—')} <span className="text-gray-300 text-[10px]">(computed)</span></span>
  }

  // Lookup field
  if (type === 'lookup') {
    return <LookupField field={field} value={value} onChange={onChange} />
  }

  // Resolve picklist — apply dependent picklist filtering if applicable
  let pl = picklists?.[fieldName]
  if (!pl && field.picklist_values) {
    try { pl = typeof field.picklist_values === 'string' ? JSON.parse(field.picklist_values) : field.picklist_values }
    catch { /* ignore */ }
  }

  // Apply dependent picklist filtering
  if (pl && pl.length > 0 && dependentPicklists) {
    const dep = dependentPicklists[fieldName]
    if (dep) pl = pl.filter(pv => dep.includes(pv.value))
  }

  if (pl && pl.length > 0) {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} className={inputCls}>
        <option value="">— Select —</option>
        {pl.map(pv => <option key={pv.value} value={pv.value}>{pv.label || pv.value}</option>)}
      </select>
    )
  }

  if (type === 'boolean' || type === 'checkbox') {
    return (
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600 cursor-pointer" />
    )
  }

  if (type === 'date') {
    const dateVal = value ? new Date(value).toISOString().split('T')[0] : ''
    return <input type="date" value={dateVal} onChange={e => onChange(e.target.value || null)} className={inputCls} />
  }

  if (type === 'datetime') {
    const dtVal = value ? new Date(value).toISOString().slice(0, 16) : ''
    return <input type="datetime-local" value={dtVal} onChange={e => onChange(e.target.value || null)} className={inputCls} />
  }

  if (['number', 'decimal', 'currency', 'percent'].includes(type)) {
    const step = (type === 'decimal' || type === 'currency') ? '0.01' : '1'
    return <input type="number" value={value ?? ''} step={step}
      onChange={e => onChange(e.target.value !== '' ? Number(e.target.value) : null)} className={inputCls} />
  }

  if (type === 'textarea') {
    return <textarea value={value ?? ''} onChange={e => onChange(e.target.value)}
      className={`${inputCls} min-h-[72px] resize-y`} />
  }

  if (type === 'email') {
    return <input type="email" value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputCls} />
  }

  if (type === 'url') {
    return <input type="url" value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputCls} />
  }

  if (type === 'phone') {
    return <input type="tel" value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputCls} />
  }

  return <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputCls} />
}

// ─── PUBLIC COMPONENT ────────────────────────────────────────────────────────

/**
 * Renders a single field in view or edit mode.
 *
 * Props:
 *   field              — { field_name, label, field_type, is_required, picklist_values, lookup_object }
 *   value              — current value
 *   picklists          — { [field_name]: [{ value, label, color }] } from schema
 *   mode               — 'view' | 'edit'  (default: 'view')
 *   onChange           — (newValue) => void  (only needed in edit mode)
 *   dependentPicklists — { [field_name]: ['allowed_value1', 'allowed_value2'] } (optional)
 */
export function FieldRenderer({ field, value, picklists = {}, mode = 'view', onChange, dependentPicklists }) {
  const isReadonly = READONLY_FIELDS.has(field.field_name)

  if (mode === 'edit' && !isReadonly) {
    return <EditField field={field} value={value} picklists={picklists} onChange={onChange} dependentPicklists={dependentPicklists} />
  }

  return <ViewField field={field} value={value} picklists={picklists} />
}

export { READONLY_FIELDS }
