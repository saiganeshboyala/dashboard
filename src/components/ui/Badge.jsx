export function Badge({ children, color = 'gray', size = 'sm', dot = false }) {
  const colors = {
    green:  'bg-success-50 text-success-700 ring-success-600/20',
    blue:   'bg-brand-50 text-brand-700 ring-brand-600/20',
    amber:  'bg-warn-50 text-warn-700 ring-warn-600/20',
    red:    'bg-danger-50 text-danger-700 ring-danger-600/20',
    gray:   'bg-gray-100 text-gray-600 ring-gray-500/20',
    purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    teal:   'bg-teal-50 text-teal-700 ring-teal-600/20',
  }
  const dotColors = {
    green: 'bg-success-500', blue: 'bg-brand-500', amber: 'bg-warn-500',
    red: 'bg-danger-500', gray: 'bg-gray-400', purple: 'bg-purple-500', teal: 'bg-teal-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${colors[color] || colors.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color] || dotColors.gray}`} />}
      {children}
    </span>
  )
}

/** Maps a status string to a Badge color name.
 *  Exact matches use picklist values from the data model;
 *  substring fallback handles ad-hoc values. */
export function statusBadgeColor(s) {
  if (!s) return 'gray'
  const sl = s.toLowerCase()
  // ── Student Activity Status (Student_Marketing_Status__c) ──────────────
  // ── Submission Status (Submission_Status__c) ───────────────────────────
  // ── Interview Final Status (Final_Status__c) ───────────────────────────
  const exact = {
    'in market':                   'blue',
    'verbal confirmation':          'purple',
    'project started':              'green',
    'project completed':            'green',
    'project completed-in market':  'teal',
    'exit':                         'red',
    'pre marketing':                'amber',
    'submitted':                    'blue',
    'interview scheduled':          'purple',
    'confirmation':                 'green',
    'expecting confirmation':       'teal',
    'very good':                    'green',
    'good':                         'blue',
    'average':                      'amber',
    're-scheduled':                 'amber',
    'bad':                          'red',
    'very bad':                     'red',
    'cancelled':                    'red',
  }
  if (exact[sl]) return exact[sl]
  // ── Substring fallback for any unlisted values ─────────────────────────
  if (sl.includes('market') || sl.includes('open'))                          return 'blue'
  if (sl.includes('placed') || sl.includes('pass') || sl.includes('complet')) return 'green'
  if (sl.includes('verbal') || sl.includes('pending'))                       return 'purple'
  if (sl.includes('reject') || sl.includes('fail') || sl.includes('cancel')) return 'red'
  if (sl.includes('pre') || sl.includes('warm') || sl.includes('hold'))     return 'amber'
  return 'gray'
}
