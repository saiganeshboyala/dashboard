import { getToken, getAdminToken, refreshAccessToken } from './auth'

// Global error handler — set by ApiErrorSetup inside ToastProvider.
// Only fires for mutations (POST, PUT, DELETE), not GET fetches.
let _errorHandler = null
export function setApiErrorHandler(fn) { _errorHandler = fn }

async function request(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase()
  const isMutation = method !== 'GET'
  const isAdmin = path.startsWith('/api/v1/admin')
  const token = isAdmin ? getAdminToken() : getToken()
  let res
  try {
    res = await fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...opts.headers,
      },
    })
  } catch (networkErr) {
    // Network offline / DNS failure
    if (isMutation && _errorHandler) _errorHandler('Network error — please check your connection.')
    throw networkErr
  }

  if (res.status === 401) {
    if (isAdmin) {
      localStorage.removeItem('rp_admin_token')
      localStorage.removeItem('rp_admin')
      window.location.href = '/admin/login'
      return null
    }
    // Attempt token refresh before logging out
    const newToken = await refreshAccessToken()
    if (newToken) {
      // Retry the original request with the new token
      const retryRes = await fetch(path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}`, ...opts.headers },
      })
      if (retryRes.ok) {
        const retryJson = await retryRes.json()
        if (retryJson.success !== undefined) return retryJson.data || retryJson
        return retryJson
      }
    }
    // Refresh failed — force logout
    localStorage.clear()
    window.location.href = '/login'
    return null
  }
  if (res.status === 403) {
    const err = Object.assign(new Error('Access denied. You don\'t have permission to perform this action.'), { status: 403 })
    if (_errorHandler) _errorHandler(err.message)
    throw err
  }

  const ct = res.headers.get('content-type')
  if (ct?.includes('text/csv')) return { blob: await res.blob() }

  const json = await res.json()
  if (json.success !== undefined) {
    if (!json.success) {
      const msg = json.error?.message || 'Request failed'
      if (isMutation && _errorHandler) _errorHandler(msg)
      throw new Error(msg)
    }
    return json.data || json
  }
  return json
}

export const get  = (p)    => request(p)
export const post = (p, b) => request(p, { method: 'POST',   body: JSON.stringify(b) })
export const put  = (p, b) => request(p, { method: 'PUT',    body: JSON.stringify(b) })
export const del  = (p)    => request(p, { method: 'DELETE' })

// Auth
export const getMe         = ()       => request('/api/v1/auth/me')
export const setPassword   = (d)      => request('/api/v1/auth/set-password', { method: 'POST', body: JSON.stringify(d) })

// Invites
export const sendInvite          = (d)    => request('/api/v1/tenants/send-invite',          { method: 'POST',   body: JSON.stringify(d) })
export const bulkInvite          = (d)    => request('/api/v1/tenants/bulk-invite',           { method: 'POST',   body: JSON.stringify(d) })
export const bulkInvitePreview   = (r, b) => request(`/api/v1/tenants/bulk-invite/preview?role=${r}&buId=${b}`)
export const getPendingInvites   = ()     => request('/api/v1/tenants/pending-invites')
export const resendInvite        = (id)   => request(`/api/v1/tenants/resend-invite/${id}`,  { method: 'POST',   body: JSON.stringify({}) })
export const revokeInvite        = (id)   => request(`/api/v1/tenants/revoke-invite/${id}`,  { method: 'DELETE' })

// Students
export const getStudents       = (q = '') => request(`/api/v1/students?${q}`).then(r => ({ students: Array.isArray(r) ? r : r?.students || r?.data || [], total: r?.total || r?.meta?.total || 0 }))
export const getStudent        = (id)     => request(`/api/v1/students/${id}`)
export const createStudent     = (d)      => request('/api/v1/students', { method: 'POST', body: JSON.stringify(d) })
export const updateStudent     = (id, d)  => request(`/api/v1/students/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const deleteStudent     = (id)     => request(`/api/v1/students/${id}`, { method: 'DELETE' })
export const assignStudent     = (id, d)  => request(`/api/v1/students/${id}/assign`, { method: 'PUT', body: JSON.stringify(d) })
export const bulkAssignStudents= (d)      => request('/api/v1/students/bulk-assign', { method: 'POST', body: JSON.stringify(d) })
export const bulkDeleteStudents= (d)      => request('/api/v1/students/bulk-delete', { method: 'POST', body: JSON.stringify(d) })

// Recruiters
export const getRecruiters     = ()       => request('/api/v1/recruiters').then(r => ({ recruiters: Array.isArray(r) ? r : r?.recruiters || r?.data || [] }))
export const getRecruiter      = (id)     => request(`/api/v1/recruiters/${id}`)
export const createRecruiter   = (d)      => request('/api/v1/recruiters', { method: 'POST', body: JSON.stringify(d) })
export const updateRecruiter   = (id, d)  => request(`/api/v1/recruiters/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const getRecruiterPerf  = (id)     => request(`/api/v1/recruiters/${id}/performance`)

// Submissions
export const getSubmissions    = (q = '') => request(`/api/v1/submissions?${q}`).then(r => ({ submissions: Array.isArray(r) ? r : r?.submissions || r?.data || [], total: r?.total || 0 }))
export const createSubmission  = (d)      => request('/api/v1/submissions', { method: 'POST', body: JSON.stringify(d) })
export const updateSubmission  = (id, d)  => request(`/api/v1/submissions/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const deleteSubmission  = (id)     => request(`/api/v1/submissions/${id}`, { method: 'DELETE' })
export const getDailySubs      = ()       => request('/api/v1/submissions/daily').then(r => ({ count: r?.count || 0 }))

// Interviews
export const getInterviews     = (q = '') => request(`/api/v1/interviews?${q}`).then(r => ({ interviews: Array.isArray(r) ? r : r?.interviews || r?.data || [], total: r?.total || 0 }))
export const createInterview   = (d)      => request('/api/v1/interviews', { method: 'POST', body: JSON.stringify(d) })
export const updateResult      = (id, d)  => request(`/api/v1/interviews/${id}/result`, { method: 'PUT', body: JSON.stringify(d) })
export const deleteInterview   = (id)     => request(`/api/v1/interviews/${id}`, { method: 'DELETE' })

// Business Units
export const getBUs            = ()       => request('/api/v1/bus')
export const getBU             = (id)     => request(`/api/v1/bus/${id}`)
export const createBU          = (d)      => request('/api/v1/bus', { method: 'POST', body: JSON.stringify(d) })
export const getBUStats        = (id)     => request(`/api/v1/bus/${id}/stats`)

// Clusters
export const getClusters       = ()       => request('/api/v1/clusters')
export const createCluster     = (d)      => request('/api/v1/clusters', { method: 'POST', body: JSON.stringify(d) })
export const getClusterTree    = ()       => request('/api/v1/clusters/hierarchy/tree')
export const assignBUToCluster = (id, d)  => request(`/api/v1/clusters/${id}/assign-bu`, { method: 'PUT', body: JSON.stringify(d) })

// Analytics
export const getOverview          = ()     => request('/api/v1/analytics/overview')
export const getBUComparison      = ()     => request('/api/v1/analytics/bu-comparison')
export const getLeaderboard       = ()     => request('/api/v1/analytics/recruiter-leaderboard')
export const getPerformanceLeaderboard = (period = 'week') => request(`/api/v1/analytics/performance-leaderboard?period=${period}`)
export const getPipeline          = ()     => request('/api/v1/analytics/pipeline')
export const getTechDemand        = ()     => request('/api/v1/analytics/technology-demand')
export const getSubmissionTrends  = (d=30) => request(`/api/v1/analytics/submission-trends?days=${d}`)
export const getDailyReport       = ()     => request('/api/v1/analytics/daily-report')
export const getConversionFunnel  = ()     => request('/api/v1/analytics/conversion-funnel')
export const getVendorPerformance = ()     => request('/api/v1/analytics/vendor-performance')
export const getStudentAging      = ()     => request('/api/v1/analytics/student-aging')
export const getRevenue           = ()     => request('/api/v1/analytics/revenue')
export const getTechPerformance   = ()     => request('/api/v1/analytics/tech-performance')
export const getRecruiterComparison= ()    => request('/api/v1/analytics/recruiter-comparison')
export const getStudentStatus     = ()     => request('/api/v1/analytics/student-status').then(r => ({ statuses: Array.isArray(r) ? r : r?.statuses || r?.data || [] }))
export const getTopStudents       = ()     => request('/api/v1/analytics/top-students').then(r => ({ students: Array.isArray(r) ? r : r?.students || r?.data || [] }))
export const getActivityFeed      = ()     => request('/api/v1/analytics/activity-feed').then(r => ({ feed: Array.isArray(r) ? r : r?.feed || r?.data || [] }))
export const getUpcomingInterviews= ()     => request('/api/v1/analytics/upcoming-interviews').then(r => ({ interviews: Array.isArray(r) ? r : r?.interviews || r?.data || [] }))

// AI Agents
export const getPlacementPrediction = (sid)  => request(`/api/v1/agents/placement/${sid}`)
export const getPlacementBatch      = (ids)  => request('/api/v1/agents/placement/batch', { method: 'POST', body: JSON.stringify({ studentIds: ids }) }).catch(() => ({ results: [] }))
export const getSkillGap            = (sid)  => request(`/api/v1/agents/skill-gap/${sid}`)
export const getRecruiterPerfAI     = ()     => request('/api/v1/agents/recruiter-perf')
export const getVendorIntelAI       = ()     => request('/api/v1/agents/vendor-intel')

// Records (universal detail endpoint)
export const getTimeline = (sid) => request(`/api/v1/records/students/${sid}`).then(r => ({ timeline: r?.related?.submissions?.records || [] }))
export const getRecord   = (type, id) => request(`/api/v1/records/${type}/${id}`)

// Search
export const search = (q, limit = 10) => request(`/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}`)

// Leads & Campaigns
export const getLeads           = (q = '') => request(`/api/v1/leads/leads?${q}`)
export const getLead            = (id)     => request(`/api/v1/leads/leads/${id}`)
export const createLead         = (d)      => request('/api/v1/leads/leads', { method: 'POST', body: JSON.stringify(d) })
export const updateLead         = (id, d)  => request(`/api/v1/leads/leads/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const convertLead        = (id, d)  => request(`/api/v1/leads/leads/${id}/convert`, { method: 'POST', body: JSON.stringify(d) })
export const getCampaigns       = ()       => request('/api/v1/leads/campaigns')
export const createCampaign     = (d)      => request('/api/v1/leads/campaigns', { method: 'POST', body: JSON.stringify(d) })

// Cases
export const getCases           = (q = '') => request(`/api/v1/cases?${q}`)
export const getCase            = (id)     => request(`/api/v1/cases/${id}`)
export const createCase         = (d)      => request('/api/v1/cases', { method: 'POST', body: JSON.stringify(d) })
export const updateCase         = (id, d)  => request(`/api/v1/cases/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const addCaseComment     = (id, d)  => request(`/api/v1/cases/${id}/comments`, { method: 'POST', body: JSON.stringify(d) })

// Approvals
export const getApprovals       = ()       => request('/api/v1/approvals/pending')
export const approveRequest     = (id, d)  => request(`/api/v1/approvals/${id}/approve`, { method: 'PUT', body: JSON.stringify(d) })
export const rejectRequest      = (id, d)  => request(`/api/v1/approvals/${id}/reject`, { method: 'PUT', body: JSON.stringify(d) })

// Email Templates
export const getEmailTemplates  = ()       => request('/api/v1/email/templates')
export const createEmailTemplate= (d)      => request('/api/v1/email/templates', { method: 'POST', body: JSON.stringify(d) })
export const deleteEmailTemplate= (id)     => request(`/api/v1/email/templates/${id}`, { method: 'DELETE' })

// Bulk Email
export const bulkEmailPreview   = (d)      => request('/api/v1/email/bulk-preview', { method: 'POST', body: JSON.stringify(d) })
export const bulkEmailSend      = (d)      => request('/api/v1/email/bulk-send',    { method: 'POST', body: JSON.stringify(d) })
export const getBulkEmailJobs   = ()       => request('/api/v1/email/bulk-jobs')
export const getBulkEmailJob    = (id)     => request(`/api/v1/email/bulk-jobs/${id}`)
export const resendFailedEmails = (id)     => request(`/api/v1/email/bulk-jobs/${id}/resend-failed`, { method: 'POST' })

// Audit
export const getAudit           = (type, id) => request(`/api/v1/audit?objectType=${type}&objectId=${id}`)

// Import
export const getImportJobs      = ()       => request('/api/v1/import/jobs')
export const startImport        = (d)      => request('/api/v1/import/start', { method: 'POST', body: JSON.stringify(d) })

// Schema — objects & fields
export const getSchemaObjects   = ()          => request('/api/v1/schema/objects')
export const getSchemaFields    = (obj)       => request(`/api/v1/schema/fields?objectName=${obj}`)
export const createSchemaField  = (d)         => request('/api/v1/schema/fields', { method: 'POST', body: JSON.stringify(d) })
export const getPicklists       = (obj, f)    => request(`/api/v1/schema/picklists?objectName=${obj}&fieldName=${f}`)
export const updatePicklistValue= (id, d)     => request(`/api/v1/schema/picklists/${id}`, { method: 'PUT', body: JSON.stringify(d) })
// Schema — layouts
export const getLayouts         = (obj)       => request(`/api/v1/schema/layouts?objectName=${obj}`)
export const getLayout          = (id)        => request(`/api/v1/schema/layouts/${id}`)
export const updateLayout       = (id, d)     => request(`/api/v1/schema/layouts/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const deleteLayout       = (id)        => request(`/api/v1/schema/layouts/${id}`, { method: 'DELETE' })
export const createLayout       = (d)         => request('/api/v1/schema/layouts', { method: 'POST', body: JSON.stringify(d) })
export const cloneLayout        = (id, d)     => request(`/api/v1/schema/layouts/${id}/clone`, { method: 'POST', body: JSON.stringify(d) })
// Schema — list views
export const getListViews       = (obj)       => request(`/api/v1/schema/list-views?objectName=${obj}`)
export const createListView     = (d)         => request('/api/v1/schema/list-views', { method: 'POST', body: JSON.stringify(d) })
export const updateListView     = (id, d)     => request(`/api/v1/schema/list-views/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const deleteListView     = (id)        => request(`/api/v1/schema/list-views/${id}`, { method: 'DELETE' })
// Schema — permissions
export const getPermissions     = (role, obj) => request(`/api/v1/schema/permissions?role=${role}&objectName=${obj}`)

// Validation Rules
export const getValidationRules = ()       => request('/api/v1/validation-rules')
export const createValidationRule=(d)      => request('/api/v1/validation-rules', { method: 'POST', body: JSON.stringify(d) })
export const toggleValidationRule=(id)     => request(`/api/v1/validation-rules/${id}/toggle`, { method: 'POST' })
export const testValidationRule = (d)      => request('/api/v1/validation-rules/test', { method: 'POST', body: JSON.stringify(d) })
export const deleteValidationRule=(id)     => request(`/api/v1/validation-rules/${id}`, { method: 'DELETE' })

// Flows
export const getFlows           = ()       => request('/api/v1/flows')
export const getFlow            = (id)     => request(`/api/v1/flows/${id}`)
export const createFlow         = (d)      => request('/api/v1/flows', { method: 'POST', body: JSON.stringify(d) })
export const deleteFlow         = (id)     => request(`/api/v1/flows/${id}`, { method: 'DELETE' })
export const activateFlow       = (id)     => request(`/api/v1/flows/${id}/activate`, { method: 'PUT' })
export const deactivateFlow     = (id)     => request(`/api/v1/flows/${id}/deactivate`, { method: 'PUT' })
export const executeFlow        = (id, d)  => request(`/api/v1/flows/${id}/execute`, { method: 'POST', body: JSON.stringify(d) })
export const getRecentExecutions= ()       => request('/api/v1/flows/executions/recent')
export const getFlowNodeTypes   = ()       => request('/api/v1/flows/node-types')

// Reports & Dashboards
export const getReports         = ()       => request('/api/v1/reports')
export const executeReport      = (d)      => request('/api/v1/reports/execute', { method: 'POST', body: JSON.stringify(d) })
export const createReport       = (d)      => request('/api/v1/reports', { method: 'POST', body: JSON.stringify(d) })
export const getDashboards      = ()       => request('/api/v1/dashboards')
export const getDashboard       = (id)     => request(`/api/v1/dashboards/${id}`)
export const createDashboard    = (d)      => request('/api/v1/dashboards', { method: 'POST', body: JSON.stringify(d) })
export const updateDashboard    = (id, d)  => request(`/api/v1/dashboards/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const deleteDashboard    = (id)     => request(`/api/v1/dashboards/${id}`, { method: 'DELETE' })
export const getWidgetData      = (d)      => request('/api/v1/dashboards/widget-data', { method: 'POST', body: JSON.stringify(d) })
export const getBulkWidgetData  = (d)      => request('/api/v1/dashboards/bulk-widget-data', { method: 'POST', body: JSON.stringify(d) })

// Billing & Tenant
export const getTenant          = ()       => request('/api/v1/tenants/me')
export const updateTenant       = (d)      => request('/api/v1/tenants/me', { method: 'PUT', body: JSON.stringify(d) })
export const getBillingPlans    = ()       => request('/api/v1/billing/plans')
export const getBillingSubscription = ()   => request('/api/v1/billing/subscription')
export const getBillingInvoices = ()       => request('/api/v1/billing/invoices')
export const createOrder        = (d)      => request('/api/v1/billing/create-order', { method: 'POST', body: JSON.stringify(d) })
export const verifyPayment      = (d)      => request('/api/v1/billing/verify-payment', { method: 'POST', body: JSON.stringify(d) })

// Security & Settings
export const getDomainInfo      = ()       => request('/api/v1/domains/info')
export const setCustomDomain    = (d)      => request('/api/v1/domains/custom', { method: 'PUT', body: JSON.stringify(d) })
export const verifyDomain       = ()       => request('/api/v1/domains/verify', { method: 'POST' })
export const getPasswordPolicy  = ()       => request('/api/v1/security/password-policy')
export const updatePasswordPolicy=(d)      => request('/api/v1/security/password-policy', { method: 'PUT', body: JSON.stringify(d) })
export const getIpRestrictions  = ()       => request('/api/v1/security/ip-restrictions')
export const addIpRestriction   = (d)      => request('/api/v1/security/ip-restrictions', { method: 'POST', body: JSON.stringify(d) })
export const getSSOProviders    = ()       => request('/api/v1/security/sso-providers')
export const getDelegatedAdmins = ()       => request('/api/v1/security/delegated-admins')
export const addDelegatedAdmin  = (d)      => request('/api/v1/security/delegated-admins', { method: 'POST', body: JSON.stringify(d) })
export const removeDelegatedAdmin=(id)     => request(`/api/v1/security/delegated-admins/${id}`, { method: 'DELETE' })
export const getStorage         = ()       => request('/api/v1/security/storage')
export const getLetterheads     = ()       => request('/api/v1/security/letterheads')
export const addLetterhead      = (d)      => request('/api/v1/security/letterheads', { method: 'POST', body: JSON.stringify(d) })
export const getPreferences     = ()       => request('/api/v1/platform/preferences')
export const updatePreferences  = (d)      => request('/api/v1/platform/preferences', { method: 'PUT', body: JSON.stringify(d) })

// Sales
export const getTerritories     = ()       => request('/api/v1/sales/territories')
export const createTerritory    = (d)      => request('/api/v1/sales/territories', { method: 'POST', body: JSON.stringify(d) })
export const getForecastPeriods = ()       => request('/api/v1/sales/forecast/periods')
export const createForecastPeriod=(d)      => request('/api/v1/sales/forecast/periods', { method: 'POST', body: JSON.stringify(d) })
export const getForecastRollup  = (id)     => request(`/api/v1/sales/forecast/rollup?periodId=${id}`)

// Knowledge Base
export const getKBArticles      = (q='')   => request(`/api/v1/knowledge/kb/articles?${q}`)
export const getKBCategories    = ()       => request('/api/v1/knowledge/kb/categories')
export const createKBArticle    = (d)      => request('/api/v1/knowledge/kb/articles', { method: 'POST', body: JSON.stringify(d) })
export const voteKBArticle      = (id, d)  => request(`/api/v1/knowledge/kb/articles/${id}/vote`, { method: 'POST', body: JSON.stringify(d) })

// Scheduler / Triggers
export const getScheduler       = ()       => request('/api/v1/scheduler')
export const runSchedulerJob    = (d)      => request('/api/v1/scheduler/run', { method: 'POST', body: JSON.stringify(d) })
export const toggleSchedulerJob = (d)      => request('/api/v1/scheduler/toggle', { method: 'POST', body: JSON.stringify(d) })
export const recalculateTriggers= ()       => request('/api/v1/triggers/recalculate', { method: 'POST' })

// Notifications
export const getNotifications   = (q='')   => request(`/api/v1/notifications?${q}`)
export const markNotificationRead=(id)     => request(`/api/v1/notifications/${id}/read`, { method: 'PUT' })
export const markAllRead        = ()       => request('/api/v1/notifications/read-all', { method: 'PUT' })

// Activities & Notes
export const getActivities      = (type, id) => request(`/api/v1/activities?objectType=${type}&objectId=${id}`)
export const createActivity     = (d)      => request('/api/v1/activities', { method: 'POST', body: JSON.stringify(d) })
export const completeActivity   = (id)     => request(`/api/v1/activities/${id}/complete`, { method: 'PUT' })
export const getNotes           = (type, id) => request(`/api/v1/activities/notes?objectType=${type}&objectId=${id}`)
export const createNote         = (d)      => request('/api/v1/activities/notes', { method: 'POST', body: JSON.stringify(d) })

// Attachments
export const getAttachments     = (type, id) => request(`/api/v1/attachments?objectType=${type}&objectId=${id}`)

// Export
export const exportData = (type) => fetch(`/api/v1/export/${type}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.blob())

// Admin
export const adminLogin        = (d)      => fetch('/api/v1/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json())
export const getAdminDashboard = ()       => request('/api/v1/admin/dashboard')
export const getAdminTenants   = (q='')   => request(`/api/v1/admin/tenants?${q}`)
export const getAdminTenant    = (id)     => request(`/api/v1/admin/tenants/${id}`)
export const updateAdminTenant = (id, d)  => request(`/api/v1/admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const suspendTenant     = (id)     => request(`/api/v1/admin/tenants/${id}/suspend`, { method: 'POST' })
export const reactivateTenant  = (id)     => request(`/api/v1/admin/tenants/${id}/reactivate`, { method: 'POST' })
export const getFeatureFlags   = ()       => request('/api/v1/admin/feature-flags')
export const updateFeatureFlag = (name, d)=> request(`/api/v1/admin/feature-flags/${name}`, { method: 'PUT', body: JSON.stringify(d) })
export const getAdminAnnouncements=()     => request('/api/v1/admin/announcements')
export const createAnnouncement= (d)      => request('/api/v1/admin/announcements', { method: 'POST', body: JSON.stringify(d) })
export const getAdminTickets   = (q='')   => request(`/api/v1/admin/tickets?${q}`)
export const getAdminTicket    = (id)     => request(`/api/v1/admin/tickets/${id}`)
export const replyToTicket     = (id, d)  => request(`/api/v1/admin/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify(d) })
export const getAdminMetrics   = ()       => request('/api/v1/admin/metrics')
export const getAdminTeam      = ()       => request('/api/v1/admin/team')
export const getRateLimits     = ()       => request('/api/v1/admin/rate-limits')
export const updateRateLimit   = (id, d)  => request(`/api/v1/admin/rate-limits/${id}`, { method: 'PUT', body: JSON.stringify(d) })

export { downloadCSV } from './export'

// Expenses
export const getExpenses       = (q='')   => request(`/api/v1/expenses?${q}`)
export const createExpense     = (d)      => request('/api/v1/expenses', { method: 'POST', body: JSON.stringify(d) })
export const getExpenseRollup  = (q='')   => request(`/api/v1/expenses/rollup?${q}`)

// Saved Views & Kanban
export const getViews          = (type)   => request(`/api/v1/views?objectType=${type}`)
export const createView        = (d)      => request('/api/v1/views', { method: 'POST', body: JSON.stringify(d) })
export const applyView         = (d)      => request('/api/v1/views/apply', { method: 'POST', body: JSON.stringify(d) })
export const inlineEdit        = (d)      => request('/api/v1/views/inline-edit', { method: 'PUT', body: JSON.stringify(d) })
export const getKanban         = (type, groupBy) => request(`/api/v1/views/kanban?objectType=${type}&groupBy=${groupBy}`)
export const moveKanban        = (d)      => request('/api/v1/views/kanban/move', { method: 'PUT', body: JSON.stringify(d) })

// Additional AI Agents
export const getResumeAnalysis   = (d)    => request('/api/v1/agents/resume', { method: 'POST', body: JSON.stringify(d) })
export const getJobIntel         = (d)    => request('/api/v1/agents/job-intel', { method: 'POST', body: JSON.stringify(d) })
export const getStudentPerfAI    = (d)    => request('/api/v1/agents/student-performance', { method: 'POST', body: JSON.stringify(d) })
export const getDailyAnalyticsAI = ()     => request('/api/v1/agents/daily-analytics', { method: 'POST', body: JSON.stringify({}) })

// Platform extras
export const aiQuery               = (d)  => request('/api/v1/platform/ai-query', { method: 'POST', body: JSON.stringify(d) })
export const getExternalConnections= ()   => request('/api/v1/platform/external-connections')
export const createExternalConn    = (d)  => request('/api/v1/platform/external-connections', { method: 'POST', body: JSON.stringify(d) })
export const syncExternalConn      = (id) => request(`/api/v1/platform/external-connections/${id}/sync`, { method: 'POST' })
export const getPlatformReleases   = ()   => request('/api/v1/platform/releases')
export const configureSlack        = (d)  => request('/api/v1/platform/slack/configure', { method: 'POST', body: JSON.stringify(d) })

// Forecast quotas & entries
export const getForecastQuotas  = (periodId) => request(`/api/v1/sales/forecast/quotas?periodId=${periodId}`)
export const setForecastQuota   = (d)        => request('/api/v1/sales/forecast/quotas', { method: 'POST', body: JSON.stringify(d) })
export const submitForecastEntry= (d)        => request('/api/v1/sales/forecast/entries', { method: 'POST', body: JSON.stringify(d) })

// Tenant users & invite
export const getTenantUsers    = ()       => request('/api/v1/tenants/users')
export const inviteUser        = (d)      => request('/api/v1/tenants/invite', { method: 'POST', body: JSON.stringify(d) })

// Additional security
export const getLoginHours     = ()       => request('/api/v1/security/login-hours')
export const setLoginHours     = (d)      => request('/api/v1/security/login-hours/bulk', { method: 'POST', body: JSON.stringify(d) })
export const validatePassword  = (d)      => request('/api/v1/security/password-policy/validate', { method: 'POST', body: JSON.stringify(d) })

// Import field map
export const getImportFields   = (obj)    => request(`/api/v1/import/fields/${obj}`)
export const getImportJob      = (id)     => request(`/api/v1/import/jobs/${id}`)

// Admin extras
export const upgradeTenant     = (id, d)  => request(`/api/v1/admin/tenants/${id}/upgrade`, { method: 'POST', body: JSON.stringify(d) })
export const wipeTenantData    = (id)     => request(`/api/v1/admin/tenants/${id}/data`, { method: 'DELETE' })
export const enableFlagForTenant=(flag,d) => request(`/api/v1/admin/feature-flags/tenant`, { method: 'POST', body: JSON.stringify({flag, ...d}) })

// Activities completion
export const completeActivityById = (id)  => request(`/api/v1/activities/${id}/complete`, { method: 'PUT' })

// Branding
export const updateBranding    = (d)      => request('/api/v1/domains/branding', { method: 'PUT', body: JSON.stringify(d) })
export const getOnboarding     = ()       => request('/api/v1/domains/onboarding')

// Health & Tenant Info
export const getHealth     = ()  => request('/api/v1/health')
export const getTenantInfo = ()  => request('/api/v1/tenant-info')

// Profiles & Permission Sets
export const getProfiles              = ()       => request('/api/v1/profiles')
export const createProfile            = (d)      => request('/api/v1/profiles', { method: 'POST', body: JSON.stringify(d) })
export const deleteProfile            = (id)     => request(`/api/v1/profiles/${id}`, { method: 'DELETE' })
export const cloneProfile             = (id, d)  => request(`/api/v1/profiles/${id}/clone`, { method: 'POST', body: JSON.stringify(d) })
export const getProfileUsers          = (id)     => request(`/api/v1/profiles/${id}/users`)
export const getObjectPermissions     = (profileId) => request(`/api/v1/profiles/object-permissions?profileId=${profileId}`)
export const bulkSetObjectPermissions = (d)      => request('/api/v1/profiles/object-permissions/bulk', { method: 'POST', body: JSON.stringify(d) })
export const getFieldPermissions      = (profileId, objectName) => request(`/api/v1/profiles/field-permissions?profileId=${profileId}&objectName=${objectName}`)
export const bulkSetFieldPermissions  = (d)      => request('/api/v1/profiles/field-permissions/bulk', { method: 'POST', body: JSON.stringify(d) })
export const getTabPermissions        = (profileId) => request(`/api/v1/profiles/tab-permissions?profileId=${profileId}`)
export const setTabPermission         = (d)      => request('/api/v1/profiles/tab-permissions', { method: 'POST', body: JSON.stringify(d) })
export const getPermissionSets        = ()       => request('/api/v1/profiles/permission-sets')
export const createPermissionSet      = (d)      => request('/api/v1/profiles/permission-sets', { method: 'POST', body: JSON.stringify(d) })
export const deletePermissionSet      = (id)     => request(`/api/v1/profiles/permission-sets/${id}`, { method: 'DELETE' })
export const getPermSetObjectPerms    = (id)     => request(`/api/v1/profiles/permission-sets/${id}/objects`)
export const setPermSetObjectPerm     = (id, d)  => request(`/api/v1/profiles/permission-sets/${id}/objects`, { method: 'POST', body: JSON.stringify(d) })
export const getAvailableObjects      = ()       => request('/api/v1/profiles/meta/objects')
export const getAvailableTabs         = ()       => request('/api/v1/profiles/meta/tabs')
export const searchProfileUsers       = (q)      => request(`/api/v1/profiles/users/search?q=${encodeURIComponent(q)}`)
export const addUsersToProfile        = (id, userIds) => request(`/api/v1/profiles/${id}/users`, { method: 'POST', body: JSON.stringify({ userIds }) })
export const removeUserFromProfile    = (id, userId)  => request(`/api/v1/profiles/${id}/users/${userId}`, { method: 'DELETE' })

export default { get, post, put, delete: del }
