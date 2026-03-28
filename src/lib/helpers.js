/** Maps a status string to a Badge color name. */
export function statusBadgeColor(s) {
  if (!s) return 'gray'
  const sl = s.toLowerCase()
  if (sl.includes('market') || sl.includes('active') || sl.includes('open'))           return 'blue'
  if (sl.includes('project') || sl.includes('placed') || sl.includes('conf') ||
      sl.includes('pass')    || sl.includes('complet'))                                 return 'green'
  if (sl.includes('verbal')  || sl.includes('pending'))                                return 'purple'
  if (sl.includes('exit')    || sl.includes('reject') || sl.includes('fail') ||
      sl.includes('cancel'))                                                            return 'red'
  if (sl.includes('pre')     || sl.includes('warm')   || sl.includes('hold'))         return 'amber'
  return 'gray'
}

/** Converts snake_case or camelCase to "Title Case" */
export function fieldLabel(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
}
