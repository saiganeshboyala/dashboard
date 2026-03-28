import { useState, Suspense } from 'react'
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { getToken, getUser } from '../../../utils/auth'
import { Loading } from '../../../components/ui/Loading'
import { ErrorBoundary } from '../../../components/layout/ErrorBoundary'
import {
  ChevronDown, ChevronRight, ArrowLeft, Database, Settings, Users,
  Shield, Zap, Mail, Download, BarChart2, Cpu, Building, Search, X,
} from 'lucide-react'

// ─── Setup navigation tree ────────────────────────────────────────────────────

const NAV = [
  {
    label: 'Object Manager', icon: Database,
    items: [
      { label: 'All Objects',   to: '/head/setup/objects' },
      { label: 'Schema Map',    to: '/head/setup/schema-map' },
    ],
  },
  {
    label: 'Fields & Layouts', icon: Settings,
    items: [
      { label: 'Page Layouts',       to: '/head/setup/objects', note: 'pick object' },
      { label: 'Picklist Value Sets', to: '/head/setup/objects', note: 'pick object' },
    ],
  },
  {
    label: 'Users & Access', icon: Users,
    items: [
      { label: 'Profiles',                to: '/head/setup/profiles' },
      { label: 'Permission Sets',         to: '/head/setup/profiles' },
      { label: 'Users',                   to: '/head/invite' },
      { label: 'Invite Users',            to: '/head/invite' },
    ],
  },
  {
    label: 'Security', icon: Shield,
    items: [
      { label: 'Password Policies', to: '/head/settings' },
      { label: 'IP Restrictions',   to: '/head/settings' },
      { label: 'MFA Settings',      to: '/head/mfa' },
    ],
  },
  {
    label: 'Automation', icon: Zap,
    items: [
      { label: 'Validation Rules',    to: '/head/rules' },
      { label: 'Flows',               to: '/head/flows' },
      { label: 'Triggers & Rollups',  to: '/head/triggers' },
      { label: 'Approvals',           to: '/head/approvals' },
      { label: 'Notification Rules',  to: '/head/notifications' },
    ],
  },
  {
    label: 'Email', icon: Mail,
    items: [
      { label: 'Email Templates', to: '/head/email-templates' },
      { label: 'Bulk Email',      to: '/head/bulk-email' },
      { label: 'SMTP Settings',   to: '/head/settings' },
    ],
  },
  {
    label: 'Data', icon: Download,
    items: [
      { label: 'Import',      to: '/head/import' },
      { label: 'Export',      to: '/head/export' },
      { label: 'Audit Trail', to: '/head/audit' },
    ],
  },
  {
    label: 'Analytics', icon: BarChart2,
    items: [
      { label: 'Reports',    to: '/head/reports' },
      { label: 'Dashboards', to: '/head/dashboards' },
    ],
  },
  {
    label: 'Platform', icon: Cpu,
    items: [
      { label: 'Webhooks',     to: '/head/webhooks' },
      { label: 'Integrations', to: '/head/integrations' },
      { label: 'Audit Trail',  to: '/head/audit' },
    ],
  },
  {
    label: 'Company Info', icon: Building,
    items: [
      { label: 'Company Profile', to: '/head/settings' },
      { label: 'Billing',         to: '/head/billing' },
      { label: 'Branding',        to: '/head/settings' },
    ],
  },
]

// ─── Sidebar nav section ──────────────────────────────────────────────────────

function NavSection({ section, open, onToggle }) {
  const Icon = section.icon
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-gray-500 hover:text-gray-800 uppercase tracking-wider transition-colors"
      >
        <Icon size={12} className="shrink-0" />
        <span className="flex-1 text-left">{section.label}</span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && (
        <div className="ml-5 mb-1 border-l border-gray-200 pl-3 space-y-0.5">
          {section.items.map(item => (
            <NavLink
              key={item.label + item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-2 py-1.5 text-[12px] rounded transition-colors truncate ${
                  isActive
                    ? 'text-indigo-700 bg-indigo-50 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SetupLayout ──────────────────────────────────────────────────────────────

export default function SetupLayout() {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  const user = getUser()
  if (user?.role !== 'HEAD') return <Navigate to="/" replace />

  const navigate = useNavigate()
  const [openSections, setOpenSections] = useState(() => {
    const s = {}
    NAV.forEach((n, i) => { s[i] = i < 2 })
    return s
  })
  const [search, setSearch] = useState('')

  const toggle = (i) => setOpenSections(s => ({ ...s, [i]: !s[i] }))

  const q = search.trim().toLowerCase()
  const filtered = q
    ? NAV.flatMap(s => s.items.filter(it => it.label.toLowerCase().includes(q)).map(it => ({ ...it, section: s.label })))
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="w-[240px] shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-y-auto">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-200">
          <button
            onClick={() => navigate('/head')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-[11px] mb-3 transition-colors"
          >
            <ArrowLeft size={12} />
            Back to CRM
          </button>
          <div className="flex items-center gap-2">
            <Settings size={15} className="text-indigo-600" />
            <span className="text-gray-900 font-semibold text-[14px]">Setup</span>
          </div>
        </div>

        {/* Quick search */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Quick find..."
              className="w-full bg-gray-50 border border-gray-200 rounded text-[12px] text-gray-900 placeholder-gray-400 pl-7 pr-6 py-1.5 focus:outline-none focus:border-indigo-400 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5">
          {filtered ? (
            <div className="px-3 py-1 space-y-0.5">
              {filtered.length === 0 && (
                <p className="text-gray-400 text-[12px] px-2 py-2">No results</p>
              )}
              {filtered.map(item => (
                <div key={item.label + item.to}>
                  <p className="text-gray-400 text-[10px] px-2 mb-0.5">{item.section}</p>
                  <NavLink
                    to={item.to}
                    onClick={() => setSearch('')}
                    className="block px-2 py-1.5 text-[12px] rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    {item.label}
                  </NavLink>
                </div>
              ))}
            </div>
          ) : (
            NAV.map((section, i) => (
              <NavSection
                key={section.label}
                section={section}
                open={openSections[i]}
                onToggle={() => toggle(i)}
              />
            ))
          )}
        </nav>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <ErrorBoundary>
          <Suspense fallback={<Loading fullPage />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
