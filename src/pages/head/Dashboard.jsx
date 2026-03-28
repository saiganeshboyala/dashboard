import { useState, useEffect, useRef, useCallback } from 'react'
import { PlacementPanel, RecruiterAIPanel, VendorAIPanel } from '../../components/AIInsights'
import { HeadExportMenu } from '../../components/ExportMenu'
import { DrillDownModal, ClickableBarChart, ClickablePieChart, ClickableFunnel } from '../../components/DrillDown'
import { Page, StatCard, DataTable, ScoreBar, Loading, Tabs, Badge } from '../../components/Shared'
import {
  getOverview, getBUComparison, getLeaderboard, getPipeline, getTechDemand,
  getSubmissionTrends, getDailyReport, getConversionFunnel, getVendorPerformance,
  getStudentAging, getRevenue, getTechPerformance, getRecruiterComparison
} from '../../utils/api'

const STATUS = { IDLE: 'idle', LOADING: 'loading', LOADED: 'loaded', ERROR: 'error' }

function BarChart({ data, labelKey, valueKey, color = 'bg-brand-500', height = 160 }) {
  if (!data?.length) return <p className="text-gray-300 text-sm py-4">No data</p>
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 group relative">
          <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
            {d[labelKey]}: {d[valueKey]}
          </div>
          <div
            className={`w-full ${color} rounded-t min-h-[2px] transition-all duration-500`}
            style={{ height: `${(d[valueKey] / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  )
}

// Clickable donut — click a slice → drill down to those students
function ClickableDonut({ data, size = 120, onSliceClick }) {
  if (!data?.length) return null
  const total = data.reduce((a, d) => a + d.count, 0)
  const colors = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']
  let cum = 0
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="4" />
        {data.map((d, i) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0
          const offset = 100 - cum
          cum += pct
          return (
            <circle
              key={i} cx="18" cy="18" r="14" fill="none"
              stroke={colors[i % colors.length]} strokeWidth="4"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
              transform="rotate(-90 18 18)"
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
              onClick={() => onSliceClick && onSliceClick(d)}
            />
          )
        })}
        <text x="18" y="18" textAnchor="middle" dominantBaseline="central" className="text-[6px] font-bold fill-gray-900">
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
            onClick={() => onSliceClick && onSliceClick(d)}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-gray-600">{d.status || d.range}</span>
            <span className="text-gray-400 font-mono">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

async function safe(fn, label = '') {
  try { return await fn() }
  catch (e) { console.warn(`Analytics fetch failed${label ? ` [${label}]` : ''}:`, e.message); return null }
}

function toArray(res, ...keys) {
  if (!res) return []
  for (const key of keys) { if (Array.isArray(res[key])) return res[key] }
  if (Array.isArray(res)) return res
  return []
}

export default function HeadDashboard() {
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [tabStatus, setTabStatus] = useState({})
  const [tabError, setTabError] = useState({})

  // Drill-down state — any tab can trigger this
  const [drillDown, setDrillDown] = useState(null)

  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState(null)
  const [aging, setAging] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [dailyReport, setDailyReport] = useState(null)
  const [vendors, setVendors] = useState(null)
  const [bus, setBus] = useState(null)
  const [recComp, setRecComp] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [tech, setTech] = useState(null)
  const [techPerf, setTechPerf] = useState(null)

  const setStatus = useCallback((tabId, status) =>
    setTabStatus(prev => ({ ...prev, [tabId]: status })), [])
  const isIdle    = (tabId) => !tabStatus[tabId] || tabStatus[tabId] === STATUS.IDLE
  const isLoading = (tabId) => tabStatus[tabId] === STATUS.LOADING
  const isError   = (tabId) => tabStatus[tabId] === STATUS.ERROR

  useEffect(() => {
    async function loadOverview() {
      setLoading(true)
      const s = await safe(getOverview, 'overview')
      setStats(s)
      setLoading(false)
      const t = await safe(() => getSubmissionTrends(30), 'trends')
      setTrends(t?.trends || toArray(t, 'trends', 'data'))
      const a = await safe(getStudentAging, 'aging')
      setAging(a)
    }
    loadOverview()
  }, [])

  useEffect(() => {
    if (tab === 'overview' || tab === 'ai') return
    if (!isIdle(tab)) return
    setStatus(tab, STATUS.LOADING)
    setTabError(prev => ({ ...prev, [tab]: null }))

    async function loadTab() {
      try {
        switch (tab) {
          case 'funnel': {
            const f = await safe(getConversionFunnel, 'funnel')
            if (!f) throw new Error('Failed to load funnel data')
            setFunnel(toArray(f, 'funnel', 'data', 'stages'))
            break
          }
          case 'daily': {
            const d = await safe(getDailyReport, 'daily')
            if (!d) throw new Error('Failed to load daily report')
            setDailyReport(d)
            break
          }
          case 'vendors': {
            const v = await safe(getVendorPerformance, 'vendors')
            if (!v) throw new Error('Failed to load vendor data')
            setVendors(toArray(v, 'vendors', 'data', 'results'))
            break
          }
          case 'bus': {
            const b = await safe(getBUComparison, 'bus')
            if (!b) throw new Error('Failed to load BU comparison data')
            setBus(toArray(b, 'bus', 'data', 'results', 'businessUnits'))
            break
          }
          case 'recruiters': {
            const r = await safe(getRecruiterComparison, 'recruiters')
            if (!r) throw new Error('Failed to load recruiter data')
            setRecComp(toArray(r, 'recruiters', 'data', 'results'))
            break
          }
          case 'revenue': {
            const r = await safe(getRevenue, 'revenue')
            if (!r) throw new Error('Failed to load revenue data')
            setRevenue(r)
            break
          }
          case 'tech': {
            const [t, tp] = await Promise.all([
              safe(getTechDemand, 'tech-demand'),
              safe(getTechPerformance, 'tech-perf'),
            ])
            if (!t && !tp) throw new Error('Failed to load technology data')
            setTech(toArray(t, 'technologies', 'data', 'results'))
            setTechPerf(toArray(tp, 'technologies', 'data', 'results'))
            break
          }
        }
        setStatus(tab, STATUS.LOADED)
      } catch (err) {
        console.error(`[HeadDashboard] Tab "${tab}" load error:`, err.message)
        setTabError(prev => ({ ...prev, [tab]: err.message }))
        setStatus(tab, STATUS.ERROR)
      }
    }
    loadTab()
  }, [tab, tabStatus])

  function retryTab(tabId) {
    setTabError(prev => ({ ...prev, [tabId]: null }))
    setStatus(tabId, STATUS.IDLE)
  }

  function TabError({ tabId }) {
    const msg = tabError[tabId]
    if (!msg) return null
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between mb-4">
        <p className="text-red-600 text-sm">{msg}</p>
        <button onClick={() => retryTab(tabId)} className="text-xs text-red-500 underline ml-4 shrink-0">Retry</button>
      </div>
    )
  }

  function TabContent({ tabId, data, emptyText = 'No data available', children }) {
    if (isLoading(tabId)) return <Loading />
    if (isError(tabId))   return null
    if (!data || (Array.isArray(data) && data.length === 0))
      return <p className="text-gray-400 text-sm">{emptyText}</p>
    return children
  }

  // ── Helper: open drill-down for a stat card click ──
  const openDrill = (title, endpoint) => setDrillDown({ title, endpoint })
  const openDrillObj = (title, object, field, value) => setDrillDown({ title, object, field, value })

  return (
    <Page
      title="Head Dashboard"
      subtitle={stats ? `${stats.totalStudents} students · ${stats.totalRecruiters} recruiters` : 'Loading...'}
      actions={<HeadExportMenu stats={stats} bus={bus} />}
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview',   label: 'Overview' },
          { id: 'daily',      label: 'Daily Report' },
          { id: 'funnel',     label: 'Funnel' },
          { id: 'vendors',    label: 'Vendors' },
          { id: 'ai',         label: 'AI Insights' },
          { id: 'bus',        label: 'BU Comparison' },
          { id: 'recruiters', label: 'Recruiters' },
          { id: 'revenue',    label: 'Revenue' },
          { id: 'tech',       label: 'Technology' },
        ]}
      />

      <div className="mt-6">

        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (
          <>
            {loading ? <Loading /> : stats ? (
              <>
                {/* Clickable stat cards — click any card to see the records */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="cursor-pointer" onClick={() => openDrill('All Students', '/api/v1/analytics/drill-down/status')}>
                    <StatCard label="Total students" value={stats.totalStudents} icon="users" color="brand" />
                  </div>
                  <div className="cursor-pointer" onClick={() => openDrill('In Market Students', '/api/v1/analytics/drill-down/status?status=In Market')}>
                    <StatCard label="In market" value={stats.inMarket} icon="trending" color="warn" />
                  </div>
                  <div className="cursor-pointer" onClick={() => openDrill('Placed Students', '/api/v1/analytics/drill-down/funnel?stage=placed')}>
                    <StatCard label="Placements" value={stats.placed} icon="briefcase" color="success" />
                  </div>
                  <StatCard label="Placement rate" value={`${stats.placementRate}%`} icon="chart"
                    color={parseFloat(stats.placementRate) > 15 ? 'success' : 'warn'} />
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <StatCard label="Total submissions"    value={stats.totalSubmissions}     icon="file"      color="gray" trend={stats.trends?.submissions} />
                  <StatCard label="Total interviews"     value={stats.totalInterviews}      icon="calendar"  color="gray" trend={stats.trends?.interviews} />
                  <StatCard label="This week subs"       value={stats.lastWeek?.submissions} icon="clipboard" color="brand" />
                  <StatCard label="This week interviews" value={stats.lastWeek?.interviews}  icon="calendar"  color="brand" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Submission Trends</h3>
                    <p className="text-xs text-gray-400 mb-4">Last 30 days</p>
                    {trends
                      ? <BarChart data={trends.slice(-30)} labelKey="date" valueKey="submissions" color="bg-brand-400" />
                      : <p className="text-xs text-gray-300">Loading chart...</p>}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Interview Trends</h3>
                    <p className="text-xs text-gray-400 mb-4">Last 30 days</p>
                    {trends
                      ? <BarChart data={trends.slice(-30)} labelKey="date" valueKey="interviews" color="bg-warn-400" />
                      : <p className="text-xs text-gray-300">Loading chart...</p>}
                  </div>
                </div>

                {/* CLICKABLE Aging Donut — click a slice → see those students */}
                {aging && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Student Aging <span className="text-xs font-normal text-blue-500 ml-2">Click a segment to drill down</span></h3>
                    <p className="text-xs text-gray-400 mb-4">
                      {aging.totalInMarket} in market · avg {aging.avgDays} days · {aging.critical} critical (90+ days)
                    </p>
                    <ClickableDonut
                      data={aging.distribution?.map(x => ({ status: x.range + ' days', range: x.range, count: x.count })) || []}
                      onSliceClick={(d) => {
                        const range = d.range || d.status?.replace(' days', '')
                        const mappedRange = range === '90+' ? '90plus' : range
                        setDrillDown({
                          title: `Students: ${d.status} (${d.count})`,
                          endpoint: `/api/v1/analytics/drill-down/aging?range=${mappedRange}`,
                        })
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-400">Failed to load overview</p>
            )}
          </>
        )}

        {/* ═══ AI INSIGHTS ═══ */}
        {tab === 'ai' && (
          <>
            <PlacementPanel />
            <div className="mt-6"><RecruiterAIPanel /></div>
            <div className="mt-6"><VendorAIPanel /></div>
          </>
        )}

        {/* ═══ DAILY REPORT ═══ */}
        {tab === 'daily' && (
          <>
            <TabError tabId="daily" />
            <TabContent tabId="daily" data={dailyReport} emptyText="No daily report data">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Today submissions"  value={dailyReport?.today?.subCount || 0}     icon="clipboard" color={dailyReport?.today?.subCount > 0 ? 'success' : 'danger'} />
                <StatCard label="Today interviews"   value={dailyReport?.today?.intCount || 0}     icon="calendar"  color="brand" />
                <StatCard label="Yesterday subs"     value={dailyReport?.yesterday?.subCount || 0} icon="clipboard" color="gray" />
                <StatCard label="Yesterday int"      value={dailyReport?.yesterday?.intCount || 0} icon="calendar"  color="gray" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Today ({dailyReport?.today?.date})</h3>
                  {dailyReport?.today?.submissions?.length > 0 ? (
                    <DataTable searchable={false} columns={[
                      { key: 'student', label: 'Student', render: v => v ? `${v.firstName} ${v.lastName || ''}` : '—' },
                      { key: 'clientName', label: 'Client' },
                      { key: 'vendorCompany', label: 'Vendor' },
                      { key: 'rate', label: 'Rate', render: v => v ? `$${v}` : '—' },
                    ]} rows={dailyReport.today.submissions} />
                  ) : (
                    <div className="bg-white border rounded-xl p-8 text-center text-gray-400 text-sm">No submissions today</div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Yesterday ({dailyReport?.yesterday?.date})</h3>
                  {dailyReport?.yesterday?.submissions?.length > 0 ? (
                    <DataTable searchable={false} columns={[
                      { key: 'student', label: 'Student', render: v => v ? `${v.firstName} ${v.lastName || ''}` : '—' },
                      { key: 'clientName', label: 'Client' },
                      { key: 'vendorCompany', label: 'Vendor' },
                      { key: 'rate', label: 'Rate', render: v => v ? `$${v}` : '—' },
                    ]} rows={dailyReport.yesterday.submissions} />
                  ) : (
                    <div className="bg-white border rounded-xl p-8 text-center text-gray-400 text-sm">No submissions yesterday</div>
                  )}
                </div>
              </div>
            </TabContent>
          </>
        )}

        {/* ═══ FUNNEL — Now clickable! ═══ */}
        {tab === 'funnel' && (
          <>
            <TabError tabId="funnel" />
            <TabContent tabId="funnel" data={funnel} emptyText="No funnel data available">
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-card">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Conversion Funnel <span className="text-xs font-normal text-blue-500 ml-2">Click any stage to see records</span></h3>
                <p className="text-xs text-gray-400 mb-6">Click a stage to drill down into the actual student records</p>
                <ClickableFunnel data={funnel} />
              </div>
            </TabContent>
          </>
        )}

        {/* ═══ VENDORS — Click a row to see their submissions ═══ */}
        {tab === 'vendors' && (
          <>
            <TabError tabId="vendors" />
            <TabContent tabId="vendors" data={vendors} emptyText="No vendor data">
              <p className="text-xs text-blue-500 mb-3">Click a vendor name to see all their submissions</p>
              <DataTable
                columns={[
                  { key: 'vendor', label: 'Vendor', render: v => (
                    <span className="font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => openDrillObj(`Submissions: ${v}`, 'submissions', 'vendor_company', v)}>
                      {v || '—'}
                    </span>
                  )},
                  { key: 'submissions',    label: 'Submissions' },
                  { key: 'interviews',     label: 'Interviews' },
                  { key: 'confirmations',  label: 'Confirmed', render: v => <span className="font-semibold text-success-600">{v}</span> },
                  { key: 'conversionRate', label: 'Conv%', render: v => <Badge color={parseFloat(v) > 5 ? 'green' : parseFloat(v) > 0 ? 'amber' : 'gray'}>{v}%</Badge> },
                ]}
                rows={vendors}
              />
            </TabContent>
          </>
        )}

        {/* ═══ BU COMPARISON — Click a BU bar to see its students ═══ */}
        {tab === 'bus' && (
          <>
            <TabError tabId="bus" />
            <TabContent tabId="bus" data={bus} emptyText="No BU data">
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card mb-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Placements by BU <span className="text-xs font-normal text-blue-500 ml-2">Click a bar to drill down</span></h3>
                  <p className="text-xs text-gray-400 mb-4">Click any bar to see the students in that BU</p>
                  <ClickableBarChart
                    data={bus}
                    dataKey="placements"
                    nameKey="name"
                    drillDown={{ object: 'students', field: 'bu_id', endpoint: '/api/v1/analytics/drill-down/bu' }}
                    title="Students in BU"
                    color="#22c55e"
                    height={140}
                  />
                </div>
                <p className="text-xs text-blue-500 mb-3">Click a BU name to see its students</p>
                <DataTable
                  columns={[
                    { key: 'name', label: 'BU', render: (v, row) => (
                      <span className="font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => setDrillDown({ title: `Students in ${v}`, endpoint: `/api/v1/analytics/drill-down/bu?buId=${row.id}` })}>
                        {v}
                      </span>
                    )},
                    { key: 'totalStudents', label: 'Students' },
                    { key: 'inMarket',      label: 'In Market' },
                    { key: 'submissions',   label: 'Subs' },
                    { key: 'interviews',    label: 'Int' },
                    { key: 'placements',    label: 'Placed', render: v => <span className="font-semibold text-success-600">{v}</span> },
                    { key: 'placementRate', label: 'Rate', render: v => <Badge color={parseFloat(v) > 15 ? 'green' : 'amber'}>{v}%</Badge> },
                  ]}
                  rows={bus}
                />
              </>
            </TabContent>
          </>
        )}

        {/* ═══ RECRUITERS — Click a recruiter to see their students ═══ */}
        {tab === 'recruiters' && (
          <>
            <TabError tabId="recruiters" />
            <TabContent tabId="recruiters" data={recComp} emptyText="No recruiter data">
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card mb-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Weekly Submissions</h3>
                  <BarChart data={recComp?.slice(0, 15)} labelKey="name" valueKey="weeklySubmissions" color="bg-brand-400" height={120} />
                </div>
                <p className="text-xs text-blue-500 mb-3">Click a recruiter name to see their students</p>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Recruiter', render: (v, row) => (
                      <span className="font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => setDrillDown({ title: `Students of ${v}`, endpoint: `/api/v1/analytics/drill-down/recruiter?recruiterId=${row.id}` })}>
                        {v}
                      </span>
                    )},
                    { key: 'buName',            label: 'BU' },
                    { key: 'students',          label: 'Students' },
                    { key: 'submissions',       label: 'Total Subs' },
                    { key: 'weeklySubmissions', label: 'Week', render: v => <span className="font-semibold text-brand-600">{v}</span> },
                    { key: 'interviews',        label: 'Int' },
                    { key: 'placements',        label: 'Placed', render: v => <span className="font-semibold text-success-600">{v}</span> },
                    { key: 'conversionRate',    label: 'Conv%', render: v => <Badge color={parseFloat(v) > 5 ? 'green' : parseFloat(v) > 0 ? 'amber' : 'gray'}>{v}%</Badge> },
                  ]}
                  rows={recComp}
                />
              </>
            </TabContent>
          </>
        )}

        {/* ═══ REVENUE ═══ */}
        {tab === 'revenue' && (
          <>
            <TabError tabId="revenue" />
            <TabContent tabId="revenue" data={revenue} emptyText="No revenue data">
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="cursor-pointer" onClick={() => openDrill('All Placements', '/api/v1/analytics/drill-down/funnel?stage=placed')}>
                    <StatCard label="Total placements" value={revenue?.totalPlacements} icon="briefcase" color="success" />
                  </div>
                  <StatCard label="Avg bill rate"    value={`$${revenue?.avgBillRate}/hr`} icon="trending"  color="brand" />
                  <StatCard label="Max rate"         value={`$${revenue?.maxBillRate}/hr`} icon="chart"     color="success" />
                  <StatCard label="Min rate"         value={`$${revenue?.minBillRate}/hr`} icon="chart"     color="warn" />
                </div>
                {revenue?.monthlyPlacements?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Monthly Placements</h3>
                    <BarChart data={revenue.monthlyPlacements} labelKey="month" valueKey="count" color="bg-success-400" height={140} />
                  </div>
                )}
              </>
            </TabContent>
          </>
        )}

        {/* ═══ TECHNOLOGY — Click a tech to see those students ═══ */}
        {tab === 'tech' && (
          <>
            <TabError tabId="tech" />
            <TabContent tabId="tech" data={tech} emptyText="No tech data">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Distribution <span className="text-xs font-normal text-blue-500 ml-2">Click a tech to drill down</span></h3>
                  <div className="space-y-3 mt-4">
                    {tech?.slice(0, 12).map(t => (
                      <div key={t.technology} className="cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
                        onClick={() => setDrillDown({
                          title: `Students: ${t.technology} (${t.count})`,
                          endpoint: `/api/v1/analytics/drill-down/technology?technology=${encodeURIComponent(t.technology)}`,
                        })}>
                        <ScoreBar label={t.technology || '—'} value={t.count} max={tech[0]?.count || 1} />
                      </div>
                    ))}
                  </div>
                </div>
                {techPerf?.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-500 mb-3">Click a technology name to see students</p>
                    <DataTable
                      searchable={false}
                      columns={[
                        { key: 'technology', label: 'Tech', render: (v) => (
                          <span className="font-medium text-blue-600 cursor-pointer hover:underline"
                            onClick={() => setDrillDown({
                              title: `Students: ${v}`,
                              endpoint: `/api/v1/analytics/drill-down/technology?technology=${encodeURIComponent(v)}`,
                            })}>
                            {v}
                          </span>
                        )},
                        { key: 'total',         label: 'Students' },
                        { key: 'inMarket',      label: 'In Market' },
                        { key: 'placed',        label: 'Placed', render: v => <span className="text-success-600 font-semibold">{v}</span> },
                        { key: 'placementRate', label: 'Rate', render: v => <Badge color={parseFloat(v) > 20 ? 'green' : parseFloat(v) > 0 ? 'amber' : 'gray'}>{v}%</Badge> },
                      ]}
                      rows={techPerf}
                    />
                  </div>
                )}
              </div>
            </TabContent>
          </>
        )}

      </div>

      {/* ═══ GLOBAL DRILL-DOWN MODAL ═══ */}
      {drillDown && (
        <DrillDownModal
          title={drillDown.title}
          object={drillDown.object}
          field={drillDown.field}
          value={drillDown.value}
          endpoint={drillDown.endpoint}
          onClose={() => setDrillDown(null)}
          onRowClick={(id) => {
            setDrillDown(null)
            window.location.href = `/head/students/${id}`
          }}
        />
      )}
    </Page>
  )
}