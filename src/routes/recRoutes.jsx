import { lazy } from 'react'
import { Route } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { DynamicList, DynamicDetail } from '../components/dynamic'
import RecordDetail from '../components/RecordDetail'

const RecDashboard      = lazy(() => import('../pages/rec/Dashboard'))
const AddSubmissionPage = lazy(() => import('../pages/rec/AddSubmissionPage'))
const AddInterviewPage  = lazy(() => import('../pages/rec/AddInterviewPage'))
const RecruiterJobsPage = lazy(() => import('../pages/rec/RecruiterJobsPage'))

export const REC_SECTIONS = [
  { section: 'Overview', items: [
    { to: '/rec', label: 'Dashboard', icon: 'dashboard' },
  ]},
  { section: 'CRM', items: [
    { to: '/rec/students',    label: 'My Students', icon: 'users' },
    { to: '/rec/submissions', label: 'Submissions', icon: 'file' },
    { to: '/rec/interviews',  label: 'Interviews',  icon: 'calendar' },
  ]},
  { section: 'Jobs', items: [
    { to: '/rec/jobs', label: 'Job Matches', icon: 'briefcase' },
  ]},
  { section: 'Actions', items: [
    { to: '/rec/submit',        label: 'Add Submission', icon: 'file' },
    { to: '/rec/add-interview', label: 'Add Interview',  icon: 'calendar' },
  ]},
]

export const RecRoutes = (
  <>
    <Route element={<AppLayout sections={REC_SECTIONS} basePath="/rec" allowedRoles={['RECRUITER']} />}>
      <Route path="/rec" element={<RecDashboard />} />
      <Route path="/rec/jobs" element={<RecruiterJobsPage />} />

      {/* CRM lists — backend filters to this recruiter's students automatically */}
      <Route path="/rec/students"        element={<DynamicList objectName="students"    basePath="/rec/students" />} />
      <Route path="/rec/students/:id"    element={<DynamicDetail objectName="students"  basePath="/rec/students" />} />
      <Route path="/rec/submissions"     element={<DynamicList objectName="submissions"    basePath="/rec/submissions" />} />
      <Route path="/rec/submissions/:id" element={<DynamicDetail objectName="submissions"  basePath="/rec/submissions" />} />
      <Route path="/rec/interviews"      element={<DynamicList objectName="interviews"    basePath="/rec/interviews" />} />
      <Route path="/rec/interviews/:id"  element={<DynamicDetail objectName="interviews"  basePath="/rec/interviews" />} />

      {/* Add submission / interview forms */}
      <Route path="/rec/submit"        element={<AddSubmissionPage />} />
      <Route path="/rec/add-interview" element={<AddInterviewPage />} />

      {/* Generic dynamic list + detail — config-driven sidebar links and related-list clicks */}
      <Route path="/rec/dynamic/:objectName"     element={<DynamicList   basePath="/rec/dynamic" />} />
      <Route path="/rec/dynamic/:objectName/:id" element={<DynamicDetail basePath="/rec/dynamic" />} />

      {/* Legacy record route */}
      <Route path="/rec/records/:type/:id" element={<RecordDetail objectType="" basePath="/rec" />} />
    </Route>
  </>
)
