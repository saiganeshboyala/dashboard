import { useState } from 'react'
import { Page, Badge, Button, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getToken } from '../../utils/auth'
import { Download, FileText, Users, Calendar, Briefcase, UserCheck, BarChart3, Loader2 } from 'lucide-react'

const EXPORTS = [
  { id: 'students',         label: 'Students',          icon: Users,     desc: 'All student records with status, technology, and activity counts', color: 'blue' },
  { id: 'submissions',      label: 'Submissions',        icon: FileText,  desc: 'All submissions with client, vendor, rate, and status', color: 'purple' },
  { id: 'interviews',       label: 'Interviews',         icon: Calendar,  desc: 'All interviews with type, date, and final result', color: 'amber' },
  { id: 'placements',       label: 'Placements',         icon: Briefcase, desc: 'All confirmed placements with bill rate and start date', color: 'green' },
  { id: 'recruiters',       label: 'Recruiters',         icon: UserCheck, desc: 'Recruiter list with performance metrics', color: 'teal' },
  { id: 'analytics-summary',label: 'Analytics Summary',  icon: BarChart3, desc: 'Overview stats, BU comparison, and funnel data', color: 'red' },
]

const colorMap = {
  blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-600', green: 'bg-success-50 text-success-600',
  teal: 'bg-teal-50 text-teal-600', red: 'bg-red-50 text-red-600',
}

export default function ExportPage() {
  const toast = useToast()
  const [exporting, setExporting] = useState(null)
  const [history, setHistory] = useState([])

  const handleExport = async (exportType) => {
    setExporting(exportType)
    try {
      const exportPaths = {
        'students': '/api/v1/export/students',
        'submissions': '/api/v1/export/submissions',
        'interviews': '/api/v1/export/interviews',
        'placements': '/api/v1/export/placements',
        'recruiters': '/api/v1/export/recruiters',
        'analytics-summary': '/api/v1/export/analytics-summary',
      }
      const exportUrl = exportPaths[exportType] || `/api/v1/export/${exportType}`
      const res = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })

      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)

      const contentType = res.headers.get('content-type') || ''
      const blob = await res.blob()
      const filename = res.headers.get('content-disposition')?.match(/filename="?([^";\n]+)"?/)?.[1]
        || `${exportType}_${new Date().toISOString().slice(0,10)}.csv`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)

      const record = { type: exportType, filename, date: new Date().toLocaleString(), size: `${(blob.size / 1024).toFixed(1)} KB` }
      setHistory(h => [record, ...h.slice(0, 9)])
      toast.success(`${EXPORTS.find(e => e.id === exportType)?.label} exported successfully`)
    } catch (e) {
      toast.error(e.message)
    }
    setExporting(null)
  }

  return (
    <Page title="Export Data" subtitle="Download your CRM data as CSV files">
      <Alert type="info" className="mb-6">
        All exports include headers and are UTF-8 encoded CSV files compatible with Excel, Google Sheets, and any data tool.
      </Alert>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {EXPORTS.map(exp => {
          const Icon = exp.icon
          const isExporting = exporting === exp.id
          return (
            <div key={exp.id} className="card p-5 flex items-start justify-between gap-4 hover:shadow-elevated transition-shadow">
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[exp.color]}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-[14px]">{exp.label}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">{exp.desc}</p>
                </div>
              </div>
              <Button
                size="sm" variant="secondary"
                onClick={() => handleExport(exp.id)}
                disabled={!!exporting}
                loading={isExporting}
                className="shrink-0"
              >
                {!isExporting && <Download size={13} />}
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          )
        })}
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-gray-900 mb-3">Recent Exports (this session)</h3>
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-50">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <FileText size={14} className="text-gray-400" />
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">{h.filename}</p>
                      <p className="text-[11px] text-gray-400">{h.date} · {h.size}</p>
                    </div>
                  </div>
                  <Badge color="green">Downloaded</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
