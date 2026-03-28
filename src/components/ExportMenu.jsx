import { useState } from 'react'
import { downloadCSV, exportToPDF } from '../utils/export'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'

export function ExportMenu({ options = [] }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(null)

  async function handleExport(opt) {
    setExporting(opt.label); setOpen(false)
    try {
      if (opt.type === 'csv' && opt.endpoint) {
        await downloadCSV(opt.endpoint, opt.filename)
      } else if (opt.type === 'csv' && opt.action) {
        opt.action()
      } else if (opt.type === 'pdf' && opt.action) {
        opt.action()
      }
    } catch (e) {
      console.error('Export failed:', e)
      alert('Export failed: ' + e.message)
    }
    setExporting(null)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-card transition-all">
        <Download size={14} />
        {exporting ? <span className="text-brand-600">{exporting}...</span> : 'Export'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-elevated z-50 py-1 anim-scale">
            {options.map((opt, i) => (
              <button key={i} onClick={() => handleExport(opt)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                {opt.type === 'csv' ? <FileSpreadsheet size={14} className="text-green-600" /> : <FileText size={14} className="text-red-500" />}
                <div>
                  <p className="font-medium text-xs">{opt.label}</p>
                  {opt.description && <p className="text-[10px] text-gray-400">{opt.description}</p>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Pre-built export configs per role ────────────────────────────────────────

export function HeadExportMenu({ stats, bus, recComp, vendors }) {
  return (
    <ExportMenu options={[
      { type: 'csv', label: 'Students CSV', endpoint: 'students', filename: 'all_students.csv', description: 'All students with details' },
      { type: 'csv', label: 'Submissions CSV', endpoint: 'submissions', filename: 'all_submissions.csv', description: 'All resume submissions' },
      { type: 'csv', label: 'Interviews CSV', endpoint: 'interviews', filename: 'all_interviews.csv', description: 'All interview records' },
      { type: 'csv', label: 'Placements CSV', endpoint: 'placements', filename: 'all_placements.csv', description: 'All placements with billing' },
      { type: 'csv', label: 'Recruiters CSV', endpoint: 'recruiters', filename: 'recruiter_performance.csv', description: 'Recruiter performance data' },
      { type: 'csv', label: 'Analytics Summary', endpoint: 'analytics-summary', filename: 'analytics_summary.csv', description: 'Key metrics overview' },
      { type: 'pdf', label: 'Overview Report PDF', description: 'Print-ready overview report', action: () => {
        if (!stats) return
        exportToPDF('Recruitment Platform — Overview Report', [
          { type: 'stats', items: [
            { label: 'Total Students', value: stats.totalStudents },
            { label: 'In Market', value: stats.inMarket },
            { label: 'Placements', value: stats.placed },
            { label: 'Placement Rate', value: `${stats.placementRate}%` },
          ]},
          { type: 'stats', items: [
            { label: 'Total Submissions', value: stats.totalSubmissions },
            { label: 'Total Interviews', value: stats.totalInterviews },
            { label: 'This Week Subs', value: stats.lastWeek?.submissions || 0 },
            { label: 'This Week Int', value: stats.lastWeek?.interviews || 0 },
          ]},
          ...(bus?.length ? [{ type: 'table', title: 'Business Unit Comparison', columns: ['BU', 'Students', 'In Market', 'Subs', 'Int', 'Placed', 'Rate'],
            rows: bus.map(b => [b.name, b.totalStudents, b.inMarket, b.submissions, b.interviews, b.placements, `${b.placementRate}%`]) }] : []),
        ])
      }},
    ]} />
  )
}

export function BUExportMenu() {
  return (
    <ExportMenu options={[
      { type: 'csv', label: 'Students CSV', endpoint: 'students', filename: 'bu_students.csv', description: 'Your BU students' },
      { type: 'csv', label: 'Submissions CSV', endpoint: 'submissions', filename: 'bu_submissions.csv', description: 'Your BU submissions' },
      { type: 'csv', label: 'Interviews CSV', endpoint: 'interviews', filename: 'bu_interviews.csv', description: 'Your BU interviews' },
    ]} />
  )
}

export function RecruiterExportMenu() {
  return (
    <ExportMenu options={[
      { type: 'csv', label: 'My Students CSV', endpoint: 'students', filename: 'my_students.csv', description: 'Your assigned students' },
      { type: 'csv', label: 'My Submissions CSV', endpoint: 'submissions', filename: 'my_submissions.csv', description: 'Your submissions' },
      { type: 'csv', label: 'My Interviews CSV', endpoint: 'interviews', filename: 'my_interviews.csv', description: 'Your interviews' },
    ]} />
  )
}