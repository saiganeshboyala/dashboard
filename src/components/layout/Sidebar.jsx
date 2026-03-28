import { NavLink } from 'react-router-dom'
import { LogOut, Briefcase, X } from 'lucide-react'
import { logout, getUser } from '../../utils/auth'
import { ICONS } from '../../lib/icons'

const ROLE_LABEL = {
  HEAD:      'Super Admin',
  BU_ADMIN:  'Business Unit',
  RECRUITER: 'Recruiter',
  STUDENT:   'Student',
}

const ROLE_COLOR = {
  HEAD:      'from-red-500 to-orange-500',
  BU_ADMIN:  'from-blue-500 to-cyan-500',
  RECRUITER: 'from-violet-500 to-purple-500',
  STUDENT:   'from-teal-500 to-emerald-500',
}

/**
 * Sidebar — desktop: always-visible fixed panel (220px wide).
 *            mobile:  off-screen drawer, slides in when isOpen=true.
 *
 * Props:
 *   sections   — nav section config array
 *   searchSlot — React node shown below logo (GlobalSearch)
 *   isOpen     — controlled by AppLayout (mobile drawer state)
 *   onClose    — close the mobile drawer
 */
export function Sidebar({ sections, searchSlot, isOpen = false, onClose }) {
  const user      = getUser()
  const roleLabel = ROLE_LABEL[user?.role] || 'Platform'
  const roleColor = ROLE_COLOR[user?.role] || 'from-gray-500 to-slate-500'

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside className={[
        'fixed left-0 top-0 bottom-0 w-[220px] bg-slate-950 flex flex-col z-50 border-r border-white/5',
        'transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}>

        {/* Logo + mobile close */}
        <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-glow">
              <Briefcase size={15} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-white tracking-tight leading-none">Fyxo CRM</h1>
              <p className="text-[10px] text-gray-500 mt-0.5">{roleLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-600 hover:text-gray-300 transition-colors" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Search slot */}
        {searchSlot && (
          <div className="px-2.5 pt-3 pb-2 border-b border-white/5">{searchSlot}</div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {(sections || []).map((sec, i) => (
            <div key={i} className={i > 0 ? 'mt-5' : ''}>
              {sec.section && (
                <p className="px-3 mb-1.5 text-[9px] font-bold text-gray-600 uppercase tracking-[0.12em]">
                  {sec.section}
                </p>
              )}
              <div className="space-y-0.5">
                {(sec.items || []).map(({ to, label, icon }) => {
                  const Icon = ICONS[icon] || ICONS.dashboard
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={to.split('/').length <= 2}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all ${
                          isActive
                            ? 'bg-brand-500/15 text-brand-400'
                            : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                        }`
                      }
                    >
                      <Icon size={14} strokeWidth={1.75} />
                      {label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
              {(user?.name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-gray-300 truncate leading-none">{user?.name}</p>
              <p className="text-[10px] text-gray-600 truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
