import { get, post, put, del } from './api'

// Schema / Object Builder
export const getSchemaObjects  = ()        => get('/api/v1/schema/objects')
export const getSchemaFields   = (obj)     => get(`/api/v1/schema/fields?objectName=${obj}`)
export const createSchemaField = (d)       => post('/api/v1/schema/fields', d)
export const updateSchemaField = (id, d)   => put(`/api/v1/schema/fields/${id}`, d)
export const deleteSchemaField = (id)      => del(`/api/v1/schema/fields/${id}`)
export const getPicklists      = (obj, f)  => get(`/api/v1/schema/picklists?objectName=${obj}&fieldName=${f}`)
export const getLayouts        = (obj)     => get(`/api/v1/schema/layouts?objectName=${obj}`)
export const getPermissions    = (role, obj) => get(`/api/v1/schema/permissions?role=${role}&objectName=${obj}`)

// Dynamic object API (uses separate /dynamic route)
export const getDynamicList    = (obj, q)  => get(`/api/v1/dynamic/${obj}?${new URLSearchParams(q)}`)
export const getDynamicSchema  = (obj)     => get(`/api/v1/dynamic/${obj}/schema`)
export const getDynamicRecord  = (obj, id) => get(`/api/v1/dynamic/${obj}/${id}`)
export const updateDynamicRecord = (obj, id, d) => put(`/api/v1/dynamic/${obj}/${id}`, d)
export const getDynamicRelated = (obj, id, rel, q = '') => get(`/api/v1/dynamic/${obj}/${id}/related/${rel}?${q}`)

// Validation Rules
export const getValidationRules  = ()      => get('/api/v1/validation-rules')
export const createValidationRule = (d)    => post('/api/v1/validation-rules', d)
export const toggleValidationRule = (id)   => post(`/api/v1/validation-rules/${id}/toggle`)
export const testValidationRule   = (d)    => post('/api/v1/validation-rules/test', d)
export const deleteValidationRule = (id)   => del(`/api/v1/validation-rules/${id}`)

// Flows
export const getFlows           = ()       => get('/api/v1/flows')
export const getFlow            = (id)     => get(`/api/v1/flows/${id}`)
export const createFlow         = (d)      => post('/api/v1/flows', d)
export const deleteFlow         = (id)     => del(`/api/v1/flows/${id}`)
export const activateFlow       = (id)     => put(`/api/v1/flows/${id}/activate`)
export const deactivateFlow     = (id)     => put(`/api/v1/flows/${id}/deactivate`)
export const executeFlow        = (id, d)  => post(`/api/v1/flows/${id}/execute`, d)
export const getRecentExecutions = ()      => get('/api/v1/flows/executions/recent')
export const getFlowNodeTypes   = ()       => get('/api/v1/flows/node-types')

// Webhooks
export const getWebhooks        = ()       => get('/api/v1/webhooks')
export const createWebhook      = (d)      => post('/api/v1/webhooks', d)
export const deleteWebhook      = (id)     => del(`/api/v1/webhooks/${id}`)
export const testWebhook        = (id)     => post(`/api/v1/webhooks/${id}/test`)
