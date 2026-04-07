import { useState, useEffect } from 'react'
import { Play, Zap, RefreshCw } from 'lucide-react'
import { Page, Button, Input, Badge, Loading, Tabs } from '../../components/ui'
import { scraperApi } from '../../api/scraperClient'

const DEFAULT_SITES = [
  { id: 'indeed',         label: 'Indeed' },
  { id: 'linkedin',       label: 'LinkedIn' },
  { id: 'google',         label: 'Google' },
  { id: 'zip_recruiter',  label: 'ZipRecruiter' },
  { id: 'dice',           label: 'Dice' },
  { id: 'naukri',         label: 'Naukri' },
]

export default function ScrapeControl() {
  const [tab, setTab] = useState('quick')
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Quick scrape
  const [quickSources, setQuickSources] = useState(['jobspy'])
  const [quickLoading, setQuickLoading]   = useState(false)
  const [quickResult, setQuickResult]     = useState(null)

  // Custom scrape
  const [keywords, setKeywords]     = useState('Java Developer C2C, Python Developer Contract')
  const [locations, setLocations]   = useState('Dallas, TX, Remote')
  const [sites, setSites]           = useState(new Set(['indeed', 'linkedin', 'dice']))
  const [resultsPerQ, setResultsPerQ] = useState(20)
  const [customLoading, setCustomLoading] = useState(false)
  const [customResult, setCustomResult]   = useState(null)

  function loadLogs() {
    setLogsLoading(true)
    scraperApi.getLogs(30)
      .then(res => setLogs(res.logs || []))
      .catch(() => {})
      .finally(() => setLogsLoading(false))
  }

  useEffect(loadLogs, [])

  async function handleQuick() {
    setQuickLoading(true)
    setQuickResult(null)
    try {
      const res = await scraperApi.scrapeNow(quickSources)
      setQuickResult(res)
      loadLogs()
    } catch { /* ignored */ }
    setQuickLoading(false)
  }

  async function handleCustom() {
    setCustomLoading(true)
    setCustomResult(null)
    try {
      const kw = keywords.split(',').map(s => s.trim()).filter(Boolean)
      const lc = locations.split(',').map(s => s.trim()).filter(Boolean)
      const res = await scraperApi.scrapeCustom({
        keywords: kw,
        locations: lc,
        sites: Array.from(sites),
        results_per_query: resultsPerQ,
      })
      setCustomResult(res)
      loadLogs()
    } catch { /* ignored */ }
    setCustomLoading(false)
  }

  function toggleSite(s) {
    setSites(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  return (
    <Page title="Scrape Control" subtitle="Run scrapers manually or with custom parameters">
      <Tabs
        tabs={[
          { id: 'quick',   label: 'Quick Scrape' },
          { id: 'custom',  label: 'Custom Scrape' },
          { id: 'history', label: 'History', count: logs.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5">
        {/* Quick Scrape */}
        {tab === 'quick' && (
          <div className="card p-6">
            <h3 className="text-[14px] font-bold text-gray-800 mb-4">Quick Scrape</h3>
            <p className="text-[12px] text-gray-500 mb-4">
              Runs the default 5 keywords x 3 locations with the JobSpy scraper. Takes about 5 minutes.
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {['jobspy', 'career_pages', 'linkedin', 'indeed', 'dice', 'google'].map(src => (
                <label key={src} className="flex items-center gap-1.5 text-[12px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={quickSources.includes(src)}
                    onChange={() => {
                      setQuickSources(prev =>
                        prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
                      )
                    }}
                    className="rounded border-gray-300"
                  />
                  {src}
                </label>
              ))}
            </div>

            <Button onClick={handleQuick} loading={quickLoading} disabled={quickSources.length === 0}>
              <Play size={13} /> Start Scraping
            </Button>

            {quickResult && (
              <div className="mt-4 p-4 bg-success-50 rounded-lg border border-success-200">
                <p className="text-[13px] font-semibold text-success-700">Scrape Complete</p>
                <div className="mt-2 space-y-1">
                  {Object.entries(quickResult.results || {}).map(([src, r]) => (
                    <p key={src} className="text-[12px] text-gray-600">
                      {src}: <span className="font-semibold">{r.roles_found} roles</span> in {r.duration_seconds}s
                      {r.status === 'error' && <span className="text-danger-600 ml-2">Error: {r.error}</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Scrape */}
        {tab === 'custom' && (
          <div className="card p-6">
            <h3 className="text-[14px] font-bold text-gray-800 mb-4">Custom Scrape</h3>
            <p className="text-[12px] text-gray-500 mb-4">
              Specify exact keywords, locations, and sites to scrape.
            </p>

            <div className="space-y-4 max-w-xl">
              <Input
                label="Keywords (comma-separated)"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="Java Developer C2C, React Developer Contract"
              />
              <Input
                label="Locations (comma-separated)"
                value={locations}
                onChange={e => setLocations(e.target.value)}
                placeholder="Dallas, TX, Remote, New York, NY"
              />

              <div>
                <label className="field-label">Sites</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DEFAULT_SITES.map(s => (
                    <label key={s.id} className="flex items-center gap-1.5 text-[12px] text-gray-600">
                      <input
                        type="checkbox"
                        checked={sites.has(s.id)}
                        onChange={() => toggleSite(s.id)}
                        className="rounded border-gray-300"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Results per query"
                type="number"
                value={resultsPerQ}
                onChange={e => setResultsPerQ(Number(e.target.value))}
                className="max-w-[140px]"
              />

              <Button onClick={handleCustom} loading={customLoading} disabled={!keywords.trim() || !locations.trim()}>
                <Zap size={13} /> Run Custom Scrape
              </Button>
            </div>

            {customResult && (
              <div className="mt-4 p-4 bg-success-50 rounded-lg border border-success-200 max-w-xl">
                <p className="text-[13px] font-semibold text-success-700">
                  Custom Scrape Complete — {customResult.roles_saved} new roles saved
                </p>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-[12px] font-semibold text-gray-700">Scrape History</span>
              <Button variant="ghost" size="xs" onClick={loadLogs}><RefreshCw size={12} /></Button>
            </div>
            {logsLoading ? <Loading /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th">Source</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Found</th>
                      <th className="table-th">New</th>
                      <th className="table-th">Dupes</th>
                      <th className="table-th">Duration</th>
                      <th className="table-th">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="table-td font-medium text-gray-700">{log.source}</td>
                        <td className="table-td">
                          <Badge color={log.status === 'success' ? 'green' : log.status === 'error' ? 'red' : 'amber'} dot>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="table-td tabular-nums">{log.roles_found}</td>
                        <td className="table-td tabular-nums text-success-600 font-medium">{log.roles_new}</td>
                        <td className="table-td tabular-nums text-gray-400">{log.roles_duplicate}</td>
                        <td className="table-td tabular-nums text-gray-500">{log.duration_seconds ? `${log.duration_seconds}s` : '—'}</td>
                        <td className="table-td text-[11px] text-gray-400">{log.started_at ? new Date(log.started_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-gray-400">No scrape history yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  )
}
