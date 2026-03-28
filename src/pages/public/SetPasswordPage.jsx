import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'

const RULES = [
  { label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { label: 'One uppercase letter',           test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter',           test: (p) => /[a-z]/.test(p) },
  { label: 'One number',                     test: (p) => /\d/.test(p) },
]

export default function SetPasswordPage() {
  const [params]         = useSearchParams()
  const navigate         = useNavigate()
  const toast            = useToast()
  const token            = params.get('token')

  const [password,        setPassword]        = useState('')
  const [confirm,         setConfirm]         = useState('')
  const [showPwd,         setShowPwd]         = useState(false)
  const [submitting,      setSubmitting]       = useState(false)
  const [tokenError,      setTokenError]       = useState(null)

  useEffect(() => {
    if (!token) setTokenError('No invite token found. Please use the link from your invitation email.')
  }, [token])

  const allRulesPassed = RULES.every(r => r.test(password))
  const passwordsMatch = password === confirm && confirm !== ''
  const canSubmit      = allRulesPassed && passwordsMatch && !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/auth/set-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) {
        const msg = json.message || json.error?.message || 'Failed to set password'
        setTokenError(msg)
      } else {
        toast.success('Password set! Please login.')
        navigate('/login', { replace: true })
      }
    } catch {
      setTokenError('Network error. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px 40px 36px', width: '100%', maxWidth: 420,
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 12, background: '#2563eb', marginBottom: 12,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Fyxo CRM</h1>
        </div>

        {tokenError ? (
          /* ── Error state ── */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Link Invalid or Expired</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{tokenError}</p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Contact your admin to resend the invite.
            </p>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
              Set Your Password
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              Create a secure password to access your account.
            </p>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  required
                  placeholder="Enter new password"
                  style={{
                    width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8, fontSize: 14,
                    border: `1.5px solid ${password && !allRulesPassed ? '#fca5a5' : '#d1d5db'}`,
                    outline: 'none', boxSizing: 'border-box', background: '#f9fafb',
                  }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Re-enter password"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
                  border: `1.5px solid ${confirm && !passwordsMatch ? '#fca5a5' : confirm && passwordsMatch ? '#86efac' : '#d1d5db'}`,
                  outline: 'none', boxSizing: 'border-box', background: '#f9fafb',
                }}
              />
              {confirm && !passwordsMatch && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>Passwords do not match</p>
              )}
            </div>

            {/* Requirements checklist */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 22 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Password requirements:</p>
              {RULES.map(rule => (
                <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: password && rule.test(password) ? '#16a34a' : '#94a3b8' }}>
                    {password && rule.test(password) ? '✓' : '○'}
                  </span>
                  <span style={{ fontSize: 12, color: password && rule.test(password) ? '#15803d' : '#64748b' }}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit ? '#2563eb' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: 15,
                transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Setting password…' : 'Set Password & Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
