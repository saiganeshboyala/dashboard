// In-memory token store — not in localStorage to prevent XSS theft
let _token = localStorage.getItem('rp_token') // migrate existing sessions

export const getToken = () => _token || localStorage.getItem('rp_token')
export const getUser = () => { try { return JSON.parse(localStorage.getItem('rp_user') || '{}') } catch { return {} } }
export const getRole = () => getUser().role
export const getAdminToken = () => localStorage.getItem('rp_admin_token')
export const saveAdminAuth = (t, a) => { localStorage.setItem('rp_admin_token', t); localStorage.setItem('rp_admin', JSON.stringify(a)) }
export const adminLogout = () => { localStorage.removeItem('rp_admin_token'); localStorage.removeItem('rp_admin'); window.location.href = '/admin/login' }

export function saveAuth(token, user, tenant, refreshToken) {
  _token = token
  localStorage.setItem('rp_token', token) // fallback for page reloads
  localStorage.setItem('rp_user', JSON.stringify(user))
  if (tenant) localStorage.setItem('rp_tenant', JSON.stringify(tenant))
  if (refreshToken) localStorage.setItem('rp_refresh', refreshToken)
}

export function logout() {
  _token = null
  localStorage.removeItem('rp_token')
  localStorage.removeItem('rp_user')
  localStorage.removeItem('rp_tenant')
  localStorage.removeItem('rp_refresh')
  window.location.href = '/login'
}

// Refresh access token using refresh token
let _refreshPromise = null
export async function refreshAccessToken() {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('rp_refresh')
      const res = await fetch('/api/v1/tenants/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include', // sends httpOnly cookie too
      })
      if (!res.ok) throw new Error('Refresh failed')
      const data = await res.json()
      if (data.token) {
        _token = data.token
        localStorage.setItem('rp_token', data.token)
      }
      if (data.refreshToken) localStorage.setItem('rp_refresh', data.refreshToken)
      return data.token
    } catch {
      logout()
      return null
    } finally {
      _refreshPromise = null
    }
  })()
  return _refreshPromise
}

export function getHomePath() {
  const r = getRole()
  return r === 'HEAD' ? '/head' : r === 'BU_ADMIN' ? '/bu' : r === 'RECRUITER' ? '/rec' : r === 'STUDENT' ? '/stu' : '/login'
}
