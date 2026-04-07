import { useState, useEffect } from 'react'
import { Page, Badge, Button, Loading } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get } from '../../services/api'
import { ExternalLink, Bookmark, X, ChevronRight } from 'lucide-react'

const TECH_COLORS = {
  JAVA: '#3B82F6', DE: '#8B5CF6', '.NET': '#10B981', Python: '#F59E0B',
  React: '#06B6D4', DevOps: '#EF4444',
}

function SkillBadge({ skill }) {
  const bg = TECH_COLORS[skill] || '#6B7280'
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white mr-1 mb-0.5"
      style={{ backgroundColor: bg }}>{skill}</span>
  )
}

function ScoreBar({ score }) {
  const pct = typeof score === 'number' ? score : parseFloat(score) || 0
  const color = pct > 80 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-100 rounded-full h-2.5">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-semibold" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function RecruiterJobsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [recs, setRecs] = useState([])
  const [recsLoading, setRecsLoading] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const data = await get('/api/v1/jobs/recruiter/students')
        const list = Array.isArray(data) ? data : data?.students || []
        setStudents(list)
        if (list.length > 0) setSelectedId(list[0].studentId)
      } catch (e) { toast.error(e.message) }
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    // Check if recs are inline from the students endpoint
    const s = students.find(x => x.studentId === selectedId)
    if (s?.recommendations?.length > 0) {
      setRecs(s.recommendations)
      return
    }
    (async () => {
      setRecsLoading(true)
      try {
        const data = await get(`/api/v1/jobs/recruiter/recommendations/${selectedId}`)
        setRecs(data?.recommendations || data || [])
      } catch { setRecs([]) }
      setRecsLoading(false)
    })()
  }, [selectedId])

  const selected = students.find(s => s.studentId === selectedId)

  if (loading) return <Page title="Job Matches"><Loading /></Page>

  return (
    <Page title="Job Matches for My Students" subtitle={`${students.length} students with job recommendations`}>
      <div className="flex gap-6 min-h-[500px]">
        {/* Left Panel — Student List */}
        <div className="w-72 shrink-0 space-y-1.5 overflow-y-auto max-h-[600px]">
          {students.length === 0 && (
            <p className="text-[12px] text-gray-400 text-center py-8">No in-market students assigned</p>
          )}
          {students.map(s => (
            <button key={s.studentId}
              onClick={() => setSelectedId(s.studentId)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                selectedId === s.studentId
                  ? 'bg-brand-50 border-brand-200 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-gray-900 truncate">{s.studentName}</span>
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                {s.technology && <SkillBadge skill={s.technology} />}
                <span className="text-[10px] text-gray-400 ml-auto">{s.recommendationCount ?? 0} roles</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right Panel — Job Recommendations */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-[13px]">
              Select a student to see job matches
            </div>
          ) : recsLoading ? (
            <Loading />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[14px] font-bold">{selected.studentName}</h3>
                {selected.technology && <SkillBadge skill={selected.technology} />}
                <Badge color="blue">{recs.length} matches</Badge>
              </div>

              {recs.length === 0 ? (
                <p className="text-[12px] text-gray-400 py-8 text-center">No job recommendations yet</p>
              ) : (
                <div className="space-y-3">
                  {recs.map((rec, i) => (
                    <RoleCard key={rec.id || i} rec={rec} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Page>
  )
}

function RoleCard({ rec }) {
  const title = rec.title || 'Untitled'
  const company = rec.company || '—'
  const location = rec.location || '—'
  const score = rec.match_score || 0
  const skills = Array.isArray(rec.skills) ? rec.skills : []

  return (
    <div className="card p-4 hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-gray-900">{title}</h4>
          <p className="text-[12px] text-gray-500 mt-0.5">{company} — {location}</p>
          {rec.role_type && <Badge color="purple" className="mt-1">{rec.role_type}</Badge>}
          {rec.pay_rate && <span className="text-[11px] text-gray-500 ml-2">{rec.pay_rate}</span>}
          <div className="mt-2">
            {skills.slice(0, 5).map((s, i) => <SkillBadge key={i} skill={s} />)}
          </div>
        </div>
        <div className="shrink-0 ml-4">
          <ScoreBar score={score} />
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        {rec.source_url && (
          <a href={rec.source_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-brand-600 text-white hover:bg-brand-700">
            Submit Student <ExternalLink size={10} />
          </a>
        )}
        <span className="text-[10px] text-gray-400 self-center ml-auto">{rec.source}</span>
      </div>
    </div>
  )
}
