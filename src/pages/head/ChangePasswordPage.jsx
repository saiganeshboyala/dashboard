import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import { getToken } from '../../utils/auth'
import { useToast } from '../../context/ToastContext'

// ── Strength calculation ──────────────────────────────────────────────────────

function calcStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0–6
}

const STRENGTH_LABELS = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-red-400', 'bg-yellow-400', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']
const STRENGTH_TEXT   = ['', 'text-red-500', 'text-red-400', 'text-yellow-600', 'text-yellow-600', 'text-green-600', 'text-green-700']

function StrengthBar({ password }) {
  const score = calcStrength(password)
  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? STRENGTH_COLORS[score] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${STRENGTH_TEXT[score]}`}>{STRENGTH_LABELS[score]}</p>
    </div>
  )
}

// ── Policy checklist ──────────────────────────────────────────────────────────

function PolicyCheck({ met, label }) {
  return (
    <div className={`flex items-center gap-2 text-[12px] transition-colors ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-gray-300" />}
      {label}
    </div>
  )
}

// ── Password input with toggle ────────────────────────────────────────────────

function PasswordInput({ label, value, onChange, hint }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="input pr-10 w-full"
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const toast     = useToast()
  const expired   = location.state?.expired

  const [current,  setCurrent]  = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [policy,   setPolicy]   = useState(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/v1/auth/password-policy', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(j => setPolicy(j.policy || j)).catch(() => {})
  }, [])

  const minLen   = policy?.min_length          ?? 8
  const needUpper = policy?.require_uppercase  ?? false
  const needLower = policy?.require_lowercase  ?? false
  const needNum  = policy?.require_numbers     ?? false
  const needSpec = policy?.require_special     ?? false

  const checks = [
    { met: newPw.length >= minLen,         label: `At least ${minLen} characters` },
    needUpper && { met: /[A-Z]/.test(newPw),   label: 'Uppercase letter' },
    needLower && { met: /[a-z]/.test(newPw),   label: 'Lowercase letter' },
    needNum   && { met: /[0-9]/.test(newPw),   label: 'Number' },
    needSpec  && { met: /[^A-Za-z0-9]/.test(newPw), label: 'Special character' },
    { met: newPw === confirm && newPw.length > 0, label: 'Passwords match' },
  ].filter(Boolean)

  const allPassed = checks.every(c => c.met)

  const submit = async (e) => {
    e.preventDefault()
    if (!allPassed) return toast.error('Please meet all password requirements')
    setSaving(true)
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.message || 'Failed to change password')
      toast.success('Password changed successfully!')
      navigate('/head')
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-3">
              <Lock size={24} className="text-brand-600" />
            </div>
            <h1 className="text-[17px] font-bold text-gray-900">
              {expired ? 'Password Expired' : 'Change Password'}
            </h1>
            {expired && (
              <p className="text-[12px] text-amber-600 mt-1 text-center">
                Your password has expired. Please set a new one to continue.
              </p>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <PasswordInput
              label="Current Password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
            />

            <div>
              <PasswordInput
                label="New Password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
              <StrengthBar password={newPw} />
            </div>

            <PasswordInput
              label="Confirm New Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />

            {/* Policy checklist */}
            {newPw && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Requirements</p>
                {checks.map((c, i) => (
                  <PolicyCheck key={i} met={c.met} label={c.label} />
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !current || !allPassed}
              className="w-full py-2.5 px-4 bg-brand-600 text-white rounded-xl text-[13px] font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Changing Password…' : 'Change Password'}
            </button>

            {!expired && (
              <button type="button" onClick={() => navigate(-1)}
                className="w-full py-2 text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
