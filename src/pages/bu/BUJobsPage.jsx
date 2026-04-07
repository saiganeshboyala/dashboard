import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Loading } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get } from '../../services/api'
import { ChevronDown, ChevronRight } from 'lucide-react'

const TECH_COLORS = {
  JAVA: '#3B82F6', DE: '#8B5CF6', '.NET': '#10B981', Python: '#F59E0B',
  React: '#06B6D4', DevOps: '#EF4444',
}

function SkillBadge({ skill, match = true }) {
  const bg = match ? (TECH_COLORS[skill] || '#3B82F6') : '#D1D5DB'
  const text = match ? 'white' : '#6B7280'
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-0.5"
      style={{ backgroundColor: bg, color: text }}>{skill}</span>
  )
}

function ScoreBar({ score }) {
  const pct = typeof score === 'number' ? score : parseFloat(score) || 0
  const color = pct > 80 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-100 rounded-full h-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-medium">{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function BUJobsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [techFilter, setTechFilter] = useState('')
  const [expandedStudent, setExpandedStudent] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [rolesData, recsData] = await Promise.all([
          get('/api/v1/jobs/bu/jobs').catch(() => ({ roles: [] })),
          get('/api/v1/jobs/bu/recommendations').catch(() => []),
        ])
        setRoles(rolesData?.roles || rolesData || [])
        setRecommendations(Array.isArray(recsData) ? recsData : [])
      } catch (e) { toast.error(e.message) }
      setLoading(false)
    })()
  }, [])

  // Extract BU technologies from roles
  const allTechs = [...new Set(
    (Array.isArray(roles) ? roles : []).flatMap(r =>
      Array.isArray(r.skills) ? r.skills : []
    ).filter(Boolean)
  )]

  const filteredRoles = techFilter
    ? (Array.isArray(roles) ? roles : []).filter(r => {
      const arr = Array.isArray(r.skills) ? r.skills : []
      return arr.some(sk => sk.toLowerCase().includes(techFilter.toLowerCase()))
    })
    : (Array.isArray(roles) ? roles : [])

  if (loading) return <Page title="Job Requirements"><Loading /></Page>

  return (
    <Page title="Job Requirements" subtitle="Roles matching your business unit's technologies">
      {/* Tech filter badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allTechs.slice(0, 12).map(t => (
          <button key={t} onClick={() => setTechFilter(techFilter === t ? '' : t)}
            className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
              techFilter === t
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Roles Table */}
      <DataTable
        columns={[
          { key: 'title', label: 'Title', render: v => <span className="font-medium text-gray-900">{v}</span> },
          { key: 'company', label: 'Company', render: v => v || '—' },
          { key: 'location', label: 'Location' },
          { key: 'remote_type', label: 'Remote', render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
          { key: 'skills', label: 'Skills Match', render: v => {
            const arr = Array.isArray(v) ? v : []
            return arr.slice(0, 5).map((s, i) => {
              const isMatch = allTechs.some(t => t.toLowerCase() === s.toLowerCase())
              return <SkillBadge key={i} skill={s} match={isMatch} />
            })
          }},
          { key: 'source', label: 'Source', render: v => <Badge color="gray">{v}</Badge> },
          { key: 'scraped_at', label: 'Scraped', render: v => v ? new Date(v).toLocaleDateString() : '—' },
        ]}
        rows={filteredRoles}
        emptyText="No roles found for your BU's technologies"
      />

      {/* Student-Job Matches */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[14px] font-bold mb-3">Student-Job Matches</h3>
          <div className="space-y-2">
            {recommendations.map((sr) => (
              <div key={sr.studentId} className="card overflow-hidden">
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedStudent(expandedStudent === sr.studentId ? null : sr.studentId)}>
                  <div className="flex items-center gap-3">
                    {expandedStudent === sr.studentId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-medium text-[13px]">{sr.studentName}</span>
                    {sr.technology && <SkillBadge skill={sr.technology} />}
                  </div>
                  <Badge color="blue">{(sr.recommendations || []).length} matches</Badge>
                </button>

                {expandedStudent === sr.studentId && (
                  <div className="border-t px-4 py-3 bg-gray-50/50">
                    {(sr.recommendations || []).slice(0, 5).map((rec, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-[13px] font-medium">{rec.title}</p>
                          <p className="text-[11px] text-gray-500">{rec.company} — {rec.location}</p>
                        </div>
                        <ScoreBar score={rec.match_score || 0} />
                      </div>
                    ))}
                    {(sr.recommendations || []).length === 0 && (
                      <p className="text-[12px] text-gray-400 py-2">No recommendations yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}
