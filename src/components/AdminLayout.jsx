import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminLogout, getAdminToken } from '../utils/auth'
import { Navigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Flag, Megaphone, TicketCheck, BarChart3, Users, Sliders, Shield, LogOut } from 'lucide-react'

const NAV = [
  { to: '/admin',             label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/admin/tenants',     label: 'Tenants',       icon: Building2 },
  { to: '/admin/tickets',     label: 'Tickets',       icon: TicketCheck },
  { to: '/admin/feature-flags',label:'Feature Flags', icon: Flag },
  { to: '/admin/announcements',label:'Announcements', icon: Megaphone },
  { to: '/admin/metrics',     label: 'Metrics',       icon: BarChart3 },
  { to: '/admin/team',        label: 'Team',          icon: Users },
  { to: '/admin/rate-limits', label: 'Rate Limits',   icon: Sliders },
]

export default function AdminLayout() {
  const token = getAdminToken()
  if (!token) return <Navigate to="/admin/login" replace />

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-slate-950 flex flex-col fixed top-0 bottom-0 left-0 z-50 border-r border-white/5">
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500/30 flex items-center justify-center">
              <Shield size={15} className="text-red-400" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Platform Admin</p>
              <p className="text-[10px] text-gray-600">Super Admin Console</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all ${
                  isActive ? 'bg-red-500/15 text-red-400' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}>
              <Icon size={14} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-white/5">
          <button onClick={adminLogout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12.5px] text-gray-600 hover:text-red-400 hover:bg-white/5 transition-all">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
