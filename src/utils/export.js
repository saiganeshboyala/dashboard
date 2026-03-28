export function downloadCSV(data, filename = 'export') {
  if (!data?.length) return
  const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object')
  const rows = data.map(r => headers.map(h => {
    const v = r[h]
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export function exportToPDF(title, sections = []) {
  const styles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .header p { font-size: 11px; color: #9ca3af; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
    .stat-value { font-size: 20px; font-weight: 700; color: #111827; }
    .stat-label { font-size: 10px; color: #6b7280; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f9fafb; text-align: left; padding: 8px 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    td { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; color: #4b5563; }
    tr:nth-child(even) td { background: #fafbfc; }
    .text-block { font-size: 12px; line-height: 1.6; color: #4b5563; }
    @media print { body { padding: 20px; } }
  `

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${styles}</style></head><body>`
  html += `<div class="header"><h1>${title}</h1><p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString()}</p></div>`

  for (const section of sections) {
    html += '<div class="section">'

    if (section.title) {
      html += `<div class="section-title">${section.title}</div>`
    }

    if (section.type === 'stats' && section.items) {
      html += '<div class="stats-grid">'
      for (const item of section.items) {
        html += `<div class="stat-card"><div class="stat-value">${item.value ?? '—'}</div><div class="stat-label">${item.label}</div></div>`
      }
      html += '</div>'
    }

    if (section.type === 'table' && section.columns && section.rows) {
      html += '<table><thead><tr>'
      for (const col of section.columns) {
        html += `<th>${col}</th>`
      }
      html += '</tr></thead><tbody>'
      for (const row of section.rows) {
        html += '<tr>'
        for (const cell of row) {
          html += `<td>${cell ?? '—'}</td>`
        }
        html += '</tr>'
      }
      html += '</tbody></table>'
    }

    if (section.type === 'text' && section.content) {
      html += `<div class="text-block">${section.content}</div>`
    }

    html += '</div>'
  }

  html += '</body></html>'

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 300)
  }
}