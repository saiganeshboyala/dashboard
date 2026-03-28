import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Loading } from '../ui/Loading'
import { FieldRenderer } from './FieldRenderer'
import { useDynamicSchema } from '../../hooks/useDynamicSchema'
import api from '../../utils/api'

// Fields to exclude from the form entirely
const FORM_HIDDEN = new Set([
  'id', 'tenant_id', 'created_at', 'updated_at', 'sf_id',
  'password_hash', 'password_history', 'password_changed_at',
  'failed_login_count', 'locked_until', 'created_by', 'owner_id', 'user_id',
  'days_in_market', 'in_job_count', 'in_market', 'total_student_count',
])

const SECTION_ORDER = [
  'Standard Fields', 'Contact Information', 'Status & Tracking',
  'Metrics & Financials', 'Custom Fields',
]

function groupBySection(fields) {
  const map = {}
  for (const f of fields) {
    const sec = f.section_name || 'General'
    if (!map[sec]) map[sec] = []
    map[sec].push(f)
  }
  return Object.entries(map)
    .sort(([a], [b]) => {
      const ai = SECTION_ORDER.indexOf(a), bi = SECTION_ORDER.indexOf(b)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.localeCompare(b)
    })
    .map(([name, flds]) => ({ name, fields: flds }))
}

/**
 * DynamicForm — create or edit modal for any object.
 *
 * Props:
 *   objectName  — e.g. 'students'
 *   record      — existing record (edit mode) or null/undefined (create mode)
 *   defaults    — default field values to pre-fill (e.g. { student_id: 5 })
 *   open        — boolean
 *   onClose     — () => void
 *   onSaved     — (savedRecord) => void
 */
export function DynamicForm({ objectName, record, defaults = {}, open, onClose, onSaved }) {
  const { fields, picklists, loading: schemaLoading } = useDynamicSchema(objectName)
  const isEdit = !!record

  const [values, setValues]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [collapsed, setCollapsed] = useState({})

  // Initialize form values when modal opens or record changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultsKey = JSON.stringify(defaults)
  useEffect(() => {
    if (!open) return
    const init = { ...defaults }
    if (record) {
      for (const [k, v] of Object.entries(record)) {
        if (!FORM_HIDDEN.has(k)) init[k] = v
      }
    }
    setValues(init)
    setError(null)
  // defaultsKey is a stable string representation of the defaults object
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record, defaultsKey])

  const handleChange = (fieldName, val) => {
    setValues(prev => ({ ...prev, [fieldName]: val }))
  }

  const validate = () => {
    const errors = []
    for (const f of fields) {
      if (FORM_HIDDEN.has(f.field_name)) continue
      if (f.is_required && (values[f.field_name] === null || values[f.field_name] === undefined || values[f.field_name] === '')) {
        errors.push(`${f.label} is required`)
      }
    }
    return errors
  }

  const handleSubmit = async () => {
    const clientErrors = validate()
    if (clientErrors.length > 0) {
      setError(clientErrors.join('; '))
      return
    }

    setSaving(true)
    setError(null)
    try {
      let saved
      if (isEdit) {
        const changes = {}
        for (const [k, v] of Object.entries(values)) {
          if (v !== record[k]) changes[k] = v
        }
        if (Object.keys(changes).length === 0) { onClose(); return }
        const res = await api.put(`/api/v1/dynamic/${objectName}/${record.id}`, changes)
        if (res?.errors?.length > 0) { setError(res.errors.map(e => e.message).join('; ')); return }
        saved = res
      } else {
        const res = await api.post(`/api/v1/dynamic/${objectName}`, values)
        if (res?.errors?.length > 0) { setError(res.errors.map(e => e.message).join('; ')); return }
        saved = res
      }
      onSaved?.(saved)
      onClose()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const objectLabel = objectName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const formFields  = fields.filter(f => !FORM_HIDDEN.has(f.field_name))
  const sections    = groupBySection(formFields)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${objectLabel}` : `New ${objectLabel}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create')}
          </Button>
        </div>
      }
    >
      {schemaLoading ? (
        <div className="py-12"><Loading /></div>
      ) : (
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {error && <Alert variant="error">{error}</Alert>}

          {sections.map(section => (
            <div key={section.name} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
                onClick={() => setCollapsed(c => ({ ...c, [section.name]: !c[section.name] }))}
              >
                <span className="text-[11px] font-700 text-gray-600 uppercase tracking-wide">{section.name}</span>
                <span className="text-gray-400 text-xs">{collapsed[section.name] ? '▶' : '▼'}</span>
              </button>

              {!collapsed[section.name] && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4">
                  {section.fields.map(field => (
                    <div key={field.field_name} className={field.field_type === 'textarea' ? 'col-span-2' : ''}>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        {field.label}
                        {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <FieldRenderer
                        field={field}
                        value={values[field.field_name]}
                        picklists={picklists}
                        mode="edit"
                        onChange={(val) => handleChange(field.field_name, val)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
