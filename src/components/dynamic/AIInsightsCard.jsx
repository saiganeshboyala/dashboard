import { useState, useEffect } from 'react'
import api from '../../utils/api'

const RISK_COLORS = {
  HIGH:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   dot: 'bg-red-500'   },
  MEDIUM: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  LOW:    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  'N/A':  { bg: 'bg-gray-50',  border: 'border-gray-200',  text: 'text-gray-500',  dot: 'bg-gray-400'  },
}

const PRIORITY_COLORS = {
  HIGH:   'text-red-600',
  MEDIUM: 'text-amber-600',
  LOW:    'text-green-600',
  INFO:   'text-blue-600',
}

const PRIORITY_ICONS = {
  HIGH:   '🔴',
  MEDIUM: '🟡',
  LOW:    '🟢',
  INFO:   'ℹ️',
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="h-20 bg-gray-200 rounded-xl" />
      </div>
      <div className="space-y-2 mt-4">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-3/5" />
      </div>
    </div>
  )
}

export default function AIInsightsCard({ studentId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    api.get(`/api/v1/ai/predict/student/${studentId}`)
      .then(res => setData(res))
      .catch(() => setError('AI insights unavailable'))
      .finally(() => setLoading(false))
  }, [studentId])

  const risk      = data?.exit_risk || 'N/A'
  const riskStyle = RISK_COLORS[risk] || RISK_COLORS['N/A']
  const placementPct = data?.placement_probability ?? 0

  return (
    <div className="mb-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/70 border-b border-blue-100 hover:bg-white/90 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="flex items-center gap-2 text-[13px] font-700 text-slate-800">
          <span>🤖</span>
          <span>AI Insights</span>
          {data && !loading && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border} border`}>
              {risk} risk
            </span>
          )}
        </span>
        <span className="text-gray-400 text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="p-4">
          {loading && <Skeleton />}

          {error && !loading && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-[12px] text-gray-500">
              🤖 AI insights unavailable — analytics service may be down
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              {/* Stat boxes */}
              <div className="grid grid-cols-3 gap-3">
                {/* Placement probability */}
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                  <p className="text-[11px] text-gray-500 font-medium mb-1.5">Placement Probability</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(placementPct, 100)}%`,
                          backgroundColor: placementPct >= 70 ? '#10B981' : placementPct >= 30 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="text-[13px] font-bold text-gray-800 shrink-0">{placementPct}%</span>
                  </div>
                </div>

                {/* Exit risk */}
                <div className={`border rounded-xl p-3 shadow-sm ${riskStyle.bg} ${riskStyle.border}`}>
                  <p className="text-[11px] text-gray-500 font-medium mb-1">Exit Risk</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${riskStyle.dot}`} />
                    <span className={`text-[14px] font-bold ${riskStyle.text}`}>{risk}</span>
                  </div>
                  {data.exit_risk_score > 0 && (
                    <p className="text-[11px] text-gray-500 mt-0.5">Score: {data.exit_risk_score}/100</p>
                  )}
                </div>

                {/* Predicted days */}
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                  <p className="text-[11px] text-gray-500 font-medium mb-1">Predicted Days</p>
                  <p className="text-[14px] font-bold text-gray-800">
                    {data.predicted_days_in_market ? `~${data.predicted_days_in_market} days` : '—'}
                  </p>
                  {data.days_in_market > 0 && (
                    <p className="text-[11px] text-gray-500">Current: {data.days_in_market}d</p>
                  )}
                </div>
              </div>

              {/* Top factors */}
              {data.top_factors?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                  <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-2">Top Factors</p>
                  <div className="space-y-1.5">
                    {data.top_factors.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[12px]">{f.importance > 0.1 ? '✅' : '⚠️'}</span>
                        <span className="text-[12px] text-gray-700 flex-1">{f.feature.replace(/_/g, ' ')}</span>
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(f.importance * 400, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {data.recommendations?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                  <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-2">Recommendations</p>
                  <div className="space-y-2">
                    {data.recommendations
                      .sort((a, b) => {
                        const order = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 }
                        return (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
                      })
                      .map((rec, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[13px] shrink-0 mt-0.5">{PRIORITY_ICONS[rec.priority] || 'ℹ️'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12px] font-medium ${PRIORITY_COLORS[rec.priority] || 'text-gray-700'}`}>
                              {rec.action}
                            </p>
                            {rec.reason && (
                              <p className="text-[11px] text-gray-500 mt-0.5">{rec.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
