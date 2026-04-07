import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Loading } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get, put } from '../../services/api'
import { ExternalLink, Heart, X } from 'lucide-react'

const TECH_COLORS = {
  JAVA: '#3B82F6', DE: '#8B5CF6', '.NET': '#10B981', Python: '#F59E0B',
  React: '#06B6D4', DevOps: '#EF4444',
}

function SkillBadge({ skill, variant = 'match' }) {
  const bg = variant === 'match' ? (TECH_COLORS[skill] || '#3B82F6') : '#E5E7EB'
  const text = variant === 'match' ? 'white' : '#6B7280'
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
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function StudentJobsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState([])
  const [allRoles, setAllRoles] = useState([])
  const [technology, setTechnology] = useState(null)
  const [jobsPage, setJobsPage] = useState(1)
  const [jobDetail, setJobDetail] = useState(null)
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => {
    (async () => {
      try {
        const [recsData, rolesData] = await Promise.all([
          get('/api/v1/jobs/my-recommendations').catch(() => ({ recommendations: [] })),
          get(`/api/v1/jobs/my-jobs?page=${jobsPage}&per_page=20`).catch(() => ({ roles: [] })),
        ])
        setRecommendations(recsData?.recommendations || [])
        setAllRoles(rolesData?.roles || [])
        setTechnology(recsData?.technology || rolesData?.technology || null)
      } catch (e) { toast.error(e.message) }
      setLoading(false)
    })()
  }, [jobsPage])

  const handleAction = async (recId, action) => {
    try {
      await put(`/api/v1/jobs/recommendations/${recId}/action?action=${action}`)
      if (action === 'dismissed') setDismissed(prev => new Set(prev).add(recId))
      toast.success(action === 'applied' ? 'Marked as applied' : action === 'saved' ? 'Job saved' : 'Done')
    } catch (e) { toast.error(e.message) }
  }

  const visibleRecs = recommendations.filter(r => !dismissed.has(r.id))

  if (loading) return <Page title="Job Opportunities"><Loading /></Page>

  return (
    <Page title="Jobs for You" subtitle={technology ? `${technology} Developer` : 'Your personalized job feed'}>
      {technology && (
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold text-white"
            style={{ backgroundColor: TECH_COLORS[technology] || '#3B82F6' }}>
            {technology}
          </span>
        </div>
      )}

      {/* Section 1: Recommended for You */}
      <div className="mb-8">
        <h3 className="text-[14px] font-bold mb-3">Recommended for You</h3>
        {visibleRecs.length === 0 ? (
          <div className="card p-8 text-center text-[13px] text-gray-400">
            No recommendations yet. Check back after the next matching run.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleRecs.map((rec, i) => {
              const matchedSkills = rec.matched_skills || []
              const matchArr = Array.isArray(matchedSkills) ? matchedSkills : []
              const allSkills = Array.isArray(rec.skills) ? rec.skills : []
              const missingSkills = allSkills.filter(s => !matchArr.some(m => m.toLowerCase() === s.toLowerCase()))

              return (
                <div key={rec.id || i} className="card p-4 hover:shadow-elevated transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-gray-900 truncate">{rec.title}</h4>
                      <p className="text-[11px] text-gray-500">{rec.company} — {rec.location}</p>
                      {rec.role_type && <Badge color="purple" className="mt-1">{rec.role_type}</Badge>}
                      {rec.pay_rate && <span className="text-[11px] text-gray-500 ml-2">{rec.pay_rate}</span>}
                    </div>
                  </div>

                  <div className="mb-3">
                    <ScoreBar score={rec.match_score || 0} />
                  </div>

                  {matchArr.length > 0 && (
                    <div className="mb-1">
                      <span className="text-[10px] text-gray-400 uppercase">Matched</span>
                      <div>{matchArr.slice(0, 4).map((s, j) => <SkillBadge key={j} skill={s} variant="match" />)}</div>
                    </div>
                  )}
                  {missingSkills.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[10px] text-gray-400 uppercase">Other Skills</span>
                      <div>{missingSkills.slice(0, 3).map((s, j) => <SkillBadge key={j} skill={s} variant="missing" />)}</div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {rec.source_url ? (
                      <a href={rec.source_url} target="_blank" rel="noreferrer"
                        onClick={() => handleAction(rec.id, 'applied')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-brand-600 text-white hover:bg-brand-700">
                        Apply <ExternalLink size={10} />
                      </a>
                    ) : (
                      <button onClick={() => handleAction(rec.id, 'applied')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-brand-600 text-white hover:bg-brand-700">
                        Apply <ExternalLink size={10} />
                      </button>
                    )}
                    <button onClick={() => handleAction(rec.id, 'saved')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600">
                      <Heart size={10} /> Save
                    </button>
                    <button onClick={() => handleAction(rec.id, 'dismissed')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <X size={10} /> Not Interested
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: All Roles */}
      <div>
        <h3 className="text-[14px] font-bold mb-3">All {technology || ''} Roles</h3>
        <DataTable
          columns={[
            { key: 'title', label: 'Title', render: v => <span className="font-medium text-gray-900">{v}</span> },
            { key: 'company', label: 'Company', render: v => v || '—' },
            { key: 'location', label: 'Location' },
            { key: 'remote_type', label: 'Remote', render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
            { key: 'role_type', label: 'Type', render: v => v ? <Badge color="purple">{v}</Badge> : '—' },
            { key: 'source', label: 'Source', render: v => <Badge color="gray">{v}</Badge> },
            { key: 'scraped_at', label: 'Scraped', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          ]}
          rows={allRoles}
          onRowClick={row => setJobDetail(row)}
          emptyText="No roles available for your technology"
        />

        <div className="flex gap-2 mt-4 justify-center">
          <Button variant="secondary" size="sm" disabled={jobsPage <= 1}
            onClick={() => setJobsPage(p => p - 1)}>Previous</Button>
          <span className="text-[12px] text-gray-500 self-center">Page {jobsPage}</span>
          <Button variant="secondary" size="sm" disabled={allRoles.length < 20}
            onClick={() => setJobsPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Role Detail Modal */}
      <Modal open={!!jobDetail} onClose={() => setJobDetail(null)} title={jobDetail?.title || 'Role Detail'} width="max-w-2xl">
        {jobDetail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-400 text-[11px]">Company</span><p className="font-medium">{jobDetail.company || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Location</span><p>{jobDetail.location || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Type</span><p>{jobDetail.role_type || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Pay Rate</span><p>{jobDetail.pay_rate || '—'}</p></div>
              <div><span className="text-gray-400 text-[11px]">Source</span><p><Badge color="gray">{jobDetail.source}</Badge></p></div>
              {jobDetail.visa && <div><span className="text-gray-400 text-[11px]">Visa</span><p>{jobDetail.visa}</p></div>}
            </div>
            {jobDetail.skills && (
              <div>
                <span className="text-gray-400 text-[11px]">Skills</span>
                <div className="mt-1">
                  {(Array.isArray(jobDetail.skills) ? jobDetail.skills : []).map((s, i) => <SkillBadge key={i} skill={s} />)}
                </div>
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
    </Page>
  )
}
