import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveAdminAuth } from '../../utils/auth'
import { adminLogin } from '../../utils/api'
import { Shield, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const data = await adminLogin({ email, password })
      const token = data?.token
      const admin = data?.admin || {}
      if (token) {
        saveAdminAuth(token, admin)
        nav('/admin')
      } else {
        setErr(data?.error?.message || data?.error || data?.message || 'Invalid credentials')
      }
    } catch (e) {
      setErr(e?.message || 'Connection error')
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Platform Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Restricted access</p>
        </div>

        <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          {err && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[12px]">
              <AlertCircle size={13} /> {err}
            </div>
          )}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Admin Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white outline-none focus:border-red-500/50 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white outline-none focus:border-red-500/50 transition-all pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-[13px] font-semibold rounded-lg transition-all disabled:opacity-60">
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
