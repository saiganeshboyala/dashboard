import { lazy } from 'react'
import { Route } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { DynamicList, DynamicDetail } from '../components/dynamic'
import RecordDetail from '../components/RecordDetail'

const BUDashboard = lazy(() => import('../pages/bu/Dashboard'))

export const BU_SECTIONS = [
  { section: 'Overview', items: [
    { to: '/bu', label: 'Dashboard', icon: 'dashboard' },
  ]},
  { section: 'CRM', items: [
    { to: '/bu/students',    label: 'Students',    icon: 'users' },
    { to: '/bu/submissions', label: 'Submissions', icon: 'file' },
    { to: '/bu/interviews',  label: 'Interviews',  icon: 'calendar' },
    { to: '/bu/recruiters',  label: 'Recruiters',  icon: 'recruiter' },
  ]},
]

export const BURoutes = (
  <>
    <Route element={<AppLayout sections={BU_SECTIONS} basePath="/bu" allowedRoles={['BU_ADMIN']} />}>
      <Route path="/bu" element={<BUDashboard />} />

      {/* CRM lists — backend filters to this BU automatically */}
      <Route path="/bu/students"        element={<DynamicList objectName="students"    basePath="/bu/students" />} />
      <Route path="/bu/students/:id"    element={<DynamicDetail objectName="students"  basePath="/bu/students" />} />
      <Route path="/bu/submissions"     element={<DynamicList objectName="submissions"    basePath="/bu/submissions" />} />
      <Route path="/bu/submissions/:id" element={<DynamicDetail objectName="submissions"  basePath="/bu/submissions" />} />
      <Route path="/bu/interviews"      element={<DynamicList objectName="interviews"    basePath="/bu/interviews" />} />
      <Route path="/bu/interviews/:id"  element={<DynamicDetail objectName="interviews"  basePath="/bu/interviews" />} />
      <Route path="/bu/recruiters"      element={<DynamicList objectName="recruiters"    basePath="/bu/recruiters" />} />
      <Route path="/bu/recruiters/:id"  element={<DynamicDetail objectName="recruiters"  basePath="/bu/recruiters" />} />

      {/* Generic dynamic list + detail — config-driven sidebar links and related-list clicks */}
      <Route path="/bu/dynamic/:objectName"     element={<DynamicList   basePath="/bu/dynamic" />} />
      <Route path="/bu/dynamic/:objectName/:id" element={<DynamicDetail basePath="/bu/dynamic" />} />

      {/* Legacy record route */}
      <Route path="/bu/records/:type/:id" element={<RecordDetail objectType="" basePath="/bu" />} />
    </Route>
  </>
)
