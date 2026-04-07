import { lazy } from 'react'
import { Route } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { DynamicList, DynamicDetail } from '../components/dynamic'

const StuDashboard   = lazy(() => import('../pages/stu/Dashboard'))
const StuProfilePage = lazy(() => import('../pages/stu/StuProfilePage'))
const TrainingPage   = lazy(() => import('../pages/stu/TrainingPage'))
const StudentJobsPage = lazy(() => import('../pages/stu/StudentJobsPage'))

export const STU_SECTIONS = [
  { section: 'Overview', items: [
    { to: '/stu', label: 'Dashboard', icon: 'dashboard' },
  ]},
  { section: 'My Data', items: [
    { to: '/stu/profile',      label: 'My Profile',      icon: 'users' },
    { to: '/stu/submissions',  label: 'My Submissions',  icon: 'file' },
    { to: '/stu/interviews',   label: 'My Interviews',   icon: 'calendar' },
    { to: '/stu/training',     label: 'Training',        icon: 'student' },
  ]},
  { section: 'Jobs', items: [
    { to: '/stu/jobs', label: 'Job Opportunities', icon: 'briefcase' },
  ]},
]

export const StuRoutes = (
  <>
    <Route element={<AppLayout sections={STU_SECTIONS} basePath="/stu" allowedRoles={['STUDENT']} />}>
      <Route path="/stu" element={<StuDashboard />} />

      {/* Profile — redirects to student's own DynamicDetail */}
      <Route path="/stu/profile" element={<StuProfilePage />} />

      {/* Dynamic student detail — target of the profile redirect */}
      <Route path="/stu/dynamic/students/:id" element={<DynamicDetail objectName="students" basePath="/stu/profile" />} />

      {/* Submissions / Interviews — backend filters to student's own records */}
      <Route path="/stu/submissions"     element={<DynamicList objectName="submissions"   basePath="/stu/submissions" />} />
      <Route path="/stu/submissions/:id" element={<DynamicDetail objectName="submissions" basePath="/stu/submissions" />} />
      <Route path="/stu/interviews"      element={<DynamicList objectName="interviews"    basePath="/stu/interviews" />} />
      <Route path="/stu/interviews/:id"  element={<DynamicDetail objectName="interviews"  basePath="/stu/interviews" />} />

      {/* Jobs */}
      <Route path="/stu/jobs" element={<StudentJobsPage />} />

      {/* Training */}
      <Route path="/stu/training" element={<TrainingPage />} />
    </Route>
  </>
)
