import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { saveAuth } from '../../utils/auth'
import { Briefcase, AlertCircle } from 'lucide-react'

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function RegisterPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => {
    const val = e.target.value
    setForm(prev => ({
      ...prev,
      [key]: val,
      ...(key === 'companyName' && !prev._slugTouched ? { slug: slugify(val) } : {}),
    }))
  }

  const setSlug = (e) => setForm(prev => ({ ...prev, slug: slugify(e.target.value), _slugTouched: true }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.companyName || !form.adminEmail || !form.adminPassword) return setErr('All fields are required')
    setBusy(true); setErr('')
    try {
      const { _slugTouched, ...payload } = form
      const res = await fetch('/api/v1/tenants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      const data = json.success ? json.data : json
      if (data?.token) {
        saveAuth(data.token, data.user, data.tenant, data.refreshToken)
        nav('/head')
      } else {
        setErr(json.error?.message || 'Registration failed')
      }
    } catch { setErr('Connection error. Please try again.') }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Briefcase size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create your workspace</h1>
          <p className="text-gray-400 text-sm mt-1">Get started with Fyxo CRM in minutes</p>
        </div>

        <form onSubmit={submit} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7 space-y-4">
          {err && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-300 text-[13px]">
              <AlertCircle size={14} className="shrink-0" /> {err}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Company Name</label>
            <input value={form.companyName || ''} onChange={set('companyName')} required placeholder="Acme Corp"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-600 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Workspace URL</label>
            <div className="relative">
              <input value={form.slug || ''} onChange={setSlug} required placeholder="acme-corp"
                className="w-full px-3.5 py-2.5 pr-28 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-600 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-600">.fyxo.ai</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Your Name</label>
            <input value={form.adminName || ''} onChange={set('adminName')} required placeholder="Jane Smith"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-600 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Work Email</label>
            <input type="email" value={form.adminEmail || ''} onChange={set('adminEmail')} required placeholder="jane@company.com"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-600 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-400 mb-1.5">Password</label>
            <input type="password" value={form.adminPassword || ''} onChange={set('adminPassword')} required placeholder="••••••••" minLength={8}
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-600 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all" />
          </div>

          <button type="submit" disabled={busy}
            className="w-full mt-2 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-[13px] font-semibold rounded-lg transition-all disabled:opacity-60 shadow-sm active:scale-[0.98]">
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating workspace...
              </span>
            ) : 'Create Account'}
          </button>

          <p className="text-center text-[12px] text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
