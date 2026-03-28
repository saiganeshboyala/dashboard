export const getToken = () => localStorage.getItem('rp_token')
export const getUser = () => { try { return JSON.parse(localStorage.getItem('rp_user') || '{}') } catch { return {} } }
export const getRole = () => getUser().role
export const getAdminToken = () => localStorage.getItem('rp_admin_token')
export const saveAdminAuth = (t, a) => { localStorage.setItem('rp_admin_token', t); localStorage.setItem('rp_admin', JSON.stringify(a)) }
export const adminLogout = () => { localStorage.removeItem('rp_admin_token'); localStorage.removeItem('rp_admin'); window.location.href = '/admin/login' }
export function saveAuth(token, user, tenant) {
  localStorage.setItem('rp_token', token)
  localStorage.setItem('rp_user', JSON.stringify(user))
  if (tenant) localStorage.setItem('rp_tenant', JSON.stringify(tenant))
}
export function logout() { localStorage.removeItem('rp_token'); localStorage.removeItem('rp_user'); localStorage.removeItem('rp_tenant'); window.location.href = '/login' }
export function getHomePath() {
  const r = getRole()
  return r === 'HEAD' ? '/head' : r === 'BU_ADMIN' ? '/bu' : r === 'RECRUITER' ? '/rec' : r === 'STUDENT' ? '/stu' : '/login'
}
