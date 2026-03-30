import { useState, Suspense, useMemo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'
import OfflineBanner from './OfflineBanner'
import GlobalSearch from '../GlobalSearch'
import SessionTimeoutModal from './SessionTimeoutModal'
import { getToken, getUser, getHomePath } from '../../utils/auth'
import { Loading } from '../ui/Loading'
import { useAppConfig } from '../../context/AppConfigContext'

/**
 * Shared authenticated layout — wraps HEAD / BU / REC / STU sections.
 *
 * Desktop: fixed 220px sidebar always visible, content has ml-[220px] (via Page.jsx).
 * Mobile:  hidden sidebar drawer toggled by hamburger in the top bar.
 *          Content gets pt-12 to clear the 48px mobile top bar.
 *
 * allowedRoles — if provided, users with a different role are redirected to their home.
 */
export default function AppLayout({ sections, basePath = '/head', allowedRoles }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { config } = useAppConfig()

  // Merge static sections with dynamic objects from config.
  // If there is a section named "Objects", replace its items with config-driven items.
  // Must be before early returns to satisfy Rules of Hooks.
  const effectiveSections = useMemo(() => {
    if (!config?.objects?.length) return sections

    const dynamicItems = config.objects.map(obj => ({
      to:    `${basePath}/dynamic/${obj.name}`,
      label: obj.pluralLabel || obj.label,
      icon:  obj.icon || 'users',
    }))

    return sections.map(s => {
      if (s.section === 'CRM')     return { ...s, items: dynamicItems }
      if (s.section === 'Objects') return { ...s, items: dynamicItems }
      return s
    })
  }, [sections, config, basePath])

  const token = getToken()
  if (!token) return <Navigate to="/login" replace />

  const user = getUser()
  if (allowedRoles?.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getHomePath()} replace />
  }

  return (
    <>
      <OfflineBanner />
      <SessionTimeoutModal />

      <Sidebar
        sections={effectiveSections}
        searchSlot={<GlobalSearch basePath={basePath} />}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile top bar — hidden on md+ (sidebar is always visible there) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-slate-950 border-b border-white/10 flex items-center px-4 z-30 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <span className="text-white text-[13px] font-bold">Fyxo CRM</span>
      </div>

      {/* Content — pt-12 only on mobile to clear the top bar */}
      <div className="pt-12 md:pt-0">
        <ErrorBoundary>
          <Suspense fallback={<Loading fullPage />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  )
}
