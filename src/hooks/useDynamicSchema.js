import { useState, useEffect } from 'react'
import { get } from '../utils/api'

// Cache schema per object so we don't re-fetch across component mounts
const schemaCache = {}

/**
 * Fetches and caches the schema (fields + picklists) for a given object.
 *
 * Returns:
 *   - fields:    array of { field_name, label, field_type, is_required, section_name }
 *   - picklists: { [field_name]: [{ value, label, color }] }
 *   - getLabel:  (fieldName) => string — readable label for a field
 *   - getPicklist: (fieldName) => array | null
 *   - renderPicklist: (fieldName, value) => { label, color } | null
 *   - loading:   bool
 */
export function useDynamicSchema(objectName) {
  const [schema, setSchema] = useState(schemaCache[objectName] || null)
  const [loading, setLoading] = useState(!schemaCache[objectName])

  useEffect(() => {
    if (!objectName) return
    if (schemaCache[objectName]) {
      setSchema(schemaCache[objectName])
      setLoading(false)
      return
    }
    setLoading(true)
    get(`/api/v1/dynamic/${objectName}/schema`)
      .then(res => {
        const data = { fields: res?.fields || [], picklists: res?.picklists || {} }
        schemaCache[objectName] = data
        setSchema(data)
      })
      .catch(err => {
        console.warn(`Failed to load schema for ${objectName}:`, err.message)
        setSchema({ fields: [], picklists: {} })
      })
      .finally(() => setLoading(false))
  }, [objectName])

  const fields = schema?.fields || []
  const picklists = schema?.picklists || {}

  const getLabel = (fieldName) => {
    const f = fields.find(x => x.field_name === fieldName)
    return f?.label || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const getPicklist = (fieldName) => picklists[fieldName] || null

  /** Returns { label, color } for a picklist value, or null if no picklist */
  const renderPicklist = (fieldName, value) => {
    const pv = picklists[fieldName]
    if (!pv) return null
    const entry = pv.find(p => p.value === String(value))
    return entry ? { label: entry.label || entry.value, color: entry.color || 'gray' } : { label: String(value), color: 'gray' }
  }

  return { fields, picklists, loading, getLabel, getPicklist, renderPicklist }
}
