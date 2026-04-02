import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, FunnelChart, Funnel, LabelList,
} from 'recharts'
import api from '../../utils/api'
import { Page } from '../../components/ui/Page'
import { Tabs } from '../../components/ui/Tabs'
import { DataTable } from '../../components/ui/DataTable'
import { Loading } from '../../components/ui/Loading'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'

// ─── Colors ───────────────────────────────────────────────────────────────────
const TECH_COLORS = {
  JAVA: '#3B82F6', DE: '#8B5CF6', '.NET': '#10B981',
  SFDC: '#F59E0B', DevOps: '#EF4444',
}
const RISK_COLORS = { HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981', 'N/A': '#9CA3AF' }
const CHART_PALETTE = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#F97316','#84CC16']

// ─── Shared helpers ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red:   'bg-red-50 border-red-200 text-red-700',
    gray:  'bg-gray-50 border-gray-200 text-gray-600',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-[24px] font-bold mt-1">{value ?? '—'}</p>
      {sub && <p className="text-[11px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      {title && <h3 className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide mb-3">{title}</h3>}
      {children}
    </div>
  )
}

const TAB_ENDPOINTS = {
  overview:    '/api/v1/ai/analytics/descriptive',
  diagnostics: '/api/v1/ai/analytics/diagnostic',
  predictions: '/api/v1/ai/predict/bulk?status=In Market&limit=100',
  actions:     '/api/v1/ai/analytics/prescriptive',
}

// ─── TAB 1: Overview ─────────────────────────────────────────────────────────
function OverviewTab({ data, loading, error }) {
  if (loading) return <Loading />
  if (error)   return <Alert variant="warn">{error}</Alert>
  if (!data)   return null

  const { overview, by_technology = [], by_bu = [], by_batch = [], submission_trends = [], interview_trends = [], funnel } = data

  const funnelData = funnel ? [
    { name: 'Total Students',      value: funnel.total_students       || 0 },
    { name: 'With Submissions',    value: funnel.students_with_subs   || 0 },
    { name: 'With Interviews',     value: funnel.students_with_interviews || 0 },
    { name: 'Placed',              value: funnel.placed               || 0 },
  ] : []

  // Merge sub + interview trends by week
  const weekMap = {}
  submission_trends.forEach(r => {
    const k = r.week; if (!weekMap[k]) weekMap[k] = { week: k }
    weekMap[k].submissions = r.submissions
  })
  interview_trends.forEach(r => {
    const k = r.week; if (!weekMap[k]) weekMap[k] = { week: k }
    weekMap[k].interviews = r.interviews
  })
  const trendData = Object.values(weekMap).sort((a, b) => a.week > b.week ? 1 : -1)

  const batchCols = [
    { key: 'batch',    label: 'Batch',    render: v => <span className="font-medium">{v}</span> },
    { key: 'count',    label: 'Students' },
    { key: 'placed',   label: 'Placed' },
    { key: 'avg_days', label: 'Avg Days' },
  ]

  return (
    <div className="space-y-5">
      {/* Stat row */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Total Students" value={overview.total_students} color="blue" />
        <StatCard label="In Market"      value={overview.in_market}      color="amber" />
        <StatCard label="Placed"         value={overview.placed}         color="green" />
        <StatCard label="Exited"         value={overview.exited}         color="red" />
        <StatCard label="Avg Days in Market" value={overview.avg_days_in_market} sub="active students" color="gray" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Funnel */}
        <SectionCard title="Placement Funnel">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Technology pie */}
        <SectionCard title="Students by Technology">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={by_technology.slice(0, 8)}
                dataKey="count"
                nameKey="technology"
                cx="50%" cy="50%"
                outerRadius={80}
                label={({ technology, count }) => `${technology}: ${count}`}
                labelLine={false}
              >
                {by_technology.slice(0, 8).map((entry, i) => (
                  <Cell key={i} fill={TECH_COLORS[entry.technology] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n, p) => [v, p.payload.technology]} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* BU bar chart */}
      <SectionCard title="Students per Business Unit">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={by_bu.slice(0, 12)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bu_name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total_students" name="Total"  fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="placed"         name="Placed" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Trends */}
      {trendData.length > 0 && (
        <SectionCard title="Activity Trends (Last 4 Weeks)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="submissions" name="Submissions" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="interviews"  name="Interviews"  stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Batch table */}
      <SectionCard title="Batch Breakdown">
        <DataTable columns={batchCols} rows={by_batch} pageSize={8} />
      </SectionCard>
    </div>
  )
}

// ─── TAB 2: Diagnostics ───────────────────────────────────────────────────────
function DiagnosticsTab({ data, loading, error }) {
  if (loading) return <Loading />
  if (error)   return <Alert variant="warn">{error}</Alert>
  if (!data)   return null

  const { feature_importance = [], bu_comparison = [], tech_comparison = [], bottlenecks = [] } = data

  const maxRate = Math.max(...bu_comparison.map(r => parseFloat(r.rate) || 0), 1)

  const buCols = [
    { key: 'name',           label: 'BU',             render: (v, row) => {
      const rate = parseFloat(row.rate) || 0
      const isTop = rate === maxRate
      return <span className={`font-medium ${isTop ? 'text-green-700' : ''}`}>{v}</span>
    }},
    { key: 'students',       label: 'Students' },
    { key: 'placed',         label: 'Placed' },
    { key: 'rate',           label: 'Rate %',         render: (v, row) => {
      const r = parseFloat(v) || 0
      const maxR = maxRate
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${(r / maxR) * 100}%` }} />
          </div>
          <span className="text-[12px]">{r}%</span>
        </div>
      )
    }},
    { key: 'avg_days',       label: 'Avg Days' },
    { key: 'recruiter_count', label: 'Recruiters' },
  ]

  const severityBadge = (s) => ({
    HIGH:   <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">HIGH</span>,
    MEDIUM: <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">MEDIUM</span>,
    LOW:    <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">LOW</span>,
  }[s] || s)

  return (
    <div className="space-y-5">
      {/* Feature importance */}
      {feature_importance.length > 0 && (
        <SectionCard title="What Predicts Placement? (Top Features)">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={feature_importance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={200} />
              <Tooltip formatter={(v) => [v.toFixed(4), 'Importance']} />
              <Bar dataKey="importance" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                {feature_importance.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#10B981' : i < 7 ? '#3B82F6' : '#8B5CF6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide mb-3">Critical Issues</h3>
          <div className="grid grid-cols-1 gap-3">
            {bottlenecks.map((b, i) => (
              <div key={i} className={`border rounded-xl p-4 ${b.severity === 'HIGH' ? 'bg-red-50 border-red-200' : b.severity === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  {severityBadge(b.severity)}
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-800">{b.issue}</p>
                    <p className="text-[12px] text-gray-600 mt-0.5">{b.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BU comparison table */}
      <SectionCard title="BU Comparison">
        <DataTable columns={buCols} rows={bu_comparison} pageSize={10} />
      </SectionCard>

      {/* Technology placement rate */}
      {tech_comparison.length > 0 && (
        <SectionCard title="Placement Rate by Technology">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tech_comparison}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="technology" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="rate"  orientation="left"  tick={{ fontSize: 11 }} label={{ value: 'Rate %', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <YAxis yAxisId="days"  orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Days',   angle:  90, position: 'insideRight', fontSize: 10 }} />
              <Tooltip />
              <Bar yAxisId="rate" dataKey="placement_rate"   name="Placement Rate %" radius={[4, 4, 0, 0]}>
                {tech_comparison.map((entry, i) => (
                  <Cell key={i} fill={TECH_COLORS[entry.technology] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
              <Bar yAxisId="days" dataKey="avg_days_to_place" name="Avg Days to Place" fill="#8B5CF650" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  )
}

// ─── TAB 3: Predictions ───────────────────────────────────────────────────────
function PredictionsTab({ data, loading, error }) {
  const navigate = useNavigate()
  const [techFilter,   setTechFilter]   = useState('')
  const [riskFilter,   setRiskFilter]   = useState('')
  const [quickFilter,  setQuickFilter]  = useState('')  // 'atRisk' | 'ready' | ''

  if (loading) return <Loading />
  if (error)   return <Alert variant="warn">{error}</Alert>
  if (!data)   return null

  const students = data.students || []

  // Unique filter options
  const techs = [...new Set(students.map(s => s.technology).filter(Boolean))]
  const risks  = ['HIGH', 'MEDIUM', 'LOW', 'N/A']

  let filtered = students
  if (techFilter)  filtered = filtered.filter(s => s.technology === techFilter)
  if (riskFilter)  filtered = filtered.filter(s => s.exit_risk === riskFilter)
  if (quickFilter === 'atRisk') filtered = filtered.filter(s => s.exit_risk === 'HIGH')
  if (quickFilter === 'ready')  filtered = filtered.filter(s => (s.placement_probability || 0) >= 70)

  const exportCSV = () => {
    const headers = ['Name','Technology','Days','Submissions','Interviews','Placement %','Exit Risk','Predicted Days']
    const rows = filtered.map(s => [
      s.student_name, s.technology, s.days_in_market, s.total_submissions,
      s.total_interviews, s.placement_probability, s.exit_risk, s.predicted_days,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'predictions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const cols = [
    { key: 'student_name',          label: 'Name',           render: v => <span className="font-medium text-blue-700">{v}</span> },
    { key: 'technology',            label: 'Technology',
      render: v => <span style={{ color: TECH_COLORS[v] || '#6B7280' }} className="font-medium">{v || '—'}</span> },
    { key: 'days_in_market',        label: 'Days' },
    { key: 'total_submissions',     label: 'Submissions' },
    { key: 'total_interviews',      label: 'Interviews' },
    { key: 'placement_probability', label: 'Placement %',
      render: v => {
        const pct = v || 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full" style={{
                width: `${Math.min(pct, 100)}%`,
                backgroundColor: pct >= 70 ? '#10B981' : pct >= 30 ? '#F59E0B' : '#EF4444',
              }} />
            </div>
            <span className="text-[12px]">{pct}%</span>
          </div>
        )
      }},
    { key: 'exit_risk', label: 'Exit Risk',
      render: v => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
          style={{ color: RISK_COLORS[v] || '#9CA3AF', borderColor: RISK_COLORS[v] || '#9CA3AF', backgroundColor: `${RISK_COLORS[v]}15` }}>
          {v || 'N/A'}
        </span>
      )},
    { key: 'predicted_days', label: 'Pred. Days', render: v => v ? `~${v}d` : '—' },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={techFilter}
          onChange={e => { setTechFilter(e.target.value); setQuickFilter('') }}
          className="text-[12px] border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All Technologies</option>
          {techs.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={riskFilter}
          onChange={e => { setRiskFilter(e.target.value); setQuickFilter('') }}
          className="text-[12px] border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All Risk Levels</option>
          {risks.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={() => { setQuickFilter(q => q === 'atRisk' ? '' : 'atRisk'); setTechFilter(''); setRiskFilter('') }}
          className={`text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors ${quickFilter === 'atRisk' ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'}`}
        >
          🚨 At Risk
        </button>
        <button
          onClick={() => { setQuickFilter(q => q === 'ready' ? '' : 'ready'); setTechFilter(''); setRiskFilter('') }}
          className={`text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors ${quickFilter === 'ready' ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
        >
          ✅ Ready to Place
        </button>
        {(techFilter || riskFilter || quickFilter) && (
          <button
            onClick={() => { setTechFilter(''); setRiskFilter(''); setQuickFilter('') }}
            className="text-[12px] text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
        <div className="ml-auto">
          <button onClick={exportCSV} className="text-[12px] px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium">
            ↓ Export CSV
          </button>
        </div>
      </div>

      <p className="text-[12px] text-gray-500">{filtered.length} students</p>

      <DataTable
        columns={cols}
        rows={filtered}
        pageSize={20}
        searchable
        onRowClick={row => navigate(`/head/students/${row.student_id}`)}
      />
    </div>
  )
}

// ─── TAB 4: Actions (Prescriptive) ────────────────────────────────────────────
function ActionsTab({ data, loading, error }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState({})

  if (loading) return <Loading />
  if (error)   return <Alert variant="warn">{error}</Alert>
  if (!data)   return null

  const { urgent_actions = [], weekly_stats = {}, targets = {} } = data

  const toggle = (i) => setExpanded(p => ({ ...p, [i]: !p[i] }))

  const progressBar = (value, target, color = '#3B82F6') => {
    const pct = Math.min(Math.round((value / target) * 100), 100)
    return (
      <div>
        <div className="flex justify-between text-[12px] text-gray-600 mb-1">
          <span>{value ?? 0} / {target} target</span>
          <span>{pct}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    )
  }

  const weeklyChange = (current, prev) => {
    if (!prev || prev === 0) return null
    const diff = ((current - prev) / prev * 100).toFixed(0)
    return diff > 0
      ? <span className="text-green-600 text-[11px] font-medium">↑ {diff}%</span>
      : <span className="text-red-600 text-[11px] font-medium">↓ {Math.abs(diff)}%</span>
  }

  return (
    <div className="space-y-5">
      {/* Urgent action cards */}
      {urgent_actions.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-green-700 font-semibold">No urgent actions needed — things look good!</p>
        </div>
      )}
      {urgent_actions.map((action, i) => (
        <div key={i} className={`border rounded-xl overflow-hidden shadow-sm ${action.priority === 1 ? 'border-red-200' : 'border-amber-200'}`}>
          <div className={`px-4 py-3 flex items-center justify-between cursor-pointer ${action.priority === 1 ? 'bg-red-50' : 'bg-amber-50'}`} onClick={() => toggle(i)}>
            <div>
              <span className="text-[11px] font-semibold mr-2" style={{ color: action.priority === 1 ? '#DC2626' : '#D97706' }}>
                PRIORITY {action.priority}
              </span>
              <span className="text-[13px] font-semibold text-gray-800">{action.action}</span>
              <p className="text-[12px] text-gray-500 mt-0.5">{action.details}</p>
            </div>
            <span className="text-gray-400 text-xs ml-4">{expanded[i] ? '▼' : '▶'}</span>
          </div>
          {expanded[i] && action.students?.length > 0 && (
            <div className="p-4 bg-white divide-y divide-gray-100">
              {action.students.map((s, j) => (
                <div
                  key={j}
                  className="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded px-2"
                  onClick={() => navigate(`/head/students/${s.id}`)}
                >
                  <div>
                    <p className="text-[13px] font-medium text-blue-700">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-[11px] text-gray-500">{s.technology} • {s.days_in_market} days</p>
                  </div>
                  <span className="text-gray-400 text-xs">→</span>
                </div>
              ))}
              {action.total_affected > action.students.length && (
                <p className="text-[11px] text-gray-400 pt-2 text-center">
                  + {action.total_affected - action.students.length} more students
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Weekly progress */}
      <SectionCard title="Weekly Progress">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-gray-700">Submissions</span>
              {weeklyChange(weekly_stats.subs_this_week, weekly_stats.subs_last_week)}
            </div>
            {progressBar(weekly_stats.subs_this_week, targets.submissions_per_week, '#3B82F6')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-gray-700">Interviews</span>
              {weeklyChange(weekly_stats.intv_this_week, weekly_stats.intv_last_week)}
            </div>
            {progressBar(weekly_stats.intv_this_week, targets.interviews_per_week, '#8B5CF6')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-gray-700">Monthly Placements Target</span>
            </div>
            {progressBar(0, targets.placements_per_month, '#10B981')}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview'    },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'actions',     label: 'Actions'     },
]

export default function AIAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  // tabData caches fetched results per tab — switching back is instant
  const [tabData,   setTabData]   = useState({})
  const [tabError,  setTabError]  = useState({})
  const [loading,   setLoading]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadTab = useCallback(async (tab, force = false) => {
    if (!force && tabData[tab]) return   // already cached
    setLoading(true)
    setTabError(e => ({ ...e, [tab]: null }))
    try {
      const data = await api.get(TAB_ENDPOINTS[tab])
      setTabData(d => ({ ...d, [tab]: data }))
    } catch {
      setTabError(e => ({ ...e, [tab]: 'Failed to load — is the analytics service running?' }))
    }
    setLoading(false)
  }, [tabData])

  // Load overview on mount, load any tab on switch
  useEffect(() => { loadTab(activeTab) }, [activeTab])   // eslint-disable-line

  const handleRefresh = async () => {
    setRefreshing(true)
    setTabData({})
    setTabError({})
    // Clear both caches
    try { await api.post('/api/v1/ai/cache/clear') } catch { /* ignore */ }
    // Re-fetch current tab with cleared state
    setLoading(true)
    try {
      const data = await api.get(TAB_ENDPOINTS[activeTab])
      setTabData({ [activeTab]: data })
    } catch {
      setTabError({ [activeTab]: 'Failed to load after refresh.' })
    }
    setLoading(false)
    setRefreshing(false)
  }

  const tabProps = (tab) => ({
    data:    tabData[tab]  || null,
    loading: loading && activeTab === tab && !tabData[tab],
    error:   tabError[tab] || null,
  })

  return (
    <Page
      title="AI Analytics"
      subtitle="Powered by Random Forest models trained on your CRM data"
      actions={
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-5">
        {activeTab === 'overview'    && <OverviewTab    {...tabProps('overview')}    />}
        {activeTab === 'diagnostics' && <DiagnosticsTab {...tabProps('diagnostics')} />}
        {activeTab === 'predictions' && <PredictionsTab {...tabProps('predictions')} />}
        {activeTab === 'actions'     && <ActionsTab     {...tabProps('actions')}     />}
      </div>
    </Page>
  )
}
