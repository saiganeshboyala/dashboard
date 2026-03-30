import { useState, useEffect } from 'react'
import { Monitor, Tablet, Smartphone, RefreshCw } from 'lucide-react'
import { get } from '../../../utils/api'
import { FieldRenderer } from '../../../components/dynamic/FieldRenderer'

// ─── Viewport widths ──────────────────────────────────────────────────────────

const VIEWPORTS = [
  { key: 'desktop', Icon: Monitor,    width: '100%' },
  { key: 'tablet',  Icon: Tablet,     width: '768px' },
  { key: 'mobile',  Icon: Smartphone, width: '375px' },
]

// ─── Normalize a schema field to FieldRenderer's expected shape ───────────────

function normalizeField(f) {
  return {
    field_name:      f.field_name      || f.fieldName      || '',
    field_type:      f.field_type      || f.fieldType      || 'text',
    label:           f.label           || f.fieldName      || f.field_name || '',
    is_required:     f.is_required     || f.isRequired     || false,
    picklist_values: f.picklist_values || f.picklistValues || null,
  }
}

// ─── Get value from a record, tolerating camelCase ↔ snake_case mismatch ──────

function getValue(record, fn) {
  if (!fn) return undefined
  if (fn in record) return record[fn]
  const snake = fn.replace(/([A-Z])/g, '_$1').toLowerCase()
  return record[snake]
}

// ─── LivePreview ──────────────────────────────────────────────────────────────

export default function LivePreview({ objectName, sections, fields }) {
  const [records,   setRecords]   = useState([])
  const [recordIdx, setRecordIdx] = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [viewport,  setViewport]  = useState('desktop')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const r = await get(`/api/v1/dynamic/${objectName}?limit=15`)
        if (!cancelled) {
          setRecords(r?.records || [])
          setRecordIdx(0)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [objectName])

  const record = records[recordIdx] || {}

  // Build a fieldMap keyed by all name variants so lookup always works
  const fieldMap = {}
  fields.forEach(f => {
    const nf = normalizeField(f)
    if (nf.field_name) fieldMap[nf.field_name] = nf
    if (f.fieldName && f.fieldName !== nf.field_name) fieldMap[f.fieldName] = nf
  })

  const { width: vpWidth } = VIEWPORTS.find(v => v.key === viewport) || VIEWPORTS[0]

  const placed = new Set(sections.flatMap(s => s.fields || []))
  const unassigned = fields.filter(f => {
    const fn = f.fieldName || f.field_name
    return fn && !placed.has(fn) && fn !== 'id' && fn !== 'tenant_id' && fn !== 'created_by'
  })

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* Preview toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <span className="text-[12px] font-semibold text-gray-700 shrink-0">Live Preview</span>

        {loading && <RefreshCw size={12} className="text-gray-400 animate-spin shrink-0" />}

        {records.length > 0 && (
          <select
            value={recordIdx}
            onChange={e => setRecordIdx(Number(e.target.value))}
            className="bg-white border border-gray-200 rounded px-2 py-1 text-[12px] text-gray-700 focus:outline-none focus:border-indigo-400 min-w-0 flex-1 max-w-[200px]"
          >
            {records.map((r, i) => (
              <option key={r.id ?? i} value={i}>
                {r.name || r.full_name || r.email || `Record #${r.id || i + 1}`}
              </option>
            ))}
          </select>
        )}

        {/* Viewport toggles */}
        <div className="ml-auto flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 shrink-0">
          {VIEWPORTS.map(({ key, Icon }) => (
            <button
              key={key}
              onClick={() => setViewport(key)}
              title={key}
              className={`p-1.5 rounded transition-colors ${
                viewport === key
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Preview canvas */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div
          style={{ width: vpWidth, maxWidth: '100%', transition: 'width 0.2s ease' }}
          className="space-y-3"
        >
          {loading && records.length === 0 ? (
            <div className="text-center text-gray-400 text-[13px] mt-16">Loading sample records…</div>
          ) : records.length === 0 ? (
            <div className="text-center text-gray-400 text-[13px] mt-16">No records found for preview</div>
          ) : sections.length === 0 ? (
            <div className="text-center text-gray-400 text-[13px] mt-16">Add sections to the builder to see the preview</div>
          ) : (
            sections.map((section, i) => {
              const sectionFields = (section.fields || [])
                .map(fn => fieldMap[fn])
                .filter(Boolean)

              if (sectionFields.length === 0) return null

              const headerBg     = section.color ? section.color + '1a' : undefined
              const headerBorder = section.color ? section.color + '44' : undefined
              const titleColor   = section.color || undefined

              return (
                <div key={section._id ?? i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div
                    className="px-4 py-2.5 bg-gray-50 border-b border-gray-200"
                    style={headerBg ? { backgroundColor: headerBg, borderColor: headerBorder } : {}}
                  >
                    <h3
                      className="text-[13px] font-semibold text-gray-900"
                      style={titleColor ? { color: titleColor } : {}}
                    >
                      {section.name}
                    </h3>
                  </div>
                  <div className={`p-4 grid gap-x-6 gap-y-4 ${section.columns === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {sectionFields.map((field, fi) => (
                      <div key={`${i}-${fi}-${field.field_name}`} className="space-y-1 min-w-0">
                        <label className="block text-[11px] font-medium text-gray-500 truncate">
                          {field.label}
                          {field.is_required && <span className="text-red-400 ml-0.5">*</span>}
                        </label>
                        <div className="text-[13px] text-gray-900 min-h-[20px] leading-relaxed">
                          <FieldRenderer
                            field={field}
                            value={getValue(record, field.field_name)}
                            mode="view"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}

          {/* Unassigned fields hint */}
          {!loading && records.length > 0 && unassigned.length > 0 && (
            <div className="border border-dashed border-gray-300 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {unassigned.length} Unassigned Field{unassigned.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map(f => (
                  <span
                    key={f.fieldName || f.field_name}
                    className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] rounded"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
