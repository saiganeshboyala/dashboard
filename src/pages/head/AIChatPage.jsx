import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import api from '../../utils/api'
import { Page } from '../../components/ui/Page'
import { DataTable } from '../../components/ui/DataTable'

// ─── Constants ─────────────────────────────────────────────────────────────────
const CHART_PALETTE = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#F97316','#84CC16']
const RISK_COLORS   = { HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981', 'N/A': '#9CA3AF' }

const TYPE_BADGES = {
  sql:        { label: 'Live Data',     bg: 'bg-blue-100',   text: 'text-blue-700' },
  prediction: { label: 'ML Prediction', bg: 'bg-purple-100', text: 'text-purple-700' },
  analytics:  { label: 'Analytics',     bg: 'bg-green-100',  text: 'text-green-700' },
  combined:   { label: 'ML + Data',     bg: 'bg-amber-100',  text: 'text-amber-700' },
  error:      { label: 'Error',         bg: 'bg-red-100',    text: 'text-red-700' },
}

// ─── Fallback quick questions (used if API fails) ─────────────────────────────
const FALLBACK_QUESTIONS = [
  { text: 'Students with 500+ days in market', icon: '⏰', category: 'sql' },
  { text: 'Who is likely to exit in the next 30 days?', icon: '🚨', category: 'ml' },
  { text: 'Compare BU performance this month', icon: '📊', category: 'sql' },
  { text: 'Top 10 vendors by interview conversion', icon: '🏆', category: 'sql' },
  { text: 'What should I do about idle students?', icon: '💡', category: 'analytics' },
  { text: 'Total proxy investment by technology', icon: '💰', category: 'sql' },
]

// ─── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const badge = TYPE_BADGES[type]
  if (!badge) return null
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  )
}

// ─── SQL Table Response ───────────────────────────────────────────────────────
function SQLTableResponse({ data, onExport }) {
  const { table, chart, insights, recommendations, sql, followUpQuestions, rowCount } = data
  const [showSQL, setShowSQL] = useState(false)
  const maxDisplay = 50

  return (
    <div className="space-y-3">
      {/* Data Table */}
      {table && (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {table.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.slice(0, maxDisplay).map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rowCount > maxDisplay && (
            <p className="text-[11px] text-gray-400 px-3 py-2 bg-gray-50 border-t">
              Showing {maxDisplay} of {rowCount} rows. Export CSV for full data.
            </p>
          )}
        </div>
      )}

      {/* Chart */}
      {chart && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">{chart.title}</p>
          {chart.type === 'bar' ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart.labels.map((l, i) => ({ name: l, value: chart.values[i] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" name={chart.valueLabel} radius={[4, 4, 0, 0]}>
                  {chart.labels.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chart.labels.map((l, i) => ({ name: l, value: chart.values[i] }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chart.labels.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-blue-600 uppercase mb-1.5">Key Insights</p>
          <ul className="space-y-1">
            {insights.map((ins, i) => (
              <li key={i} className="text-[12px] text-blue-800 flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5 shrink-0">&#x2022;</span>{ins}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-amber-600 uppercase mb-1.5">Recommendations</p>
          <ul className="space-y-1">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-[12px] text-amber-800 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5 shrink-0">&#x2022;</span>{rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions: Export + Show SQL */}
      <div className="flex items-center gap-2 flex-wrap">
        {table && (
          <button
            onClick={onExport}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
        )}
        {sql && (
          <button
            onClick={() => setShowSQL(v => !v)}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {showSQL ? 'Hide SQL' : 'Show SQL'}
          </button>
        )}
      </div>
      {showSQL && sql && (
        <pre className="text-[11px] bg-gray-900 text-green-400 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
          {sql}
        </pre>
      )}
    </div>
  )
}

// ─── Legacy response renderers (for ML/analytics responses from Python) ──────

function DescriptiveResponse({ data }) {
  const { overview, by_technology = [], funnel } = data
  if (!overview) return <p className="text-[13px] text-gray-500">No data returned.</p>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: 'Total Students', v: overview.total_students, c: '#3B82F6' },
          { l: 'In Market',      v: overview.in_market,      c: '#F59E0B' },
          { l: 'Placed',         v: overview.placed,         c: '#10B981' },
          { l: 'Exited',         v: overview.exited,         c: '#EF4444' },
        ].map(({ l, v, c }, i) => (
          <div key={i} className="rounded-xl border p-3 text-center" style={{ borderColor: c, backgroundColor: `${c}10` }}>
            <p className="text-[11px] text-gray-500">{l}</p>
            <p className="text-[22px] font-bold" style={{ color: c }}>{v ?? '—'}</p>
          </div>
        ))}
      </div>
      {by_technology.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">By Technology</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={by_technology.slice(0, 8)}>
              <XAxis dataKey="technology" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                {by_technology.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {funnel && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Placement Funnel</p>
          {[
            { label: 'Total Students',   value: funnel.total_students, pct: 100 },
            { label: 'With Submissions', value: funnel.students_with_subs, pct: Math.round(funnel.students_with_subs / funnel.total_students * 100) },
            { label: 'With Interviews',  value: funnel.students_with_interviews, pct: Math.round(funnel.students_with_interviews / funnel.total_students * 100) },
            { label: 'Placed',           value: funnel.placed, pct: Math.round(funnel.placed / funnel.total_students * 100) },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] text-gray-600 w-36 shrink-0">{row.label}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${row.pct}%` }} />
              </div>
              <span className="text-[12px] font-semibold text-gray-700 w-10 text-right">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiagnosticResponse({ data }) {
  const { feature_importance = [], bottlenecks = [] } = data
  return (
    <div className="space-y-4">
      {feature_importance.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">What Predicts Placement</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={feature_importance} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={180} />
              <Tooltip formatter={(v) => [v.toFixed(4), 'Importance']} />
              <Bar dataKey="importance" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                {feature_importance.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#10B981' : '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {bottlenecks.length > 0 && (
        <div className="space-y-2">
          {bottlenecks.map((b, i) => (
            <div key={i} className={`rounded-xl p-3 border text-[12px] ${b.severity === 'HIGH' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <span className="font-semibold mr-2">{b.severity}:</span>{b.issue}
              {b.impact && <span className="text-[11px] ml-2 opacity-75">• {b.impact}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrescriptiveResponse({ data }) {
  const navigate = useNavigate()
  const { urgent_actions = [], weekly_stats = {}, targets = {} } = data
  return (
    <div className="space-y-3">
      {urgent_actions.map((action, i) => (
        <div key={i} className={`rounded-xl border p-3 ${action.priority === 1 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-[13px] font-semibold text-gray-800">{action.action}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{action.details}</p>
          {action.students?.slice(0, 3).map((s, j) => (
            <button
              key={j}
              onClick={() => navigate(`/head/students/${s.id}`)}
              className="mt-1.5 text-[11px] text-blue-600 hover:underline block"
            >
              → {s.first_name} {s.last_name} ({s.technology}, {s.days_in_market}d)
            </button>
          ))}
        </div>
      ))}
      {weekly_stats.subs_this_week !== undefined && (
        <div className="bg-gray-50 rounded-xl p-3 text-[12px] text-gray-700">
          <p className="font-semibold mb-1">This Week</p>
          <p>Submissions: {weekly_stats.subs_this_week} / {targets.submissions_per_week} target</p>
          <p>Interviews: {weekly_stats.intv_this_week} / {targets.interviews_per_week} target</p>
        </div>
      )}
    </div>
  )
}

function PredictionsResponse({ data }) {
  const navigate = useNavigate()
  const students = (data.students || []).slice(0, 20)
  const cols = [
    { key: 'student_name',          label: 'Name',       render: v => <span className="text-blue-700 font-medium">{v}</span> },
    { key: 'technology',            label: 'Tech' },
    { key: 'days_in_market',        label: 'Days' },
    { key: 'placement_probability', label: 'Placement %', render: v => `${v || 0}%` },
    { key: 'exit_risk',             label: 'Risk',
      render: v => (
        <span className="text-[11px] font-semibold" style={{ color: RISK_COLORS[v] || '#9CA3AF' }}>{v}</span>
      )},
  ]
  return (
    <div>
      <p className="text-[12px] text-gray-500 mb-2">Showing top {students.length} students by exit risk</p>
      <DataTable
        columns={cols}
        rows={students}
        pageSize={10}
        onRowClick={row => navigate(`/head/students/${row.student_id}`)}
      />
    </div>
  )
}

// ─── Follow-up chips ──────────────────────────────────────────────────────────
function FollowUpChips({ questions, onSelect }) {
  if (!questions || !questions.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="text-[11px] text-gray-400 self-center">Follow up:</span>
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="text-[11px] px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  )
}

// ─── Render the right component based on response type ────────────────────────
function ResponseBody({ data, onExport, onFollowUp }) {
  if (!data) return null
  const { type } = data

  // Analytics responses from Python have nested data — the spread puts overview/feature_importance/etc at top level
  if (type === 'analytics') {
    // Determine sub-type from the data shape
    if (data.overview) return <DescriptiveResponse data={data} />
    if (data.feature_importance) return <DiagnosticResponse data={data} />
    if (data.urgent_actions) return <PrescriptiveResponse data={data} />
    return <p className="text-[13px] text-gray-500">Analytics data received.</p>
  }

  if (type === 'prediction') {
    return <PredictionsResponse data={data} />
  }

  if (type === 'sql' || type === 'combined') {
    return <SQLTableResponse data={data} onExport={() => onExport(data.table)} />
  }

  if (type === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
        <p className="text-[12px] text-red-700">{data.summary}</p>
        {data.recommendations && (
          <ul className="mt-2 space-y-1">
            {data.recommendations.map((r, i) => (
              <li key={i} className="text-[11px] text-red-600">• {r}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return <p className="text-[13px] text-gray-500">{data.summary || 'Response received.'}</p>
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AIChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'ai',
      text: 'Hi! I can analyse your CRM data using AI. Ask me anything in plain English — I\'ll query your database, run ML predictions, or provide analytics.',
      type: null,
      data: null,
    },
  ])
  const [input, setInput]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [suggestedQuestions, setSuggested]   = useState(FALLBACK_QUESTIONS)
  const bottomRef                           = useRef(null)
  const responseCache                       = useRef({})

  // Load suggested questions from API on mount
  useEffect(() => {
    api.get('/api/v1/ai/suggested-questions')
      .then(res => {
        const data = res?.data || res
        if (Array.isArray(data)) setSuggested(data)
      })
      .catch(() => { /* keep fallback */ })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const exportCSV = async (table) => {
    if (!table) return
    try {
      const res = await fetch('/api/v1/ai/export-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('rp_user') || '{}').token}`
        },
        body: JSON.stringify({ table })
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ai-chat-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export error:', err)
    }
  }

  const sendMessage = async (text) => {
    const question = (text || input).trim()
    if (!question || loading) return
    setInput('')

    const cacheKey = question.toLowerCase().trim()
    const userMsg  = { id: Date.now(), role: 'user', text: question }

    // Cache hit — respond instantly
    if (responseCache.current[cacheKey]) {
      const cached = responseCache.current[cacheKey]
      setMessages(m => [...m, userMsg, {
        id: Date.now() + 1, role: 'ai',
        text: cached.summary || 'Here are the results:',
        data: cached, type: cached.type,
      }])
      return
    }

    const aiMsgId = Date.now() + 1
    setMessages(m => [...m, userMsg, { id: aiMsgId, role: 'ai', text: '...', loading: true }])
    setLoading(true)

    try {
      const res = await api.post('/api/v1/ai/chat', { message: question })
      const data = res?.data || res
      responseCache.current[cacheKey] = data
      setMessages(m => m.map(msg =>
        msg.id === aiMsgId
          ? { ...msg, loading: false, data, type: data.type, text: data.summary || 'Here are the results:' }
          : msg
      ))
    } catch (err) {
      setMessages(m => m.map(msg =>
        msg.id === aiMsgId
          ? { ...msg, loading: false, error: true, text: 'Failed: ' + (err.message || 'Unknown error'), type: 'error' }
          : msg
      ))
    }
    setLoading(false)
  }

  return (
    <Page title="AI Chat" subtitle="Ask questions about your CRM data in plain English">
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Message history */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[13px]">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <span className="text-[12px] text-gray-400">Analysing data…</span>
                    </div>
                  ) : msg.error ? (
                    <p className="text-[13px] text-red-600">{msg.text}</p>
                  ) : (
                    <>
                      {/* Type badge */}
                      {msg.type && (
                        <div className="mb-2">
                          <TypeBadge type={msg.type} />
                        </div>
                      )}
                      {msg.text && <p className="text-[13px] text-gray-700 mb-3">{msg.text}</p>}
                      <ResponseBody
                        data={msg.data}
                        onExport={exportCSV}
                        onFollowUp={sendMessage}
                      />
                      {/* Follow-up chips */}
                      {msg.data?.followUpQuestions && (
                        <FollowUpChips questions={msg.data.followUpQuestions} onSelect={sendMessage} />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggested question chips */}
        <div className="pb-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q.text)}
              disabled={loading}
              className="text-[11px] px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              {q.icon && <span className="mr-1">{q.icon}</span>}{q.text}
            </button>
          ))}
        </div>

        {/* Privacy indicator */}
        <p className="text-[10px] text-gray-400 text-center pb-1">
          Your data never leaves the server — only table schema is sent to AI for query generation
        </p>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask anything: 'Show me students with 500+ days in market', 'Compare BU performance'…"
            disabled={loading}
            className="flex-1 text-[13px] border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-[13px]"
          >
            Send
          </button>
        </div>
      </div>
    </Page>
  )
}
