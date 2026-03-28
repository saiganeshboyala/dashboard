import { useState, useEffect } from 'react'
import { getUser } from '../utils/auth'
import { get } from '../utils/api'

/**
 * Returns CRUD permissions + field-level visibility for the current user.
 *
 * Falls back to role-based defaults if the effective-permissions API fails
 * (e.g. when the user has no profile assigned yet).
 *
 * Usage:
 *   const { perms, hiddenFields, readOnlyFields, loading } = usePermissions('students')
 *   // perms.canRead, perms.canEdit, perms.canDelete, perms.canCreate, perms.canViewAll
 *   // hiddenFields — Set<string> of field_names to hide completely
 *   // readOnlyFields — Set<string> of field_names to force read-only
 */
export function usePermissions(objectName) {
  const user = getUser()
  const role = user?.role
  const userId = user?.id

  const [perms, setPerms]               = useState(null)
  const [hiddenFields, setHiddenFields] = useState(new Set())
  const [readOnlyFields, setReadOnlyFields] = useState(new Set())
  const [loading, setLoading]           = useState(!!objectName)

  useEffect(() => {
    if (!objectName || !role) {
      setLoading(false)
      return
    }
    setLoading(true)

    const fieldUrl = userId
      ? `/api/v1/profiles/effective/${userId}/fields?objectName=${objectName}`
      : null

    Promise.all([
      get('/api/v1/profiles/effective/me'),
      fieldUrl ? get(fieldUrl) : Promise.resolve([]),
    ])
      .then(([objRes, fieldRes]) => {
        // ── Object permissions ─────────────────────────────────────────────
        const objArr = Array.isArray(objRes?.objectPermissions)
          ? objRes.objectPermissions
          : []
        const obj = objArr.find(p => p.object_name === objectName) || {}

        const isHead  = role === 'HEAD'
        const isAdmin = isHead || role === 'BU_ADMIN'
        setPerms({
          canRead:    obj.can_read    ?? true,
          canCreate:  obj.can_create  ?? isAdmin,
          canEdit:    obj.can_edit    ?? isAdmin,
          canDelete:  obj.can_delete  ?? isHead,
          canViewAll: obj.can_view_all ?? isHead,
        })

        // ── Field permissions ──────────────────────────────────────────────
        const fieldArr = Array.isArray(fieldRes) ? fieldRes : (fieldRes?.data || [])
        const hidden   = new Set()
        const readOnly = new Set()
        for (const f of fieldArr) {
          if (f.visible === false) hidden.add(f.field_name)
          if (f.read_only === true) readOnly.add(f.field_name)
        }
        setHiddenFields(hidden)
        setReadOnlyFields(readOnly)
      })
      .catch(() => {
        // Graceful fallback — role-based defaults, no field restrictions
        const isHead  = role === 'HEAD'
        const isAdmin = isHead || role === 'BU_ADMIN'
        setPerms({
          canRead:    true,
          canCreate:  isAdmin,
          canEdit:    isAdmin,
          canDelete:  isHead,
          canViewAll: isHead,
        })
        setHiddenFields(new Set())
        setReadOnlyFields(new Set())
      })
      .finally(() => setLoading(false))
  }, [objectName, role, userId])

  return { perms, loading, role, hiddenFields, readOnlyFields }
}
