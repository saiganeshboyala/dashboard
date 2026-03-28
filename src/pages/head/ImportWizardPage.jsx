import { useState, useEffect, useRef } from 'react'
import { Page, DataTable, Badge, Button, Select, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getImportJobs, startImport, getImportFields } from '../../utils/api'
import { Upload, FileText, CheckCircle, AlertCircle, Clock, RefreshCw, Download } from 'lucide-react'

const OBJECT_TYPES = ['students', 'submissions', 'interviews', 'recruiters']

export default function ImportWizardPage() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [objectType, setObjectType] = useState('students')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const [fields, setFields] = useState([])
  const [pollingJob, setPollingJob] = useState(null)

  const loadFields = async (objType) => {
    try {
      const data = await getImportFields(objType)
      setFields(Array.isArray(data) ? data : data?.fields || [])
    } catch (e) { setFields([]) }
  }

  const pollJob = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const job = await getImportFields(jobId)
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...job } : j))
        if (job?.status === 'completed' || job?.status === 'failed') {
          clearInterval(interval)
          setPollingJob(null)
          if (job.status === 'completed') toast.success(`Import completed: ${job.success_rows || 0} rows imported`)
          else toast.error(`Import failed: ${job.error_message || 'Unknown error'}`)
        }
      } catch { clearInterval(interval) }
    }, 2000)
    setPollingJob(jobId)
    return () => clearInterval(interval)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await getImportJobs()
      setJobs(Array.isArray(data) ? data : data?.jobs || data?.data || [])
    } catch (e) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadFields(objectType) }, [objectType])

  const handleImport = async () => {
    if (!file) return toast.error('Please select a CSV file')
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const lines = e.target.result.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1).filter(Boolean).map(line => {
          const vals = line.split(',')
          return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim()]))
        })
        try {
          await startImport({ objectType, data: rows, fileName: file.name })
          toast.success(`Import started — ${rows.length} rows`)
          const jobList = await getImportJobs()
          const latestJob = (Array.isArray(jobList) ? jobList : jobList?.jobs || [])[0]
          if (latestJob?.id) pollJob(latestJob.id)
          setFile(null); if (fileRef.current) fileRef.current.value = ''
          load()
        } catch (err) { toast.error(err.message) }
        setUploading(false)
      }
      reader.readAsText(file)
    } catch (e) { toast.error(e.message); setUploading(false) }
  }

  const statusIcon = { completed: <CheckCircle size={13} className="text-success-500" />, failed: <AlertCircle size={13} className="text-danger-500" />, processing: <Clock size={13} className="text-warn-500" /> }

  return (
    <Page title="Import Wizard" subtitle="Import data from CSV files">
      {/* Upload area */}
      <div className="card p-6 mb-6">
        <h3 className="text-[13px] font-bold text-gray-900 mb-4">Upload CSV File</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Select label="Object Type" value={objectType} onChange={e => { setObjectType(e.target.value); loadFields(e.target.value) }}>
            {OBJECT_TYPES.map(t => <option key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </Select>
          <div className="col-span-2">
            <label className="field-label">CSV File</label>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept=".csv" onChange={e => setFile(e.target.files[0])}
                className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload"
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-[13px] text-gray-500 hover:border-brand-400 hover:text-brand-600 cursor-pointer transition-colors">
                <Upload size={14} />
                {file ? file.name : 'Choose CSV file...'}
              </label>
              {file && <Button variant="secondary" size="sm" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}>Clear</Button>}
            </div>
          </div>
        </div>
        {fields.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-gray-500">Available fields for {objectType} ({fields.length}):</p>
              <button
                onClick={() => {
                  const headers = fields.map(f => f.columnName || f.column_name || f.name || f).join(',')
                  const blob = new Blob([headers + '\n'], { type: 'text/csv' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = `${objectType}_template.csv`
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors"
              >
                <Download size={11} /> Download Template
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {fields.map((f, i) => {
                const label = f.columnName || f.column_name || f.name || (typeof f === 'string' ? f : String(i))
                return (
                  <span key={label + i} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-mono text-gray-600">{label}</span>
                )
              })}
            </div>
          </div>
        )}
        <Alert type="info">
          CSV must include column headers matching field names. Use "Download Template" above to get the correct format.
        </Alert>
        <div className="flex items-center gap-3 mt-4">
          <Button onClick={handleImport} loading={uploading} disabled={!file}>
            <Upload size={13} /> Start Import
          </Button>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /> Refresh jobs</Button>
        </div>
      </div>

      {/* Import history */}
      <DataTable
        columns={[
          { key: 'id', label: 'Job ID', render: v => <span className="font-mono text-[11px]">#{v}</span> },
          { key: 'object_type', label: 'Object', render: v => <Badge color="blue">{v}</Badge> },
          { key: 'file_name', label: 'File', render: v => <span className="flex items-center gap-1.5"><FileText size={13} className="text-gray-400" />{v || '—'}</span> },
          { key: 'total_rows', label: 'Rows', render: v => <span className="tabular-nums font-medium">{v || 0}</span> },
          { key: 'success_rows', label: 'Success', render: v => <span className="text-success-600 tabular-nums font-medium">{v ?? 0}</span> },
          { key: 'failed_rows', label: 'Failed', render: v => v ? <span className="text-danger-600 tabular-nums font-medium">{v}</span> : <span className="text-gray-300">0</span> },
          { key: 'status', label: 'Status', render: v => (
            <div className="flex items-center gap-1.5">
              {statusIcon[v] || <Clock size={13} className="text-gray-400" />}
              <Badge color={v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'amber'}>{v || 'pending'}</Badge>
            </div>
          )},
          { key: 'created_at', label: 'Started', render: v => v ? new Date(v).toLocaleString() : '—' },
        ]}
        rows={jobs}
        loading={loading}
        emptyText="No import jobs yet"
      />
    </Page>
  )
}