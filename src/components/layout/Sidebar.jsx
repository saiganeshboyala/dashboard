import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, Briefcase, X, KeyRound, Eye, EyeOff } from 'lucide-react'
import { logout, getUser } from '../../utils/auth'
import { ICONS } from '../../lib/icons'

// ── Change Password Modal ─────────────────────────────────────────────────────

const PWD_RULES = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'One uppercase letter',  test: p => /[A-Z]/.test(p) },
  { label: 'One lowercase letter',  test: p => /[a-z]/.test(p) },
  { label: 'One number',            test: p => /\d/.test(p) },
]

function ChangePasswordModal({ onClose }) {
  const [current,    setCurrent]    = useState('')
  const [next,       setNext]       = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showCur,    setShowCur]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)
  const [success,    setSuccess]    = useState(false)

  const rulesPassed = PWD_RULES.every(r => r.test(next))
  const matches     = next === confirm && confirm !== ''
  const canSubmit   = current && rulesPassed && matches && !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const res = await fetch('/api/v1/auth/change-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) {
        setError(json.message || 'Failed to change password')
      } else {
        setSuccess(true)
        setTimeout(onClose, 1800)
      }
    } catch {
      setError('Network error — please try again')
    }
    setSubmitting(false)
  }

  const inputStyle = (bad) => ({
    width: '100%', padding: '9px 36px 9px 11px', borderRadius: 7, fontSize: 13,
    border: `1.5px solid ${bad ? '#fca5a5' : '#e2e8f0'}`, outline: 'none',
    background: '#f8fafc', boxSizing: 'border-box',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)', padding: '28px 28px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Change Password</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
            <p style={{ margin: 0, fontWeight: 600, color: '#16a34a' }}>Password changed!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Current password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showCur ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}
                  autoFocus placeholder="Your current password" style={inputStyle(false)} />
                <button type="button" onClick={() => setShowCur(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                  {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showNew ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)}
                  placeholder="New password" style={inputStyle(next && !rulesPassed)} />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {/* Rules */}
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {PWD_RULES.map(rule => (
                  <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: next && rule.test(next) ? '#16a34a' : '#cbd5e1' }}>
                      {next && rule.test(next) ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: 11, color: next && rule.test(next) ? '#15803d' : '#94a3b8' }}>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Confirm New Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter new password" style={inputStyle(confirm && !matches)} />
              {confirm && !matches && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>Passwords do not match</p>}
            </div>

            {error && <p style={{ margin: 0, fontSize: 12, color: '#ef4444', background: '#fef2f2', padding: '8px 10px', borderRadius: 6 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit}
                style={{ padding: '8px 20px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: canSubmit ? '#2563eb' : '#cbd5e1', color: '#fff', transition: 'background 0.15s' }}>
                {submitting ? 'Saving…' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

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
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    // start all collapsible sections collapsed
    const init = {}
    ;(sections || []).forEach(s => { if (s.collapsible) init[s.section] = true })
    return init
  })

  const toggleSection = (name) => setCollapsed(prev => ({ ...prev, [name]: !prev[name] }))

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
          {(sections || []).map((sec, i) => {
            const isCollapsible = !!sec.collapsible
            const isCollapsed   = isCollapsible && collapsed[sec.section]
            const items         = sec.items || []
            if (items.length === 0) return null

            return (
              <div key={i} className={i > 0 ? 'mt-5' : ''}>
                {sec.section && (
                  isCollapsible ? (
                    <button
                      onClick={() => toggleSection(sec.section)}
                      className="w-full flex items-center justify-between px-3 mb-1 group"
                    >
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.12em] group-hover:text-gray-400 transition-colors">
                        {sec.section}
                      </span>
                      <span className={`text-[9px] text-gray-700 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                        ▶
                      </span>
                    </button>
                  ) : (
                    <p className="px-3 mb-1.5 text-[9px] font-bold text-gray-600 uppercase tracking-[0.12em]">
                      {sec.section}
                    </p>
                  )
                )}

                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {items.map(({ to, label, icon }) => {
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
                )}
              </div>
            )
          })}
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
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowChangePwd(true)}
                className="text-gray-700 hover:text-blue-400 transition-colors"
                title="Change password"
              >
                <KeyRound size={13} />
              </button>
              <button
                onClick={logout}
                className="text-gray-700 hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </>
  )
}
