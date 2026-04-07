import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Play, RefreshCw } from 'lucide-react'
import { Page, StatCard, Button, Loading } from '../../components/ui'
import { scraperApi } from '../../api/scraperClient'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1']

export default function ScraperDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    scraperApi.getDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleScrapeNow() {
    setScraping(true)
    try {
      await scraperApi.scrapeNow(['jobspy'])
      load()
    } catch { /* toast handled by caller */ }
    setScraping(false)
  }

  if (loading) return <Page title="Job Scraper"><Loading /></Page>

  const sourceData = Object.entries(data?.by_source || {}).map(([name, value]) => ({ name, value }))
  const typeData   = Object.entries(data?.by_role_type || {}).map(([name, value]) => ({ name, value }))

  return (
    <Page
      title="Job Scraper"
      subtitle="Automated C2C/Contract role discovery"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={handleScrapeNow} loading={scraping}>
            <Play size={13} /> Scrape Now
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Roles"    value={data?.total_roles?.toLocaleString()}    icon="briefcase" color="brand" />
        <StatCard label="New Today"      value={data?.new_today}                        icon="trending"  color="success" />
        <StatCard label="Total Unseen"   value={data?.total_new}                        icon="file"      color="purple" />
        <StatCard label="Unpushed"       value={data?.unpushed_to_crm}                  icon="clipboard" color="warn" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Source */}
        <div className="card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-4">Roles by Source</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[12px] text-gray-400 py-12 text-center">No data yet</p>
          )}
        </div>

        {/* By Type */}
        <div className="card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-4">Roles by Type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[12px] text-gray-400 py-12 text-center">No data yet</p>
          )}
        </div>
      </div>

      {/* Scheduler status + quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-2">Scheduler</h3>
          <p className="text-[12px] text-gray-500">
            Status: <span className={data?.scheduler?.paused ? 'text-warn-600 font-semibold' : 'text-success-600 font-semibold'}>
              {data?.scheduler?.paused ? 'Paused' : data?.scheduler?.running ? 'Running' : 'Stopped'}
            </span>
          </p>
          {data?.scheduler?.next_run && (
            <p className="text-[11px] text-gray-400 mt-1">Next: {new Date(data.scheduler.next_run).toLocaleString()}</p>
          )}
          <Button variant="ghost" size="xs" className="mt-3" onClick={() => navigate('/head/scraper/scheduler')}>
            Manage Scheduler
          </Button>
        </div>

        <div className="card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-2">Career Pages</h3>
          <p className="text-[12px] text-gray-500">{data?.career_pages_tracked || 0} pages tracked</p>
          <Button variant="ghost" size="xs" className="mt-3" onClick={() => navigate('/head/scraper/career-pages')}>
            Manage Pages
          </Button>
        </div>

        <div className="card p-5">
          <h3 className="text-[13px] font-bold text-gray-700 mb-2">By Country</h3>
          {Object.entries(data?.by_country || {}).map(([k, v]) => (
            <p key={k} className="text-[12px] text-gray-500">{k}: <span className="font-semibold text-gray-700">{v}</span></p>
          ))}
        </div>
      </div>
    </Page>
  )
}
