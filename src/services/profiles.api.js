import { get, post, put, del } from './api'

// Profiles CRUD
export const getProfiles              = ()          => get('/api/v1/profiles')
export const createProfile            = (d)         => post('/api/v1/profiles', d)
export const updateProfile            = (id, d)     => put(`/api/v1/profiles/${id}`, d)
export const deleteProfile            = (id)        => del(`/api/v1/profiles/${id}`)
export const cloneProfile             = (id, d)     => post(`/api/v1/profiles/${id}/clone`, d)
export const getProfileUsers          = (id)        => get(`/api/v1/profiles/${id}/users`)

// Object Permissions
export const getObjectPermissions     = (profileId) => get(`/api/v1/profiles/object-permissions?profileId=${profileId}`)
export const bulkSetObjectPermissions = (d)         => post('/api/v1/profiles/object-permissions/bulk', d)

// Field-Level Security
export const getFieldPermissions      = (profileId, objectName) => get(`/api/v1/profiles/field-permissions?profileId=${profileId}&objectName=${objectName}`)
export const bulkSetFieldPermissions  = (d)         => post('/api/v1/profiles/field-permissions/bulk', d)

// Tab Permissions
export const getTabPermissions        = (profileId) => get(`/api/v1/profiles/tab-permissions?profileId=${profileId}`)
export const setTabPermission         = (d)         => post('/api/v1/profiles/tab-permissions', d)

// Permission Sets
export const getPermissionSets        = ()          => get('/api/v1/profiles/permission-sets')
export const createPermissionSet      = (d)         => post('/api/v1/profiles/permission-sets', d)
export const deletePermissionSet      = (id)        => del(`/api/v1/profiles/permission-sets/${id}`)
export const getPermSetObjectPerms    = (id)        => get(`/api/v1/profiles/permission-sets/${id}/objects`)
export const setPermSetObjectPerm     = (id, d)     => post(`/api/v1/profiles/permission-sets/${id}/objects`, d)

// Meta
export const getAvailableObjects      = ()          => get('/api/v1/profiles/meta/objects')
export const getAvailableTabs         = ()          => get('/api/v1/profiles/meta/tabs')

// Effective permissions (for current user)
export const getEffectivePermissions  = ()          => get('/api/v1/profiles/effective/me')
