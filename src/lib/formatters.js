export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

export const formatCurrency = (n, currency = 'USD') =>
  n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n) : '—'

export const formatNumber = (n) =>
  n != null ? Number(n).toLocaleString() : '—'

export const truncate = (s, len = 50) =>
  s && s.length > len ? s.slice(0, len) + '…' : (s || '')

export const capitalize = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''
