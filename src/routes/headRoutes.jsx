import { lazy } from 'react'
import { Route } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { DynamicList, DynamicDetail } from '../components/dynamic'
import RecordDetail from '../components/RecordDetail'
import SetupLayout from '../pages/head/setup/SetupLayout'

// Pages — lazy loaded for code splitting
const AIAnalyticsPage     = lazy(() => import('../pages/head/AIAnalyticsPage'))
const AIChatPage          = lazy(() => import('../pages/head/AIChatPage'))
const HeadDashboard       = lazy(() => import('../pages/head/Dashboard'))
const AnalyticsPage       = lazy(() => import('../pages/head/AnalyticsPage'))
const RuleBuilderPage     = lazy(() => import('../pages/head/RuleBuilderPage'))
const DashboardBuilderPage = lazy(() => import('../pages/head/DashboardBuilderPage'))
const LMSAdminPage        = lazy(() => import('../pages/head/LMSAdminPage'))
const ApprovalsPage       = lazy(() => import('../pages/head/ApprovalsPage'))
const CasesPage           = lazy(() => import('../pages/head/CasesPage'))
const CaseDetail          = lazy(() => import('../pages/head/CaseDetail'))
const CampaignsPage       = lazy(() => import('../pages/head/CampaignsPage'))
const CampaignDetail      = lazy(() => import('../pages/head/CampaignDetail'))
const KnowledgeBasePage   = lazy(() => import('../pages/head/KnowledgeBasePage'))
const TerritoriesPage     = lazy(() => import('../pages/head/TerritoriesPage'))
const ForecastingPage     = lazy(() => import('../pages/head/ForecastingPage'))
const EmailTemplatesPage  = lazy(() => import('../pages/head/EmailTemplatesPage'))
const ImportWizardPage    = lazy(() => import('../pages/head/ImportWizardPage'))
const SettingsPage        = lazy(() => import('../pages/head/SettingsPage'))
const BillingPage         = lazy(() => import('../pages/head/BillingPage'))
const TriggerConfigPage   = lazy(() => import('../pages/head/TriggerConfigPage'))
const AuditTrailPage      = lazy(() => import('../pages/head/AuditTrailPage'))
const SchemaAdminPage     = lazy(() => import('../pages/head/SchemaAdminPage'))
const ReportBuilderPage   = lazy(() => import('../pages/head/ReportBuilderPage'))
const FlowBuilderPage     = lazy(() => import('../pages/head/FlowBuilderPage'))
const ArticleEditor       = lazy(() => import('../pages/head/ArticleEditor'))
const NotificationsPage   = lazy(() => import('../pages/head/NotificationsPage'))
const WebhooksPage        = lazy(() => import('../pages/head/WebhooksPage'))
const AutomationPage      = lazy(() => import('../pages/head/AutomationPage'))
const MFAPage             = lazy(() => import('../pages/head/MFAPage'))
const ExportPage          = lazy(() => import('../pages/head/ExportPage'))
const ExpensesPage        = lazy(() => import('../pages/head/ExpensesPage'))
const IntegrationsPage    = lazy(() => import('../pages/head/IntegrationsPage'))
const DynamicRecordPage   = lazy(() => import('../pages/head/DynamicRecordPage'))
const DynamicListPage     = lazy(() => import('../pages/head/DynamicListPage'))
const ProfilesPage        = lazy(() => import('../pages/head/ProfilesPage'))
const ChangePasswordPage  = lazy(() => import('../pages/head/ChangePasswordPage'))
const InvitePage          = lazy(() => import('../pages/head/InvitePage'))
const BulkEmailPage       = lazy(() => import('../pages/head/BulkEmailPage'))
const CustomizePage       = lazy(() => import('../pages/head/customize/CustomizePage'))
// Setup pages
const SetupHomePage       = lazy(() => import('../pages/head/setup/SetupHomePage'))
const ObjectManagerPage   = lazy(() => import('../pages/head/setup/ObjectManagerPage'))
const ObjectDetailPage    = lazy(() => import('../pages/head/setup/ObjectDetailPage'))
const LayoutBuilderPage   = lazy(() => import('../pages/head/setup/LayoutBuilderPage'))
const ListViewBuilderPage = lazy(() => import('../pages/head/setup/ListViewBuilderPage'))
const SchemaMapPage       = lazy(() => import('../pages/head/setup/SchemaMapPage'))

export const HEAD_SECTIONS = [
  { section: 'Overview',   items: [
    { to: '/head',           label: 'Dashboard',  icon: 'dashboard' },
    { to: '/head/analytics', label: 'Analytics',  icon: 'chart' },
  ]},
  { section: 'AI & Analytics', items: [
    { to: '/head/ai-analytics', label: 'AI Analytics', icon: 'chart' },
    { to: '/head/ai-chat',      label: 'AI Chat',      icon: 'dashboard' },
  ]},
  { section: 'CRM', items: [      // populated dynamically from /api/v1/dynamic/config; these are fallbacks
    { to: '/head/students',    label: 'Students',       icon: 'users' },
    { to: '/head/submissions', label: 'Submissions',    icon: 'file' },
    { to: '/head/interviews',  label: 'Interviews',     icon: 'calendar' },
    { to: '/head/recruiters',  label: 'Recruiters',     icon: 'recruiter' },
    { to: '/head/bus',         label: 'Business Units', icon: 'building' },
    { to: '/head/clusters',    label: 'Clusters',       icon: 'users' },
  ]},
  { section: 'Sales',      items: [
    { to: '/head/leads',       label: 'Leads',       icon: 'users' },
    { to: '/head/campaigns',   label: 'Campaigns',   icon: 'clipboard' },
    { to: '/head/territories', label: 'Territories', icon: 'building' },
    { to: '/head/forecasting', label: 'Forecasting', icon: 'trending' },
  ]},
  { section: 'Automation', items: [
    { to: '/head/rules',         label: 'Validation Rules',   icon: 'clipboard' },
    { to: '/head/flows',         label: 'Flows',              icon: 'clipboard' },
    { to: '/head/dashboards',    label: 'Dashboards',         icon: 'chart' },
    { to: '/head/triggers',      label: 'Triggers & Rollups', icon: 'clipboard' },
    { to: '/head/approvals',     label: 'Approvals',          icon: 'briefcase' },
    { to: '/head/notifications', label: 'Notification Rules', icon: 'dashboard' },
  ]},
  { section: 'Support',    items: [
    { to: '/head/cases',     label: 'Cases',          icon: 'file' },
    { to: '/head/knowledge', label: 'Knowledge Base', icon: 'student' },
  ]},
  { section: 'Tools',      items: [
    { to: '/head/import',          label: 'Import',          icon: 'file' },
    { to: '/head/export',          label: 'Export',          icon: 'file' },
    { to: '/head/reports',         label: 'Reports',         icon: 'chart' },
    { to: '/head/email-templates', label: 'Email Templates', icon: 'file' },
    { to: '/head/bulk-email',     label: 'Bulk Email',      icon: 'mail' },
    { to: '/head/audit',           label: 'Audit Trail',     icon: 'calendar' },
    { to: '/head/webhooks',        label: 'Webhooks',        icon: 'clipboard' },
    { to: '/head/expenses',        label: 'Expenses',        icon: 'briefcase' },
    { to: '/head/integrations',    label: 'Integrations',    icon: 'chart' },
    { to: '/head/lms',             label: 'LMS Admin',       icon: 'student' },
  ]},
  { section: 'Settings',   items: [
    { to: '/head/customize',  label: 'Customize',             icon: 'settings' },
    { to: '/head/setup',      label: 'Setup',                 icon: 'settings' },
    { to: '/head/invite',     label: 'Invite Users',          icon: 'recruiter' },
    { to: '/head/schema',     label: 'Schema Admin',          icon: 'dashboard' },
    { to: '/head/profiles',   label: 'Profiles & Permissions',icon: 'recruiter' },
    { to: '/head/automation', label: 'Automation',            icon: 'clipboard' },
    { to: '/head/mfa',        label: 'MFA Security',          icon: 'briefcase' },
    { to: '/head/settings',   label: 'Settings',              icon: 'dashboard' },
    { to: '/head/billing',    label: 'Billing',               icon: 'briefcase' },
  ]},
  { section: 'Objects', collapsible: true, items: [] },  // populated dynamically, collapsed by default
]

export const HeadRoutes = (
  <>
    <Route element={<AppLayout sections={HEAD_SECTIONS} basePath="/head" allowedRoles={['HEAD']} />}>
      {/* Overview */}
      <Route path="/head"           element={<HeadDashboard />} />
      <Route path="/head/analytics" element={<AnalyticsPage />} />

      {/* AI & Analytics */}
      <Route path="/head/ai-analytics" element={<AIAnalyticsPage />} />
      <Route path="/head/ai-chat"      element={<AIChatPage />} />

      {/* CRM — dynamic list + detail */}
      <Route path="/head/students"         element={<DynamicList objectName="students"       basePath="/head/students" />} />
      <Route path="/head/students/:id"     element={<DynamicDetail objectName="students"     basePath="/head/students" />} />
      <Route path="/head/submissions"      element={<DynamicList objectName="submissions"    basePath="/head/submissions" />} />
      <Route path="/head/submissions/:id"  element={<DynamicDetail objectName="submissions"  basePath="/head/submissions" />} />
      <Route path="/head/interviews"       element={<DynamicList objectName="interviews"     basePath="/head/interviews" />} />
      <Route path="/head/interviews/:id"   element={<DynamicDetail objectName="interviews"   basePath="/head/interviews" />} />
      <Route path="/head/recruiters"       element={<DynamicList objectName="recruiters"     basePath="/head/recruiters" />} />
      <Route path="/head/recruiters/:id"   element={<DynamicDetail objectName="recruiters"   basePath="/head/recruiters" />} />
      <Route path="/head/bus"              element={<DynamicList objectName="business_units" basePath="/head/bus" />} />
      <Route path="/head/bus/:id"          element={<DynamicDetail objectName="business_units" basePath="/head/bus" />} />
      <Route path="/head/clusters"         element={<DynamicList objectName="clusters"       basePath="/head/clusters" />} />
      <Route path="/head/clusters/:id"     element={<DynamicDetail objectName="clusters"     basePath="/head/clusters" />} />

      {/* Sales */}
      <Route path="/head/leads"            element={<DynamicList objectName="leads"          basePath="/head/leads" />} />
      <Route path="/head/leads/:id"        element={<DynamicDetail objectName="leads"        basePath="/head/leads" />} />
      <Route path="/head/campaigns"        element={<CampaignsPage />} />
      <Route path="/head/campaigns/:id"    element={<CampaignDetail />} />
      <Route path="/head/territories"      element={<TerritoriesPage />} />
      <Route path="/head/forecasting"      element={<ForecastingPage />} />

      {/* Dynamic object browser */}
      <Route path="/head/dynamic/:objectName/:id" element={<DynamicRecordPage />} />
      <Route path="/head/dynamic/:objectName"     element={<DynamicListPage />} />

      {/* Automation */}
      <Route path="/head/rules"         element={<RuleBuilderPage />} />
      <Route path="/head/flows"         element={<FlowBuilderPage />} />
      <Route path="/head/flows/:id"     element={<FlowBuilderPage />} />
      <Route path="/head/dashboards"    element={<DashboardBuilderPage />} />
      <Route path="/head/triggers"      element={<TriggerConfigPage />} />
      <Route path="/head/approvals"     element={<ApprovalsPage />} />
      <Route path="/head/notifications" element={<NotificationsPage />} />

      {/* Support */}
      <Route path="/head/cases"         element={<CasesPage />} />
      <Route path="/head/cases/:id"     element={<CaseDetail />} />
      <Route path="/head/knowledge"     element={<KnowledgeBasePage />} />
      <Route path="/head/knowledge/:id" element={<ArticleEditor />} />

      {/* Tools */}
      <Route path="/head/import"          element={<ImportWizardPage />} />
      <Route path="/head/export"          element={<ExportPage />} />
      <Route path="/head/reports"         element={<ReportBuilderPage />} />
      <Route path="/head/email-templates" element={<EmailTemplatesPage />} />
      <Route path="/head/bulk-email"     element={<BulkEmailPage />} />
      <Route path="/head/audit"           element={<AuditTrailPage />} />
      <Route path="/head/webhooks"        element={<WebhooksPage />} />
      <Route path="/head/expenses"        element={<ExpensesPage />} />
      <Route path="/head/integrations"    element={<IntegrationsPage />} />
      <Route path="/head/lms"             element={<LMSAdminPage />} />

      {/* Customize (Visual Builder) */}
      <Route path="/head/customize"  element={<CustomizePage />} />

      {/* Settings */}
      <Route path="/head/invite"     element={<InvitePage />} />
      <Route path="/head/schema"     element={<SchemaAdminPage />} />
      <Route path="/head/profiles"         element={<ProfilesPage />} />
      <Route path="/head/change-password"  element={<ChangePasswordPage />} />
      <Route path="/head/automation" element={<AutomationPage />} />
      <Route path="/head/mfa"        element={<MFAPage />} />
      <Route path="/head/settings"   element={<SettingsPage />} />
      <Route path="/head/billing"    element={<BillingPage />} />

      {/* Legacy record route */}
      <Route path="/head/records/:type/:id" element={<RecordDetail objectType="" basePath="/head" />} />
    </Route>

    {/* ── Setup — uses its own SetupLayout with tree sidebar ── */}
    <Route element={<SetupLayout />}>
      <Route path="/head/setup"                                                element={<SetupHomePage />} />
      <Route path="/head/setup/objects"                                        element={<ObjectManagerPage />} />
      <Route path="/head/setup/objects/:objectName"                            element={<ObjectDetailPage />} />
      <Route path="/head/setup/objects/:objectName/layouts/:layoutId"          element={<LayoutBuilderPage />} />
      <Route path="/head/setup/objects/:objectName/list-views/:viewId"         element={<ListViewBuilderPage />} />
      <Route path="/head/setup/schema-map"                                     element={<SchemaMapPage />} />
      <Route path="/head/setup/profiles"                                       element={<ProfilesPage />} />
    </Route>
  </>
)
