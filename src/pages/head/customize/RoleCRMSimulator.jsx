import { createContext, useContext, useState, useEffect } from 'react'
import { X, LogOut, Monitor, Tablet, Smartphone, ChevronRight, ArrowLeft } from 'lucide-react'
import { ICONS } from '../../../lib/icons'
import { get } from '../../../utils/api'

// ── Custom sim-navigation context (replaces MemoryRouter entirely) ─────────
const SimNavCtx = createContext(null)
const useSimNav  = () => useContext(SimNavCtx)

// ── Colour palette per role ────────────────────────────────────────────────
const COLOR = {
  indigo:  { pill: 'bg-indigo-600 text-white',  active: 'bg-indigo-500/15 text-indigo-300',  banner: 'bg-indigo-600',  accent: '#4338ca', light: '#eef2ff' },
  violet:  { pill: 'bg-violet-600 text-white',  active: 'bg-violet-500/15 text-violet-300',  banner: 'bg-violet-600',  accent: '#7c3aed', light: '#f5f3ff' },
  emerald: { pill: 'bg-emerald-600 text-white', active: 'bg-emerald-500/15 text-emerald-300', banner: 'bg-emerald-600', accent: '#059669', light: '#ecfdf5' },
}

const DEVICES = [
  { key: 'desktop', Icon: Monitor,    w: '100%'  },
  { key: 'tablet',  Icon: Tablet,     w: '768px' },
  { key: 'mobile',  Icon: Smartphone, w: '390px' },
]

// ── Role definitions ───────────────────────────────────────────────────────
const ROLES = [
  {
    key:   'BU_ADMIN',
    label: 'BU Admin',
    description: 'Manager — sees students, submissions & interviews across their BU',
    color: 'indigo',
    base:  '/bu',
    sections: [
      { section: 'Overview', items: [{ to: '/bu', label: 'Dashboard', icon: 'dashboard' }] },
      { section: 'CRM', items: [
        { to: '/bu/students',       label: 'Students',       icon: 'users'     },
        { to: '/bu/submissions',    label: 'Submissions',    icon: 'file'      },
        { to: '/bu/interviews',     label: 'Interviews',     icon: 'calendar'  },
        { to: '/bu/recruiters',     label: 'Recruiters',     icon: 'recruiter' },
        { to: '/bu/business_units', label: 'Business Units', icon: 'building'  },
        { to: '/bu/clusters',       label: 'Clusters',       icon: 'dashboard' },
        { to: '/bu/leads',          label: 'Leads',          icon: 'users'     },
      ]},
    ],
    dashStats: [
      { label: 'Students',       obj: 'students'       },
      { label: 'Submissions',    obj: 'submissions'    },
      { label: 'Interviews',     obj: 'interviews'     },
      { label: 'Recruiters',     obj: 'recruiters'     },
      { label: 'Business Units', obj: 'business_units' },
      { label: 'Leads',          obj: 'leads'          },
    ],
  },
  {
    key:   'RECRUITER',
    label: 'Recruiter',
    description: 'Team member — manages their own assigned students & pipeline',
    color: 'violet',
    base:  '/rec',
    sections: [
      { section: 'Overview', items: [{ to: '/rec', label: 'Dashboard', icon: 'dashboard' }] },
      { section: 'CRM', items: [
        { to: '/rec/students',    label: 'My Students',  icon: 'users'    },
        { to: '/rec/submissions', label: 'Submissions',  icon: 'file'     },
        { to: '/rec/interviews',  label: 'Interviews',   icon: 'calendar' },
        { to: '/rec/leads',       label: 'Leads',        icon: 'users'    },
      ]},
    ],
    dashStats: [
      { label: 'My Students',  obj: 'students'    },
      { label: 'Submissions',  obj: 'submissions' },
      { label: 'Interviews',   obj: 'interviews'  },
      { label: 'Leads',        obj: 'leads'       },
    ],
  },
  {
    key:   'STUDENT',
    label: 'Student',
    description: 'Candidate — views their own profile, applications & interviews',
    color: 'emerald',
    base:  '/stu',
    sections: [
      { section: 'Overview', items: [{ to: '/stu', label: 'Dashboard', icon: 'dashboard' }] },
      { section: 'My Data', items: [
        { to: '/stu/submissions', label: 'My Submissions', icon: 'file'     },
        { to: '/stu/interviews',  label: 'My Interviews',  icon: 'calendar' },
      ]},
    ],
    dashStats: [
      { label: 'Applications', obj: 'submissions' },
      { label: 'Interviews',   obj: 'interviews'  },
    ],
  },
]

// ── Path matching (no React Router needed) ─────────────────────────────────
function matchRoute(simPath, base) {
  const rel  = simPath.replace(base, '').replace(/^\//, '')
  const segs = rel.split('/').filter(Boolean)
  if (segs.length === 0) return { type: 'dashboard' }
  if (segs.length === 1) return { type: 'list',   objectName: segs[0] }
  if (segs.length >= 2)  return { type: 'detail', objectName: segs[0], id: segs[1] }
  return { type: 'dashboard' }
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function SimSidebar({ role }) {
  const { simPath, navigate } = useSimNav()
  const clr = COLOR[role.color]

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${clr.banner} flex items-center justify-center`}>
            <span className="text-white text-[11px] font-bold">{role.label[0]}</span>
          </div>
          <div>
            <p className="text-white text-[12px] font-semibold leading-none">Fyxo CRM</p>
            <p className="text-gray-500 text-[10px] mt-0.5">{role.label}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {role.sections.map((sec, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            <p className="px-3 mb-1 text-[9px] font-bold text-gray-600 uppercase tracking-[0.12em]">
              {sec.section}
            </p>
            {sec.items.map(item => {
              const Icon     = ICONS[item.icon] || ICONS.dashboard
              const isActive = simPath === item.to || simPath.startsWith(item.to + '/')
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all mb-0.5 ${
                    isActive ? clr.active : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Mock user */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5">
          <div className={`w-7 h-7 rounded-full ${clr.banner} flex items-center justify-center text-white text-[11px] font-bold`}>
            {role.label[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-gray-300 leading-none">Sample {role.label}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">preview@fyxo.com</p>
          </div>
          <LogOut size={12} className="text-gray-700" />
        </div>
      </div>
    </div>
  )
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────
function SimBreadcrumb({ role }) {
  const { simPath, navigate } = useSimNav()
  const clr   = COLOR[role.color]
  const parts  = simPath.split('/').filter(Boolean)
  const labels = parts.map(p => p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))

  const goBack = () => {
    const up = '/' + parts.slice(0, -1).join('/')
    navigate(up || role.base)
  }

  return (
    <div className="flex items-center gap-1 text-[11px] text-gray-400 px-4 py-1.5 bg-white border-b border-gray-100 shrink-0">
      {parts.length > 1 && (
        <button onClick={goBack} className="mr-1 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={11} />
        </button>
      )}
      <span className="text-gray-300">Fyxo CRM</span>
      {labels.map((lbl, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight size={10} className="text-gray-300" />
          {i < labels.length - 1 ? (
            <button
              onClick={() => navigate('/' + parts.slice(0, i + 1).join('/'))}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {lbl}
            </button>
          ) : (
            <span className="text-gray-700 font-medium">{lbl}</span>
          )}
        </span>
      ))}
      <span
        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
        style={{ background: clr.light, color: clr.accent, borderColor: clr.accent + '44' }}
      >
        Simulated as {role.label}
      </span>
    </div>
  )
}

// ── Dashboard view ─────────────────────────────────────────────────────────
function SimDashboard({ role }) {
  const { navigate } = useSimNav()
  const clr          = COLOR[role.color]
  const [counts, setCounts]   = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all(
      role.dashStats.map(({ obj }) =>
        get(`/api/v1/dynamic/${obj}?limit=1`)
          .then(d => ({ obj, count: d?.total ?? d?.pagination?.total ?? (Array.isArray(d) ? d.length : '?') }))
          .catch(() => ({ obj, count: '—' }))
      )
    ).then(results => {
      if (!alive) return
      const map = {}
      results.forEach(({ obj, count }) => { map[obj] = count })
      setCounts(map)
      setLoading(false)
    })
    return () => { alive = false }
  }, [role.key])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{role.label} Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, Sample {role.label}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {role.dashStats.map(({ label, obj }) => (
          <button
            key={obj}
            onClick={() => navigate(role.base + '/' + obj)}
            className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-sm hover:border-gray-300 transition-all"
          >
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">{label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? <span className="text-gray-300 text-lg">…</span> : counts[obj] ?? '—'}
            </p>
          </button>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Quick Access</p>
        <div className="space-y-1">
          {role.sections
            .flatMap(s => s.items)
            .filter(item => item.to !== role.base)
            .map(item => {
              const Icon = ICONS[item.icon] || ICONS.dashboard
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                >
                  <Icon size={15} strokeWidth={1.75} className="text-gray-400" />
                  {item.label}
                  <ChevronRight size={13} className="ml-auto text-gray-300" />
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}

// ── List view ──────────────────────────────────────────────────────────────
function SimList({ objectName, basePath }) {
  const { navigate }          = useSimNav()
  const [rows, setRows]       = useState([])
  const [cols, setCols]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    get(`/api/v1/dynamic/${objectName}?limit=25`)
      .then(d => {
        if (!alive) return
        const records = Array.isArray(d) ? d : (d?.records ?? d?.rows ?? d?.data ?? [])
        setRows(records)
        if (records.length > 0) {
          const keys = Object.keys(records[0])
            .filter(k => !['id','createdAt','updatedAt','__typename','tenant_id','tenantId'].includes(k))
            .slice(0, 5)
          setCols(keys)
        }
      })
      .catch(e => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [objectName])

  const label = objectName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{label}</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-400 mt-0.5">{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            Loading…
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No {label.toLowerCase()} records yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    {cols.map(col => (
                      <th key={col} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id ?? i}
                      onClick={() => row.id && navigate(`${basePath}/${row.id}`)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {cols.map(col => (
                        <td key={col} className="px-4 py-3 text-gray-700">
                          {row[col] == null
                            ? <span className="text-gray-300">—</span>
                            : <span className="line-clamp-1">{String(row[col]).slice(0, 60)}</span>
                          }
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <ChevronRight size={13} className="text-gray-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Detail view ────────────────────────────────────────────────────────────
function SimDetail({ objectName, id, basePath }) {
  const { navigate }            = useSimNav()
  const [record, setRecord]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    get(`/api/v1/dynamic/${objectName}/${id}`)
      .then(d => { if (alive) setRecord(d) })
      .catch(e => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [objectName, id])

  const label  = objectName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const fields = record
    ? Object.entries(record).filter(([k]) =>
        !['__typename','tenant_id','tenantId'].includes(k)
      )
    : []

  const title = record?.name ?? record?.title ?? record?.full_name ?? `${label} #${id}`

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(basePath)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to {label}
      </button>

      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            Loading…
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && record && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          </div>

          {/* Fields */}
          <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
            {fields.map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  {k.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-gray-800 break-words">
                  {v == null
                    ? <span className="text-gray-300">—</span>
                    : typeof v === 'object'
                      ? <span className="text-gray-400 italic text-xs">[object]</span>
                      : String(v).slice(0, 120)
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Content router — pure state, no React Router ───────────────────────────
function SimContent({ role }) {
  const { simPath } = useSimNav()
  const { type, objectName, id } = matchRoute(simPath, role.base)

  if (type === 'list')   return <SimList   objectName={objectName} basePath={role.base + '/' + objectName} />
  if (type === 'detail') return <SimDetail objectName={objectName} id={id} basePath={role.base + '/' + objectName} />
  return <SimDashboard role={role} />
}

// ── Main exported component ────────────────────────────────────────────────
export default function RoleCRMSimulator({ onClose }) {
  const [roleKey, setRoleKey] = useState('BU_ADMIN')
  const [device,  setDevice]  = useState('desktop')
  const [simPath, setSimPath] = useState('/bu')

  const role = ROLES.find(r => r.key === roleKey) ?? ROLES[0]
  const clr  = COLOR[role.color]

  const navigate   = (path) => setSimPath(path)
  const switchRole = (key) => {
    const next = ROLES.find(r => r.key === key)
    setRoleKey(key)
    setSimPath(next.base)
  }

  // Lock background scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const contentWidth = DEVICES.find(d => d.key === device)?.w ?? '100%'
  const pageCount    = role.sections.reduce((n, s) => n + s.items.length, 0)

  return (
    <SimNavCtx.Provider value={{ simPath, navigate }}>
      <div className="fixed inset-0 z-[200] flex flex-col bg-white" style={{ fontFamily: 'inherit' }}>

        {/* ── Top control bar ── */}
        <div className="bg-slate-900 flex items-center gap-3 px-4 py-2.5 shrink-0 border-b border-white/10">
          {/* Label */}
          <div className="flex items-center gap-2 mr-1">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-white text-sm font-semibold">Simulation Mode</span>
            <span className="text-gray-500 text-xs hidden sm:block">— navigable, real data, exact UI</span>
          </div>

          {/* Role pills */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
            {ROLES.map(r => (
              <button
                key={r.key}
                onClick={() => switchRole(r.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  roleKey === r.key
                    ? COLOR[r.color].pill
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <span className="text-gray-500 text-xs hidden lg:block">{role.description}</span>

          {/* Device switcher */}
          <div className="ml-auto flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            {DEVICES.map(d => (
              <button
                key={d.key}
                onClick={() => setDevice(d.key)}
                title={d.key}
                className={`p-1.5 rounded transition-colors ${
                  device === d.key ? 'bg-slate-600 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                <d.Icon size={13} />
              </button>
            ))}
          </div>

          {/* Exit */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-all ml-2"
          >
            <X size={13} /> Exit
          </button>
        </div>

        {/* ── Role info strip ── */}
        <div className={`${clr.banner} px-5 py-2 flex items-center gap-3 text-white text-xs shrink-0`}>
          <span className="font-semibold">{role.label}</span>
          <span className="opacity-50">·</span>
          <span className="opacity-80">{role.description}</span>
          <span className="opacity-50">·</span>
          <span className="opacity-80">{pageCount} page{pageCount !== 1 ? 's' : ''} accessible</span>
          <span className="ml-auto opacity-70 hidden md:block">
            Exact layout {role.label}s see when they log in
          </span>
        </div>

        {/* ── Simulated CRM ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[220px] shrink-0">
            <SimSidebar role={role} />
          </div>

          {/* Content area — centred to device width */}
          <div className="flex-1 overflow-auto bg-gray-50 flex justify-center">
            <div
              style={{ width: contentWidth, maxWidth: '100%', transition: 'width 0.25s ease' }}
              className="flex flex-col"
            >
              <SimBreadcrumb role={role} />
              <div className="flex-1">
                <SimContent role={role} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SimNavCtx.Provider>
  )
}
