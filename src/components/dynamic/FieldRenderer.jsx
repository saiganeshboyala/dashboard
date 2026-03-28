import { Badge } from '../ui/Badge'

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

// ─── EDIT MODE ──────────────────────────────────────────────────────────────

const inputCls = 'flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white'

function EditField({ field, value, picklists, onChange }) {
  const type = field.field_type
  const fieldName = field.field_name

  // Resolve picklist
  let pl = picklists?.[fieldName]
  if (!pl && field.picklist_values) {
    try { pl = typeof field.picklist_values === 'string' ? JSON.parse(field.picklist_values) : field.picklist_values }
    catch { /* ignore */ }
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
 *   field     — { field_name, label, field_type, is_required, picklist_values }
 *   value     — current value
 *   picklists — { [field_name]: [{ value, label, color }] } from schema
 *   mode      — 'view' | 'edit'  (default: 'view')
 *   onChange  — (newValue) => void  (only needed in edit mode)
 */
export function FieldRenderer({ field, value, picklists = {}, mode = 'view', onChange }) {
  const isReadonly = READONLY_FIELDS.has(field.field_name)

  if (mode === 'edit' && !isReadonly) {
    return <EditField field={field} value={value} picklists={picklists} onChange={onChange} />
  }

  return <ViewField field={field} value={value} picklists={picklists} />
}

export { READONLY_FIELDS }
