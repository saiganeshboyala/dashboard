import { useState, useEffect } from 'react'
import { Page, StatCard, DataTable, Badge, Loading, Tabs, ScoreBar } from '../../components/Shared'
import { DrillDownModal, ClickableFunnel } from '../../components/DrillDown'
import { useToast } from '../../context/ToastContext'
import { getOverview, getBUComparison, getLeaderboard, getSubmissionTrends, getConversionFunnel, getTechDemand, getPipeline } from '../../utils/api'

function MiniBar({ data = [], labelKey, valueKey, color = '#3370ff', height = 100 }) {
  if (!data.length) return <p className="text-[12px] text-gray-300">No data</p>
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1)
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 group relative">
          <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
            {d[labelKey]}: {d[valueKey]}
          </div>
          <div className="w-full rounded-t min-h-[2px] transition-all duration-500"
            style={{ height: `${(d[valueKey] / max) * 100}%`, backgroundColor: color }} />
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const toast = useToast()
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [drillDown, setDrillDown] = useState(null)

  useEffect(() => {
    if (data[tab]) return
    setLoading(true)
    const fetchers = {
      overview:    () => getOverview(),
      'bu':        () => getBUComparison(),
      leaderboard: () => getLeaderboard(),
      trends:      () => getSubmissionTrends(30),
      funnel:      () => getConversionFunnel(),
      tech:        () => getTechDemand(),
      pipeline:    () => getPipeline(),
    }
    const fn = fetchers[tab]
    if (fn) fn().then(d => { setData(prev => ({ ...prev, [tab]: d })); setLoading(false) })
      .catch(e => { toast.error(`Failed to load ${tab}`); setLoading(false) })
    else setLoading(false)
  }, [tab])

  const d = data[tab]

  return (
    <Page title="Analytics" subtitle="Real-time business intelligence — click any chart to drill down">
      <Tabs active={tab} onChange={t => { setTab(t); setLoading(!data[t]) }} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'bu', label: 'BU Comparison' },
        { id: 'leaderboard', label: 'Leaderboard' },
        { id: 'trends', label: 'Trends' },
        { id: 'funnel', label: 'Funnel' },
        { id: 'tech', label: 'Technology' },
        { id: 'pipeline', label: 'Pipeline' },
      ]} />

      <div className="mt-6">
        {loading ? <Loading /> : !d ? <p className="text-gray-400 text-[13px]">No data available</p> : (
          <>
            {/* ═══ OVERVIEW — Clickable stat cards ═══ */}
            {tab === 'overview' && (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="cursor-pointer" onClick={() => setDrillDown({ title: 'All Students', endpoint: '/api/v1/analytics/drill-down/status' })}>
                    <StatCard label="Total Students" value={d.totalStudents} icon="users" color="brand" />
                  </div>
                  <div className="cursor-pointer" onClick={() => setDrillDown({ title: 'In Market Students', endpoint: '/api/v1/analytics/drill-down/status?status=In Market' })}>
                    <StatCard label="In Market" value={d.inMarket} icon="trending" color="warn" />
                  </div>
                  <div className="cursor-pointer" onClick={() => setDrillDown({ title: 'Placed Students', endpoint: '/api/v1/analytics/drill-down/funnel?stage=placed' })}>
                    <StatCard label="Placements" value={d.placed} icon="briefcase" color="success" />
                  </div>
                  <StatCard label="Placement Rate" value={`${d.placementRate}%`} icon="chart" color={parseFloat(d.placementRate) > 15 ? 'success' : 'warn'} />
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <StatCard label="Total Submissions" value={d.totalSubmissions} icon="file" color="gray" trend={d.trends?.submissions} />
                  <StatCard label="Total Interviews"  value={d.totalInterviews}  icon="calendar" color="gray" trend={d.trends?.interviews} />
                  <StatCard label="Week Submissions"  value={d.lastWeek?.submissions} icon="clipboard" color="brand" />
                  <StatCard label="Week Interviews"   value={d.lastWeek?.interviews}  icon="calendar"  color="brand" />
                </div>
              </>
            )}

            {/* ═══ BU COMPARISON — Click BU name to drill down ═══ */}
            {tab === 'bu' && (() => {
              const rows = Array.isArray(d) ? d : d?.bus || d?.data || []
              return (
                <>
                  <p className="text-xs text-blue-500 mb-3">Click a BU name to see its students</p>
                  <DataTable columns={[
                    { key: 'name', label: 'Business Unit', render: (v, row) => (
                      <span className="font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => setDrillDown({ title: `Students in ${v}`, endpoint: `/api/v1/analytics/drill-down/bu?buId=${row.id}` })}>
                        {v}
                      </span>
                    )},
                    { key: 'totalStudents', label: 'Students' },
                    { key: 'inMarket', label: 'In Market' },
                    { key: 'submissions', label: 'Subs' },
                    { key: 'interviews', label: 'Interviews' },
                    { key: 'placements', label: 'Placed', render: v => <span className="text-success-600 font-semibold">{v}</span> },
                    { key: 'placementRate', label: 'Rate', render: v => <Badge color={parseFloat(v) > 15 ? 'green' : 'amber'}>{v}%</Badge> },
                  ]} rows={rows} />
                </>
              )
            })()}

            {/* ═══ LEADERBOARD — Click recruiter name to drill down ═══ */}
            {tab === 'leaderboard' && (() => {
              const rows = Array.isArray(d) ? d : d?.recruiters || []
              return (
                <>
                  <p className="text-xs text-blue-500 mb-3">Click a recruiter name to see their students</p>
                  <DataTable columns={[
                    { key: 'rank', label: '#', render: (_, r) => <span className="font-bold text-gray-400 tabular-nums w-6 inline-block">{r.rank || '—'}</span> },
                    { key: 'name', label: 'Recruiter', render: (v, row) => (
                      <span className="font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => setDrillDown({ title: `Students of ${v}`, endpoint: `/api/v1/analytics/drill-down/recruiter?recruiterId=${row.id}` })}>
                        {v}
                      </span>
                    )},
                    { key: 'buName', label: 'BU' },
                    { key: 'submissions', label: 'Subs', render: v => <span className="tabular-nums font-medium">{v}</span> },
                    { key: 'interviews', label: 'Int' },
                    { key: 'placements', label: 'Placed', render: v => <span className="text-success-600 font-semibold">{v}</span> },
                    { key: 'conversionRate', label: 'Conv%', render: v => <Badge color={parseFloat(v) > 5 ? 'green' : parseFloat(v) > 0 ? 'amber' : 'gray'}>{v}%</Badge> },
                  ]} rows={rows} />
                </>
              )
            })()}

            {/* ═══ TRENDS ═══ */}
            {tab === 'trends' && (() => {
              const rows = Array.isArray(d) ? d : d?.trends || []
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div className="card p-5">
                    <h3 className="text-[13px] font-bold mb-1">Submission Trends</h3>
                    <p className="text-[11px] text-gray-400 mb-4">Last 30 days</p>
                    <MiniBar data={rows.slice(-30)} labelKey="date" valueKey="submissions" color="#3370ff" />
                  </div>
                  <div className="card p-5">
                    <h3 className="text-[13px] font-bold mb-1">Interview Trends</h3>
                    <p className="text-[11px] text-gray-400 mb-4">Last 30 days</p>
                    <MiniBar data={rows.slice(-30)} labelKey="date" valueKey="interviews" color="#f59e0b" />
                  </div>
                </div>
              )
            })()}

            {/* ═══ FUNNEL — Now clickable! ═══ */}
            {tab === 'funnel' && (() => {
              const rows = Array.isArray(d) ? d : d?.funnel || d?.stages || []
              return (
                <div className="card p-6">
                  <h3 className="text-[13px] font-bold mb-1">Conversion Funnel <span className="text-[11px] font-normal text-blue-500 ml-2">Click any stage to see records</span></h3>
                  <p className="text-[11px] text-gray-400 mb-6">Click a stage to drill down into student records</p>
                  <ClickableFunnel data={rows} />
                </div>
              )
            })()}

            {/* ═══ TECHNOLOGY — Click a tech to drill down ═══ */}
            {tab === 'tech' && (() => {
              const rows = Array.isArray(d) ? d : d?.technologies || d?.data || []
              return (
                <div className="card p-5">
                  <h3 className="text-[13px] font-bold mb-1">Technology Distribution <span className="text-[11px] font-normal text-blue-500 ml-2">Click to drill down</span></h3>
                  <div className="space-y-2.5 mt-4">
                    {rows.slice(0, 15).map(t => (
                      <div key={t.technology} className="cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
                        onClick={() => setDrillDown({
                          title: `Students: ${t.technology} (${t.count})`,
                          endpoint: `/api/v1/analytics/drill-down/technology?technology=${encodeURIComponent(t.technology)}`,
                        })}>
                        <ScoreBar label={t.technology || '—'} value={t.count || 0} max={rows[0]?.count || 1} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ═══ PIPELINE ═══ */}
            {tab === 'pipeline' && (() => {
              const rows = Array.isArray(d) ? d : d?.pipeline || d?.stages || []
              return (
                <>
                  <p className="text-xs text-blue-500 mb-3">Click a stage to see the students</p>
                  <DataTable columns={[
                    { key: 'stage', label: 'Stage', render: v => {
                      const stageKey = String(v).toLowerCase().replace(/\s+/g, '')
                      return (
                        <span className="font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => setDrillDown({ title: `Pipeline: ${v}`, endpoint: `/api/v1/analytics/drill-down/funnel?stage=${stageKey}` })}>
                          {v}
                        </span>
                      )
                    }},
                    { key: 'count', label: 'Count', render: v => <span className="tabular-nums font-semibold">{v}</span> },
                    { key: 'pct', label: '% Total', render: v => <Badge color="blue">{v}%</Badge> },
                  ]} rows={rows} />
                </>
              )
            })()}
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