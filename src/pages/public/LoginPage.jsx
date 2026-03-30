import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { saveAuth, getHomePath } from '../../utils/auth'
import { Briefcase, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!email || !password) return setErr('Please enter your email and password')
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      let data = json.success ? json.data : json
      // If /auth/login fails with 404, try /tenants/login
      if (!data?.token && (res.status === 404 || json.error?.code === 'ROUTE_NOT_FOUND')) {
        const res2 = await fetch('/api/v1/tenants/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const json2 = await res2.json()
        data = json2.success ? json2.data : json2
      }
      if (data?.token) {
        saveAuth(data.token, data.user, data.tenant)
        if (data.passwordExpired) {
          nav('/change-password', { state: { expired: true } })
        } else {
          window.location.href = getHomePath()
        }
      } else {
        setErr(json.error?.message || json.message || 'Invalid credentials')
      }
    } catch {
      setErr('Connection error. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[380px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Briefcase size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Fyxo CRM</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your workspace</p>
        </div>

        <form onSubmit={submit} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7">
          {err && (
            <div className="flex items-center gap-2.5 mb-5 px-3.5 py-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-300 text-[13px]">
              <AlertCircle size={14} className="shrink-0" />
              {err}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@company.com" autoComplete="email" autoFocus
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-600 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-600 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={busy}
            className="w-full mt-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-[13px] font-semibold rounded-lg transition-all disabled:opacity-60 shadow-sm active:scale-[0.98]">
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>

          <p className="text-center text-[12px] text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Register</Link>
          </p>
        </form>

        <p className="text-center text-[11px] text-gray-600 mt-6">
          Demo: head@demo.com / student@demo.com
        </p>
      </div>
    </div>
  )
}
