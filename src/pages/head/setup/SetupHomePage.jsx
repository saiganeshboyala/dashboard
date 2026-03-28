import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Database, Layers, Users, Shield, Zap, Mail, BarChart2, Plus, ChevronRight } from 'lucide-react'
import * as api from '../../../utils/api'

// ─── Quick actions grid ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'New Custom Object', icon: Database,  to: '/head/setup/objects' },
  { label: 'New Field',         icon: Plus,      to: '/head/setup/objects' },
  { label: 'Edit Page Layout',  icon: Layers,    to: '/head/setup/objects' },
  { label: 'Manage Profiles',   icon: Users,     to: '/head/setup/profiles' },
  { label: 'Validation Rules',  icon: Shield,    to: '/head/rules' },
  { label: 'Automation Flows',  icon: Zap,       to: '/head/flows' },
  { label: 'Email Templates',   icon: Mail,      to: '/head/email-templates' },
  { label: 'Reports',           icon: BarChart2, to: '/head/reports' },
]

// ─── Setup nav items for search ──────────────────────────────────────────────

const ALL_ITEMS = [
  { label: 'Object Manager',     to: '/head/setup/objects' },
  { label: 'Schema Map',         to: '/head/setup/schema-map' },
  { label: 'Profiles',           to: '/head/setup/profiles' },
  { label: 'Validation Rules',   to: '/head/rules' },
  { label: 'Flows',              to: '/head/flows' },
  { label: 'Email Templates',    to: '/head/email-templates' },
  { label: 'Bulk Email',         to: '/head/bulk-email' },
  { label: 'Import',             to: '/head/import' },
  { label: 'Export',             to: '/head/export' },
  { label: 'Audit Trail',        to: '/head/audit' },
  { label: 'Reports',            to: '/head/reports' },
  { label: 'Dashboards',         to: '/head/dashboards' },
  { label: 'Webhooks',           to: '/head/webhooks' },
  { label: 'Billing',            to: '/head/billing' },
  { label: 'MFA Settings',       to: '/head/mfa' },
  { label: 'Invite Users',       to: '/head/invite' },
  { label: 'Triggers & Rollups', to: '/head/triggers' },
  { label: 'Integrations',       to: '/head/integrations' },
]

export default function SetupHomePage() {
  const navigate = useNavigate()
  const [query,   setQuery]   = useState('')
  const [stats,   setStats]   = useState(null)

  useEffect(() => {
    api.getSchemaObjects()
      .then(r => {
        const objects = r?.objects || r || []
        const standard = objects.filter(o => !o.isCustom).length
        const custom   = objects.filter(o =>  o.isCustom).length
        const total    = objects.length
        const fields   = objects.reduce((sum, o) => sum + (o.fieldCount || 0), 0)
        setStats({ total, standard, custom, fields })
      })
      .catch(() => {})
  }, [])

  const q = query.trim().toLowerCase()
  const suggestions = q.length > 1
    ? ALL_ITEMS.filter(it => it.label.toLowerCase().includes(q)).slice(0, 6)
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="text-[18px] font-semibold text-gray-900 mb-0.5">Setup</h1>
        <p className="text-gray-500 text-[13px]">Customize and configure your CRM</p>
      </div>

      <div className="px-8 py-6 max-w-5xl">
        {/* ── Big search bar ── */}
        <div className="mb-8 relative max-w-xl">
          <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus-within:border-indigo-400 transition-colors shadow-sm">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search Setup (e.g. 'picklist', 'object', 'profile')..."
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-[13px] focus:outline-none"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg overflow-hidden z-10 shadow-lg">
              {suggestions.map(item => (
                <button
                  key={item.to + item.label}
                  onClick={() => { navigate(item.to); setQuery('') }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <span>{item.label}</span>
                  <ChevronRight size={13} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Total Objects',    value: stats.total    },
              { label: 'Standard Objects', value: stats.standard },
              { label: 'Custom Objects',   value: stats.custom   },
              { label: 'Total Fields',     value: stats.fields   },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 shadow-sm">
                <p className="text-[22px] font-semibold text-gray-900 leading-none mb-1">{s.value}</p>
                <p className="text-gray-500 text-[11px]">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.to)}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3.5 py-3 hover:border-indigo-200 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                    <Icon size={14} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-[12px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors leading-tight">
                    {action.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Common destinations ── */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Common Setup Pages</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_ITEMS.slice(0, 8).map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[12.5px] text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {item.label}
                <ChevronRight size={13} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
