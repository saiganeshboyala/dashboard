/**
 * Scraper API client — talks to the staffing-scraper backend on port 8000.
 * Uses the Vite proxy at /scraper-api to avoid CORS issues in dev.
 * Completely separate from the CRM client (port 3000).
 */

const BASE = '/scraper-api'

async function request(path, opts = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || body.message || `Scraper API error ${res.status}`)
  }
  return res.json()
}

export const scraperApi = {
  // Dashboard
  getDashboard:    ()           => request('/dashboard'),

  // Roles
  getRoles:        (params)     => request(`/roles?${new URLSearchParams(params)}`),
  getNewRoles:     (params)     => request(`/roles/new?${new URLSearchParams(params)}`),
  markSeen:        (roleIds)    => request('/roles/mark-seen', { method: 'POST', body: JSON.stringify({ role_ids: roleIds }) }),

  // Scraping
  scrapeNow:       (sources)    => request('/scrape/now', { method: 'POST', body: JSON.stringify({ sources }) }),
  scrapeCustom:    (body)       => request('/scrape/custom', { method: 'POST', body: JSON.stringify(body) }),
  getLogs:         (limit = 20) => request(`/scrape/logs?limit=${limit}`),
  getSources:      ()           => request('/scrape/sources'),

  // Scheduler
  getScheduler:    ()           => request('/scheduler/status'),
  pauseScheduler:  ()           => request('/scheduler/pause', { method: 'POST' }),
  resumeScheduler: ()           => request('/scheduler/resume', { method: 'POST' }),

  // Career pages
  getCareerPages:  (params)     => request(`/career-pages?${new URLSearchParams(params)}`),
  addCareerPage:   (body)       => request('/career-pages', { method: 'POST', body: JSON.stringify(body) }),
  importCareerPages: (file)     => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`${BASE}/career-pages/import`, { method: 'POST', body: fd }).then(r => r.json())
  },

  // CRM push
  pushToCRM:       (roleIds)    => request('/crm/push', { method: 'POST', body: JSON.stringify({ role_ids: roleIds }) }),
}
