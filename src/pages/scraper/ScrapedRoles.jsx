import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, Eye, ExternalLink } from 'lucide-react'
import { Page, Button, Badge, Select, Input, Loading } from '../../components/ui'
import { scraperApi } from '../../api/scraperClient'

const ROLE_TYPES = ['', 'C2C', 'C2H', 'W2', 'Contract', 'Full-time', '1099']
const SOURCES    = ['', 'jobspy_indeed', 'jobspy_linkedin', 'jobspy_google', 'jobspy_zip_recruiter', 'jobspy_dice', 'jobspy_naukri']
const REMOTES    = ['', 'remote', 'hybrid', 'onsite']
const VISAS      = ['', 'USC/GC Only', 'Any Visa', 'H1B Transfer', 'No H1B Sponsorship', 'EAD/OPT/CPT/H4/L1/L2/TN']

function roleBadgeColor(t) {
  if (!t) return 'gray'
  const l = t.toLowerCase()
  if (l === 'c2c') return 'blue'
  if (l === 'c2h') return 'purple'
  if (l === 'w2') return 'green'
  if (l.includes('contract')) return 'amber'
  if (l.includes('full')) return 'teal'
  return 'gray'
}

export default function ScrapedRoles() {
  const [roles, setRoles]       = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [selected, setSelected] = useState(new Set())

  // Filters
  const [filters, setFilters] = useState({
    role_type: '', skills: '', location: '', remote: '', source: '',
    has_contact: '', min_rate: '', visa: '', is_new: '', q: '',
  })
  const perPage = 25

  const set = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: perPage }
    for (const [k, v] of Object.entries(filters)) {
      if (v !== '') params[k] = v
    }
    scraperApi.getRoles(params)
      .then(res => { setRoles(res.roles || []); setTotal(res.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(load, [load])

  async function handleMarkSeen() {
    const ids = Array.from(selected)
    if (!ids.length) return
    await scraperApi.markSeen(ids)
    setSelected(new Set())
    load()
  }

  async function handlePushCRM() {
    const ids = Array.from(selected)
    if (!ids.length) return
    await scraperApi.pushToCRM(ids)
    setSelected(new Set())
    load()
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Page
      title="Scraped Roles"
      subtitle={`${total.toLocaleString()} roles found`}
      actions={
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={handleMarkSeen}>
                <Eye size={13} /> Mark Seen ({selected.size})
              </Button>
              <Button size="sm" onClick={handlePushCRM}>
                Push to CRM ({selected.size})
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Filter Bar */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Input placeholder="Search title/description..." value={filters.q} onChange={e => set('q', e.target.value)} />
          <Select value={filters.role_type} onChange={e => set('role_type', e.target.value)}>
            <option value="">All Types</option>
            {ROLE_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input placeholder="Skills (e.g. Java,React)" value={filters.skills} onChange={e => set('skills', e.target.value)} />
          <Input placeholder="Location" value={filters.location} onChange={e => set('location', e.target.value)} />
          <Select value={filters.remote} onChange={e => set('remote', e.target.value)}>
            <option value="">Any Remote</option>
            {REMOTES.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select value={filters.source} onChange={e => set('source', e.target.value)}>
            <option value="">All Sources</option>
            {SOURCES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filters.visa} onChange={e => set('visa', e.target.value)}>
            <option value="">Any Visa</option>
            {VISAS.filter(Boolean).map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Input type="number" placeholder="Min Rate ($/hr)" value={filters.min_rate} onChange={e => set('min_rate', e.target.value)} />
          <Select value={filters.has_contact} onChange={e => set('has_contact', e.target.value)}>
            <option value="">Contact: Any</option>
            <option value="true">Has Contact</option>
          </Select>
          <Select value={filters.is_new} onChange={e => set('is_new', e.target.value)}>
            <option value="">New: Any</option>
            <option value="true">New Only</option>
            <option value="false">Seen Only</option>
          </Select>
        </div>
      </div>

      {loading ? <Loading /> : (
        <div className="card overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th w-10">
                    <input
                      type="checkbox"
                      checked={roles.length > 0 && roles.every(r => selected.has(r.id))}
                      onChange={() => {
                        if (roles.every(r => selected.has(r.id))) setSelected(new Set())
                        else setSelected(new Set(roles.map(r => r.id)))
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="table-th">Title</th>
                  <th className="table-th">Company</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Rate</th>
                  <th className="table-th">Location</th>
                  <th className="table-th">Visa</th>
                  <th className="table-th">Source</th>
                  <th className="table-th">Date</th>
                  <th className="table-th w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map(role => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    isExpanded={expanded === role.id}
                    isSelected={selected.has(role.id)}
                    onToggle={() => setExpanded(expanded === role.id ? null : role.id)}
                    onSelect={() => toggleSelect(role.id)}
                  />
                ))}
                {roles.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-16 text-center text-[13px] text-gray-400">No roles match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
              <span className="text-[11px] text-gray-400 tabular-nums">
                Page {page} of {totalPages} ({total.toLocaleString()} total)
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1 text-[12px] rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-3 py-1 text-[12px] rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Page>
  )
}

function RoleRow({ role, isExpanded, isSelected, onToggle, onSelect }) {
  const date = role.scraped_at ? new Date(role.scraped_at).toLocaleDateString() : '—'
  return (
    <>
      <tr className={`transition-colors hover:bg-gray-50/60 ${isSelected ? 'bg-brand-50/30' : ''}`}>
        <td className="table-td w-10" onClick={e => { e.stopPropagation(); onSelect() }}>
          <input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded border-gray-300" />
        </td>
        <td className="table-td">
          <div className="flex items-center gap-2">
            {role.is_new && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
            <span className="font-medium text-gray-900 truncate max-w-[250px]">{role.title}</span>
          </div>
        </td>
        <td className="table-td text-gray-600 truncate max-w-[150px]">{role.company || '—'}</td>
        <td className="table-td"><Badge color={roleBadgeColor(role.role_type)}>{role.role_type || '—'}</Badge></td>
        <td className="table-td text-gray-600 whitespace-nowrap">{role.pay_rate || '—'}</td>
        <td className="table-td text-gray-600 truncate max-w-[140px]">{role.location || '—'}</td>
        <td className="table-td text-[11px] text-gray-500">{role.visa || '—'}</td>
        <td className="table-td">
          <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{role.source}</span>
        </td>
        <td className="table-td text-[11px] text-gray-400 whitespace-nowrap">{date}</td>
        <td className="table-td">
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 transition-colors">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={10} className="px-6 py-4 bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Details</p>
                <p className="text-gray-500">End Client: <span className="text-gray-700">{role.end_client || '—'}</span></p>
                <p className="text-gray-500">Posted By: <span className="text-gray-700">{role.posted_by || '—'}</span></p>
                <p className="text-gray-500">Duration: <span className="text-gray-700">{role.duration || '—'}</span></p>
                <p className="text-gray-500">Remote: <span className="text-gray-700">{role.remote_type || '—'}</span></p>
                <p className="text-gray-500">Experience: <span className="text-gray-700">{role.experience || '—'}</span></p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Contact</p>
                <p className="text-gray-500">Email: <span className="text-gray-700">{role.contact_email || '—'}</span></p>
                <p className="text-gray-500">Phone: <span className="text-gray-700">{role.contact_phone || '—'}</span></p>
                {role.contact_linkedin && (
                  <p className="text-gray-500">LinkedIn: <a href={role.contact_linkedin} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{role.contact_linkedin}</a></p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {(role.skills || []).map(s => (
                    <span key={s} className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                  {(!role.skills || role.skills.length === 0) && <span className="text-gray-400">—</span>}
                </div>
                {role.source_url && (
                  <a href={role.source_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-brand-600 hover:underline text-[11px]">
                    <ExternalLink size={11} /> View Original
                  </a>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
