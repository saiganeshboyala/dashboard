import { useState, useEffect } from 'react'
import { Play, Pause, RefreshCw, Clock } from 'lucide-react'
import { Page, Button, Badge, Loading } from '../../components/ui'
import { scraperApi } from '../../api/scraperClient'

export default function ScraperScheduler() {
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)

  function load() {
    setLoading(true)
    scraperApi.getScheduler()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handlePause() {
    setActing(true)
    try {
      await scraperApi.pauseScheduler()
      load()
    } catch { /* ignored */ }
    setActing(false)
  }

  async function handleResume() {
    setActing(true)
    try {
      await scraperApi.resumeScheduler()
      load()
    } catch { /* ignored */ }
    setActing(false)
  }

  if (loading) return <Page title="Scheduler"><Loading /></Page>

  const isRunning = status?.running && !status?.paused
  const isPaused  = status?.paused

  return (
    <Page
      title="Scheduler"
      subtitle="Automatic hourly job scraping"
      actions={<Button variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Button>}
    >
      <div className="max-w-lg">
        {/* Status Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRunning ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-500'}`}>
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">JobSpy Auto-Scraper</h3>
              <p className="text-[12px] text-gray-400">Runs every {status?.interval_hours || 1} hour(s)</p>
            </div>
            <div className="ml-auto">
              <Badge color={isRunning ? 'green' : isPaused ? 'amber' : 'red'} dot>
                {isRunning ? 'Running' : isPaused ? 'Paused' : 'Stopped'}
              </Badge>
            </div>
          </div>

          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-800">{isRunning ? 'Active' : isPaused ? 'Paused' : 'Stopped'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Interval</span>
              <span className="font-medium text-gray-800">Every {status?.interval_hours || 1} hour(s)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Job ID</span>
              <span className="text-[12px] text-gray-600 font-mono">{status?.job_id || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Next Run</span>
              <span className="font-medium text-gray-800">
                {status?.next_run ? new Date(status.next_run).toLocaleString() : 'Not scheduled'}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {isRunning ? (
              <Button variant="secondary" onClick={handlePause} loading={acting}>
                <Pause size={13} /> Pause Scheduler
              </Button>
            ) : (
              <Button onClick={handleResume} loading={acting}>
                <Play size={13} /> Resume Scheduler
              </Button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="card p-5">
          <h4 className="text-[13px] font-bold text-gray-700 mb-2">How it works</h4>
          <ul className="text-[12px] text-gray-500 space-y-1.5 list-disc list-inside">
            <li>Uses APScheduler BackgroundScheduler (Windows compatible)</li>
            <li>Scrapes 5 keywords x 3 locations = 15 searches per run</li>
            <li>Only fetches jobs posted in the last 24 hours</li>
            <li>Sites: Indeed, LinkedIn, Google, ZipRecruiter, Naukri</li>
            <li>Deduplicates automatically — only new roles are saved</li>
            <li>Starts automatically on app startup</li>
          </ul>
        </div>
      </div>
    </Page>
  )
}
