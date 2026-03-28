import { useState, useEffect } from 'react'
import { StatCard, DataTable, Badge, Loading, ScoreBar, Button } from './Shared'
import { getPlacementPrediction, getPlacementBatch, getSkillGap, getRecruiterPerfAI, getVendorIntelAI, getStudents } from '../utils/api'
import { Brain, Target, Users, Building2, Sparkles, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'

// Safe fetch
async function safe(fn) {
  try { return await fn() } catch (e) { console.warn('AI Agent error:', e.message); return null }
}

// ── Placement Predictions Panel ─────────────────────────────────────────────
export function PlacementPanel() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [predictions, setPredictions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const s = await safe(() => getStudents('limit=50&status=In Market'))
      if (s?.students) {
        setStudents(s.students)
        // Get predictions for first 10
        const ids = s.students.slice(0, 10).map(st => st.id)
        if (ids.length > 0) {
          const batch = await safe(() => getPlacementBatch(ids))
          if (batch?.results) setPredictions(batch.results)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function loadDetail(studentId) {
    setSelectedId(studentId); setDetailLoading(true)
    const d = await safe(() => getPlacementPrediction(studentId))
    setDetail(d); setDetailLoading(false)
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} className="text-brand-600" />
        <h3 className="text-sm font-bold text-gray-900">Placement Probability — In Market Students</h3>
        <span className="text-xs text-gray-400">Powered by AI</span>
      </div>

      {predictions.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {predictions.filter(p => !p.error).map(p => {
            const color = p.probability >= 70 ? 'success' : p.probability >= 40 ? 'warn' : 'danger'
            const ringColor = p.probability >= 70 ? 'ring-success-500/20 bg-success-50 text-success-700' : p.probability >= 40 ? 'ring-warn-500/20 bg-warn-50 text-warn-700' : 'ring-danger-500/20 bg-danger-50 text-danger-700'
            return (
              <div key={p.student_id} onClick={() => loadDetail(p.student_id)}
                className={`bg-white border rounded-xl p-4 shadow-card cursor-pointer hover:shadow-elevated transition-all ${selectedId === p.student_id ? 'border-brand-400 ring-2 ring-brand-100' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.student_name}</p>
                    <p className="text-xs text-gray-400">{p.technology || '—'}</p>
                  </div>
                  <span className={`w-12 h-12 rounded-xl ring-1 ring-inset flex items-center justify-center font-display font-bold text-base ${ringColor}`}>
                    {p.probability}%
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{p.data_used?.submissions || 0} subs</span>
                  <span>{p.data_used?.interviews || 0} int</span>
                  <span>{p.data_used?.days_in_market || 0}d market</span>
                </div>
                {p.summary && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.summary}</p>}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm mb-4">
          {students.length === 0 ? 'No in-market students found' : 'AI agents not running — start placement agent on port 5008'}
        </div>
      )}

      {/* Detail panel */}
      {detail && !detailLoading && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card anim-fade">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900">{detail.student_name} — AI Analysis</h4>
            <Badge color={detail.risk_level === 'low' ? 'green' : detail.risk_level === 'medium' ? 'amber' : 'red'}>
              {detail.risk_level} risk
            </Badge>
          </div>

          {detail.key_factors?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Key factors</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.key_factors.map((f, i) => <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-gray-100 text-gray-600">{f}</span>)}
              </div>
            </div>
          )}

          {detail.recommendations?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">AI Recommendations</p>
              <div className="space-y-2">
                {detail.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <ArrowRight size={14} className="text-brand-500 mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {detailLoading && <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><div className="w-4 h-4 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" /> Analyzing with AI...</div>}
    </div>
  )
}

// ── Recruiter AI Rankings Panel ─────────────────────────────────────────────
export function RecruiterAIPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const d = await safe(getRecruiterPerfAI)
      setData(d); setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loading />
  if (!data?.recruiters) return <div className="text-gray-400 text-sm p-4">Recruiter AI agent not available — start on port 5010</div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-purple-600" />
        <h3 className="text-sm font-bold text-gray-900">AI Recruiter Rankings</h3>
        <span className="text-xs text-gray-400">Scored by AI agent</span>
      </div>

      {data.team_benchmarks && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Avg submissions" value={data.team_benchmarks.avg_submissions} icon="file" color="gray" />
          <StatCard label="Avg interviews" value={data.team_benchmarks.avg_interviews} icon="calendar" color="gray" />
          <StatCard label="Avg placements" value={data.team_benchmarks.avg_placements} icon="briefcase" color="gray" />
        </div>
      )}

      <DataTable columns={[
        { key: 'name', label: 'Recruiter', render: (v, r) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{v}</span>
            <Badge color={r.rating === 'excellent' ? 'green' : r.rating === 'good' ? 'blue' : r.rating === 'average' ? 'amber' : 'red'}>{r.rating}</Badge>
          </div>
        )},
        { key: 'bu_name', label: 'BU', render: (v, r) => <span className="text-gray-600">{v || r.buName || '—'}</span> },
        { key: 'performance_score', label: 'AI Score', render: v => (
          <span className={`font-display font-bold ${v >= 70 ? 'text-success-600' : v >= 50 ? 'text-warn-600' : 'text-danger-600'}`}>{v}</span>
        )},
        { key: 'students', label: 'Students' },
        { key: 'submissions', label: 'Subs' },
        { key: 'placements', label: 'Placed', render: v => <span className="font-semibold text-success-600">{v}</span> },
        { key: 'subs_per_student', label: 'Subs/Student' },
        { key: 'conversion_rate', label: 'Conv%', render: v => <Badge color={v > 5 ? 'green' : v > 0 ? 'amber' : 'gray'}>{v}%</Badge> },
      ]} rows={data.recruiters || []} />
    </div>
  )
}

// ── Vendor AI Panel ─────────────────────────────────────────────────────────
export function VendorAIPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const d = await safe(getVendorIntelAI)
      setData(d); setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loading />
  if (!data?.vendors) return <div className="text-gray-400 text-sm p-4">Vendor AI agent not available — start on port 5011</div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={18} className="text-teal-600" />
        <h3 className="text-sm font-bold text-gray-900">AI Vendor Intelligence</h3>
      </div>

      {data.summary && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="text-brand-600 mt-0.5 shrink-0" />
            <p className="text-sm text-brand-800">{data.summary}</p>
          </div>
        </div>
      )}

      {data.insights?.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {data.insights.map((ins, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
              <CheckCircle size={12} className="text-success-500 mb-1" />
              {ins}
            </div>
          ))}
        </div>
      )}

      <DataTable columns={[
        { key: 'vendor', label: 'Vendor', render: (v, r) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{v || '—'}</span>
            <Badge color={r.tier === 'A' ? 'green' : r.tier === 'B' ? 'blue' : r.tier === 'C' ? 'amber' : 'red'}>Tier {r.tier}</Badge>
          </div>
        )},
        { key: 'vendor_score', label: 'AI Score', render: v => <span className={`font-display font-bold ${v >= 70 ? 'text-success-600' : v >= 50 ? 'text-warn-600' : 'text-danger-600'}`}>{v}</span> },
        { key: 'submissions', label: 'Subs' },
        { key: 'interviews', label: 'Interviews' },
        { key: 'confirmations', label: 'Confirmed', render: v => <span className="font-semibold text-success-600">{v}</span> },
        { key: 'interview_rate', label: 'Int Rate', render: v => `${v}%` },
        { key: 'confirmation_rate', label: 'Conf Rate', render: v => <Badge color={parseFloat(v) > 5 ? 'green' : parseFloat(v) > 0 ? 'amber' : 'gray'}>{v}%</Badge> },
      ]} rows={data.vendors || []} />
    </div>
  )
}

// ── Skill Gap Panel (for student view) ──────────────────────────────────────
export function SkillGapPanel({ studentId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) { setLoading(false); return }
    async function load() {
      const d = await safe(() => getSkillGap(studentId))
      setData(d); setLoading(false)
    }
    load()
  }, [studentId])

  if (loading) return <Loading />
  if (!data) return <div className="text-gray-400 text-sm p-4">Skill Gap agent not available — start on port 5004</div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={18} className="text-purple-600" />
        <h3 className="text-sm font-bold text-gray-900">AI Skill Gap Analysis — {data.student_name}</h3>
      </div>

      {data.gap_score != null && (
        <div className="mb-4">
          <ScoreBar label="Skill readiness" value={data.gap_score} max={100} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {data.current_skills?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Current Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {data.current_skills.map((s, i) => <Badge key={i} color="green">{s}</Badge>)}
            </div>
          </div>
        )}
        {data.missing_skills?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Missing Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {data.missing_skills.map((s, i) => <Badge key={i} color="red">{s}</Badge>)}
            </div>
          </div>
        )}
      </div>

      {data.learning_priority?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Learning Priority</p>
          <div className="space-y-2">
            {data.learning_priority.map((lp, i) => (
              <div key={i} className="flex items-start gap-3">
                <Badge color={lp.priority === 'critical' ? 'red' : lp.priority === 'important' ? 'amber' : 'gray'}>{lp.priority}</Badge>
                <div>
                  <p className="text-sm font-medium text-gray-800">{lp.skill}</p>
                  <p className="text-xs text-gray-500">{lp.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.summary && <p className="text-sm text-gray-600 mt-4 italic">{data.summary}</p>}
    </div>
  )
}