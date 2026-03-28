/**
 * Base API service — HTTP client with auth, error handling, and auto JSON unwrapping.
 * All domain services import { get, post, put, del } from here.
 */
import { getToken } from '../utils/auth'

async function request(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...opts.headers,
    },
  })
  if (res.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
    return null
  }
  const ct = res.headers.get('content-type')
  if (ct?.includes('text/csv')) return { blob: await res.blob() }
  const json = await res.json()
  if (json.success !== undefined) {
    if (!json.success) throw new Error(json.error?.message || json.message || 'Request failed')
    return json.data ?? json
  }
  return json
}

export const get  = (p)       => request(p)
export const post = (p, b)    => request(p, { method: 'POST',   body: JSON.stringify(b) })
export const put  = (p, b)    => request(p, { method: 'PUT',    body: JSON.stringify(b) })
export const del  = (p)       => request(p, { method: 'DELETE' })
export const patch = (p, b)   => request(p, { method: 'PATCH',  body: JSON.stringify(b) })

export default { get, post, put, delete: del, patch }
