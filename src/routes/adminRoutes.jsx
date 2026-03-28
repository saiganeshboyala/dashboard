import { Route } from 'react-router-dom'
import AdminLayout        from '../components/AdminLayout'
import AdminLogin         from '../pages/admin/AdminLogin'
import AdminDashboard     from '../pages/admin/AdminDashboard'
import TenantsPage        from '../pages/admin/TenantsPage'
import TenantDetail       from '../pages/admin/TenantDetail'
import FeatureFlagsPage   from '../pages/admin/FeatureFlagsPage'
import AnnouncementsPage  from '../pages/admin/AnnouncementsPage'
import TicketsPage        from '../pages/admin/TicketsPage'
import TicketDetail       from '../pages/admin/TicketDetail'
import MetricsPage        from '../pages/admin/MetricsPage'
import TeamPage           from '../pages/admin/TeamPage'
import RateLimitsPage     from '../pages/admin/RateLimitsPage'

export const AdminRoutes = (
  <>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index                    element={<AdminDashboard />} />
      <Route path="tenants"           element={<TenantsPage />} />
      <Route path="tenants/:id"       element={<TenantDetail />} />
      <Route path="feature-flags"     element={<FeatureFlagsPage />} />
      <Route path="announcements"     element={<AnnouncementsPage />} />
      <Route path="tickets"           element={<TicketsPage />} />
      <Route path="tickets/:id"       element={<TicketDetail />} />
      <Route path="metrics"           element={<MetricsPage />} />
      <Route path="team"              element={<TeamPage />} />
      <Route path="rate-limits"       element={<RateLimitsPage />} />
    </Route>
  </>
)
