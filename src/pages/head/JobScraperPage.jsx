import { useState, useEffect, useRef } from 'react'
import { Page, DataTable, Badge, Button, Modal, Tabs, StatCard, Loading } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get, post } from '../../services/api'
import { RefreshCw, Play, Upload, Search, ExternalLink, AlertTriangle } from 'lucide-react'

const TECH_COLORS = {
  JAVA: '#3B82F6', DE: '#8B5CF6', '.NET': '#10B981', Python: '#F59E0B',
  React: '#06B6D4', DevOps: '#EF4444', Java: '#3B82F6', SQL: '#8B5CF6',
  AWS: '#F59E0B', Docker: '#06B6D4', Kubernetes: '#EF4444',
}

function SkillBadge({ skill }) {
  const bg = TECH_COLORS[skill] || '#6B7280'
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white mr-1 mb-0.5"
      style={{ backgroundColor: bg }}>{skill}</span>
  )
}

function ScraperDownBanner() {
  return (
    <div className="card p-8 text-center">
      <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
      <h3 className="text-[14px] font-bold text-gray-700 mb-1">Job Scraper Unavailable</h3>
      <p className="text-[12px] text-gray-500">The job scraper service on port 8000 is not responding. Make sure it is running.</p>
    </div>
  )
}

export default function JobScraperPage() {
  const toast = useToast()
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})
  const [actionLoading, setActionLoading] = useState(null)
  const [scraperDown, setScraperDown] = useState(false)

  // All Jobs state
  const [jobsPage, setJobsPage] = useState(1)
  const [jobFilters, setJobFilters] = useState({ skills: '', location: '', source: '', q: '' })
  const [jobDetail, setJobDetail] = useState(null)

  // Career pages state
  const [showImport, setShowImport] = useState(false)
  const fileRef = useRef(null)

  // Scrape modal
  const [showScrape, setShowScrape] = useState(false)
  const [scrapeForm, setScrapeForm] = useState({ sources: [] })

  const load = async (t = tab) => {
    setLoading(true)
    try {
      if (t === 'dashboard') {
        const dashboard = await get('/api/v1/jobs/dashboard').catch(() => null)
        if (!dashboard) { setScraperDown(true); setLoading(false); return }
        setScraperDown(false)
        setData(prev => ({ ...prev, dashboard }))
      } else if (t === 'jobs') {
        const params = new URLSearchParams({ page: jobsPage, per_page: 20 })
        if (jobFilters.skills) params.set('skills', jobFilters.skills)
        if (jobFilters.location) params.set('location', jobFilters.location)
        if (jobFilters.source) params.set('source', jobFilters.source)
        if (jobFilters.q) params.set('q', jobFilters.q)
        const jobs = await get(`/api/v1/jobs/all?${params}`)
        setData(prev => ({ ...prev, jobs }))
      } else if (t === 'career') {
        const pages = await get('/api/v1/jobs/career-pages').catch(() => [])
        setData(prev => ({ ...prev, careerPages: Array.isArray(pages) ? pages : pages?.pages || [] }))
      } else if (t === 'matching') {
        const stats = await get('/api/v1/jobs/matching/stats')
        setData(prev => ({ ...prev, matching: stats }))
      }
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab, jobsPage])

  const runAction = async (label, fn) => {
    if (actionLoading) return // prevent double-click
    setActionLoading(label)
    try {
      await fn()
      toast.success(`${label} completed`)
      load()
    } catch (e) { toast.error(e.message) }
    setActionLoading(null)
  }

  const d = data.dashboard || {}

  return (
    <Page title="Job Scraper" subtitle="Manage job scraping, career pages, and student-job matching">
      <Tabs active={tab} onChange={t => { setTab(t); if (!data[t === 'dashboard' ? 'dashboard' : t]) setLoading(true) }} tabs={[
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'jobs', label: 'All Roles' },
        { id: 'career', label: 'Career Pages' },
        { id: 'matching', label: 'Matching' },
      ]} />

      <div className="mt-6">
        {scraperDown && tab === 'dashboard' ? <ScraperDownBanner /> :
        loading ? <Loading /> : (
          <>
            {/* ── TAB 1: DASHBOARD ── */}
            {tab === 'dashboard' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard label="Total Roles" value={d.total_roles ?? 0} icon="briefcase" color="brand" />
                  <StatCard label="Active Roles" value={d.active_roles ?? 0} icon="trending" color="success" />
                  <StatCard label="Career Pages" value={d.career_pages_tracked ?? 0} icon="building" color="purple" />
                  <StatCard label="Sources" value={Object.keys(d.by_source || {}).length} icon="chart" color="warn" />
                </div>

                <div className="flex gap-2 mb-6">
                  <Button size="sm" disabled={!!actionLoading}
                    onClick={() => runAction('Full Pipeline', () => post('/api/v1/jobs/full-pipeline'))}
                    loading={actionLoading === 'Full Pipeline'}>
                    <Play size={13} /> Run Full Pipeline
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowScrape(true)} disabled={!!actionLoading}>
                    <Search size={13} /> Trigger Scrape
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => load('dashboard')} disabled={!!actionLoading}>
                    <RefreshCw size={13} /> Refresh
                  </Button>
                </div>

                {/* By Source + By Role Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {d.by_source && Object.keys(d.by_source).length > 0 && (
                    <div className="card p-5">
                      <h3 className="text-[13px] font-bold mb-3">Roles by Source</h3>
                      <HBarChart data={d.by_source} />
                    </div>
                  )}
                  {d.by_role_type && Object.keys(d.by_role_type).length > 0 && (
                    <div className="card p-5">
                      <h3 className="text-[13px] font-bold mb-3">Roles by Type</h3>
                      <HBarChart data={d.by_role_type} />
                    </div>
                  )}
                </div>

                {d.by_country && Object.keys(d.by_country).length > 0 && (
                  <div className="card p-5 mb-6">
                    <h3 className="text-[13px] font-bold mb-3">Roles by Country</h3>
                    <HBarChart data={d.by_country} />
                  </div>
                )}
              </>
            )}

            {/* ── TAB 2: ALL ROLES ── */}
            {tab === 'jobs' && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <input className="field-input w-40" placeholder="Skills (e.g. React)" value={jobFilters.skills}
                    onChange={e => setJobFilters(f => ({ ...f, skills: e.target.value }))} />
                  <input className="field-input w-40" placeholder="Location" value={jobFilters.location}
                    onChange={e => setJobFilters(f => ({ ...f, location: e.target.value }))} />
                  <input className="field-input w-36" placeholder="Source" value={jobFilters.source}
                    onChange={e => setJobFilters(f => ({ ...f, source: e.target.value }))} />
                  <input className="field-input w-48" placeholder="Search title/description..." value={jobFilters.q}
                    onChange={e => setJobFilters(f => ({ ...f, q: e.target.value }))} />
                  <Button size="sm" onClick={() => { setJobsPage(1); load('jobs') }}>
                    <Search size={13} /> Search
                  </Button>
                </div>

                {data.jobs?.total != null && (
                  <p className="text-[11px] text-gray-500 mb-2">{data.jobs.total} roles found — Page {data.jobs.page || jobsPage}</p>
                )}

                <DataTable
                  columns={[
                    { key: 'title', label: 'Title', render: v => <span className="font-medium text-gray-900">{v}</span> },
                    { key: 'company', label: 'Company', render: v => v || '—' },
                    { key: 'location', label: 'Location' },
                    { key: 'remote_type', label: 'Remote', render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
                    { key: 'role_type', label: 'Type', render: v => v ? <Badge color="purple">{v}</Badge> : '—' },
                    { key: 'skills', label: 'Skills', render: v => {
                      const arr = Array.isArray(v) ? v : []
                      return arr.slice(0, 4).map((s, i) => <SkillBadge key={i} skill={s} />)
                    }},
                    { key: 'source', label: 'Source', render: v => <Badge color="gray">{v}</Badge> },
                    { key: 'scraped_at', label: 'Scraped', render: v => v ? new Date(v).toLocaleDateString() : '—' },
                  ]}
                  rows={data.jobs?.roles || []}
                  onRowClick={row => setJobDetail(row)}
                  emptyText="No roles found"
                />

                <div className="flex gap-2 mt-4 justify-center">
                  <Button variant="secondary" size="sm" disabled={jobsPage <= 1}
                    onClick={() => setJobsPage(p => p - 1)}>Previous</Button>
                  <span className="text-[12px] text-gray-500 self-center">Page {jobsPage}</span>
                  <Button variant="secondary" size="sm"
                    onClick={() => setJobsPage(p => p + 1)}
                    disabled={(data.jobs?.roles || []).length < 20}>Next</Button>
                </div>
              </>
            )}

            {/* ── TAB 3: CAREER PAGES ── */}
            {tab === 'career' && (
              <>
                <div className="flex gap-2 mb-4">
                  <Button size="sm" onClick={() => setShowImport(true)}>
                    <Upload size={13} /> Import CSV / Excel
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => load('career')}>
                    <RefreshCw size={13} /> Refresh
                  </Button>
                </div>

                <DataTable
                  columns={[
                    { key: 'company', label: 'Company', render: v => <span className="font-medium">{v || '—'}</span> },
                    { key: 'url', label: 'URL', render: v => v ? (
                      <a href={v} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-[12px] truncate max-w-[240px] inline-block">
                        {v.replace(/^https?:\/\//, '').slice(0, 50)}
                      </a>
                    ) : '—' },
                    { key: 'ats', label: 'ATS Type', render: v => v ? <Badge color="blue">{v}</Badge> : <Badge color="gray">Unknown</Badge> },
                    { key: 'status', label: 'Status', render: v => (
                      <Badge color={v === 'active' ? 'green' : v === 'pending' ? 'amber' : 'red'} dot>{v || 'pending'}</Badge>
                    )},
                  ]}
                  rows={data.careerPages || []}
                  emptyText="No career pages imported yet"
                />
              </>
            )}

            {/* ── TAB 4: MATCHING ── */}
            {tab === 'matching' && (
              <>
                <div className="flex gap-2 mb-4">
                  <Button size="sm" disabled={!!actionLoading}
                    onClick={() => runAction('Matching Pipeline', () => post('/api/v1/jobs/full-pipeline'))}
                    loading={actionLoading === 'Matching Pipeline'}>
                    <Play size={13} /> Run Matching
                  </Button>
                </div>

                <MatchingTable stats={data.matching} />
              </>
            )}
          </>
        )}
      </div>

      {/* ── Role Detail Modal ── */}
      <Modal open={!!jobDetail} onClose={() => setJobDetail(null)} title={jobDetail?.title || 'Role Detail'} width="max-w-2xl">
        {jobDetail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-400 text-[11px]">Company</span><p className="font-medium">{jobDetail.company || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Location</span><p>{jobDetail.location || '—'} {jobDetail.state ? `(${jobDetail.state})` : ''}</p></div>
              <div><span className="text-gray-400 text-[11px]">Type</span><p>{jobDetail.role_type || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Remote</span><p>{jobDetail.remote_type || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Pay Rate</span><p>{jobDetail.pay_rate || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Duration</span><p>{jobDetail.duration || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Source</span><p><Badge color="gray">{jobDetail.source}</Badge></p></div>
              <div><span className="text-gray-400 text-[11px]">Visa</span><p>{jobDetail.visa || '—'}</p></div>
              {jobDetail.end_client && <div><span className="text-gray-400 text-[11px]">End Client</span><p>{jobDetail.end_client}</p></div>}
              {jobDetail.posted_by && <div><span className="text-gray-400 text-[11px]">Posted By</span><p>{jobDetail.posted_by}</p></div>}
            </div>
            <div>
              <span className="text-gray-400 text-[11px]">Skills</span>
              <div className="mt-1">
                {(Array.isArray(jobDetail.skills) ? jobDetail.skills : []).map((s, i) => <SkillBadge key={i} skill={s} />)}
              </div>
            </div>
            {jobDetail.experience && (
              <div><span className="text-gray-400 text-[11px]">Experience</span><p className="text-[13px]">{jobDetail.experience}</p></div>
            )}
            {(jobDetail.contact_email || jobDetail.contact_phone || jobDetail.contact_linkedin) && (
              <div>
                <span className="text-gray-400 text-[11px]">Contact</span>
                <p className="text-[13px]">
                  {[jobDetail.contact_email, jobDetail.contact_phone, jobDetail.contact_linkedin].filter(Boolean).join(' | ')}
                </p>
              </div>
            )}
            {jobDetail.source_url && (
              <a href={jobDetail.source_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-brand-600 text-white hover:bg-brand-700">
                View Original <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* ── Scrape Modal ── */}
      <Modal open={showScrape} onClose={() => setShowScrape(false)} title="Trigger Scrape"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowScrape(false)}>Cancel</Button>
            <Button onClick={async () => {
              await runAction('Scrape', () => post('/api/v1/jobs/scrape', {
                sources: scrapeForm.sources.length ? scrapeForm.sources : [],
              }))
              setShowScrape(false)
            }} loading={actionLoading === 'Scrape'}>Start Scrape</Button>
          </div>
        }>
        <div className="space-y-3">
          <label className="field-label">Sources (leave empty for all)</label>
          <div className="flex gap-3 flex-wrap">
            {['indeed', 'linkedin', 'dice', 'career_page', 'glassdoor'].map(s => (
              <label key={s} className="flex items-center gap-1.5 text-[12px] cursor-pointer">
                <input type="checkbox" checked={scrapeForm.sources.includes(s)}
                  onChange={e => setScrapeForm(f => ({
                    ...f,
                    sources: e.target.checked ? [...f.sources, s] : f.sources.filter(x => x !== s),
                  }))} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Import CSV Modal ── */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Career Pages (CSV / Excel)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={async () => {
              const file = fileRef.current?.files?.[0]
              if (!file) return toast.error('Select a file')
              const fd = new FormData()
              fd.append('file', file)
              try {
                const res = await fetch('/api/v1/jobs/career-pages/import', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                  body: fd,
                })
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Import failed')
                const d = json.data || json
                toast.success(`Imported ${d.imported ?? 0} career pages (${d.duplicates ?? 0} duplicates)`)
                setShowImport(false)
                load('career')
              } catch (e) { toast.error(e.message) }
            }}>Upload</Button>
          </div>
        }>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="field-input" />
        <p className="text-[11px] text-gray-400 mt-2">CSV or Excel with columns: company_name, careers_url (or similar)</p>
      </Modal>
    </Page>
  )
}

// ── Inline Charts ────────────────────────────────────────────────────────────

function HBarChart({ data }) {
  const arr = Array.isArray(data)
    ? data
    : Object.entries(data).map(([name, count]) => ({ name, count }))
  const total = arr.reduce((s, d) => s + (d.count || 0), 0) || 1
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6']
  return (
    <div className="space-y-2">
      {arr.map((d, i) => {
        const val = d.count || 0
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-24 text-[11px] text-gray-500 truncate text-right">{d.name || '—'}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div className="h-full rounded-full transition-all flex items-center justify-end pr-1" style={{
                width: `${Math.max((val / total) * 100, 4)}%`, backgroundColor: colors[i % colors.length],
              }}>
                <span className="text-[9px] text-white font-bold">{val}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MatchingTable({ stats }) {
  const d = stats || {}
  const students = d.students || []

  if (Array.isArray(students) && students.length > 0) {
    return (
      <DataTable
        columns={[
          { key: 'name', label: 'Student', render: v => <span className="font-medium">{v || '—'}</span> },
          { key: 'technology', label: 'Technology', render: v => v ? <SkillBadge skill={v} /> : '—' },
          { key: 'recommendation_count', label: 'Recommendations', render: v => v ?? 0 },
          { key: 'avg_match_score', label: 'Avg Match Score', render: v => {
            const pct = typeof v === 'number' ? v : parseFloat(v) || 0
            return (
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-100 rounded-full h-2">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: pct > 80 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
                <span className="text-[11px] font-medium">{pct.toFixed(0)}%</span>
              </div>
            )
          }},
        ]}
        rows={students}
        emptyText="No matching data available"
      />
    )
  }

  // Fallback: show summary from scraper dashboard data
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Roles" value={d.total_roles ?? 0} icon="briefcase" color="brand" />
      <StatCard label="Active Roles" value={d.active_roles ?? 0} icon="trending" color="success" />
      <StatCard label="Career Pages" value={d.career_pages_tracked ?? 0} icon="building" color="purple" />
      <StatCard label="Sources" value={Object.keys(d.by_source || {}).length} icon="chart" color="warn" />
    </div>
  )
}
