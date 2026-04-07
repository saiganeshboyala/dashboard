import { useState, useEffect, useRef } from 'react'
import { Upload, Plus, RefreshCw, Globe } from 'lucide-react'
import { Page, Button, Input, Modal, Loading, DataTable } from '../../components/ui'
import { scraperApi } from '../../api/scraperClient'

export default function CareerPages() {
  const [pages, setPages]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileRef = useRef(null)

  // Add form
  const [addCompany, setAddCompany] = useState('')
  const [addUrl, setAddUrl]         = useState('')
  const [adding, setAdding]         = useState(false)

  function load() {
    setLoading(true)
    scraperApi.getCareerPages({ search, page, per_page: 50 })
      .then(data => setPages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [search, page])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    try {
      const res = await scraperApi.importCareerPages(file)
      setUploadResult(res)
      load()
    } catch { /* ignored */ }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleAdd() {
    if (!addCompany.trim() || !addUrl.trim()) return
    setAdding(true)
    try {
      await scraperApi.addCareerPage({ company_name: addCompany.trim(), careers_url: addUrl.trim() })
      setShowAdd(false)
      setAddCompany('')
      setAddUrl('')
      load()
    } catch { /* ignored */ }
    setAdding(false)
  }

  const columns = [
    { key: 'company', label: 'Company', sortable: true },
    { key: 'url', label: 'Career URL', sortable: false,
      render: (v) => v ? (
        <a href={v} target="_blank" rel="noreferrer"
          className="text-brand-600 hover:underline text-[12px] truncate block max-w-[300px]">{v}</a>
      ) : '—'
    },
    { key: 'ats', label: 'ATS Platform', sortable: true,
      render: (v) => v ? (
        <span className="text-[11px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{v}</span>
      ) : <span className="text-gray-300">—</span>
    },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => (
        <span className={`text-[11px] font-medium ${v === 'active' ? 'text-success-600' : 'text-gray-400'}`}>{v || 'pending'}</span>
      )
    },
  ]

  return (
    <Page
      title="Career Pages"
      subtitle="Track company career pages for automated scraping"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <label>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
              <Upload size={13} /> Import Excel
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} className="hidden" />
          </label>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={13} /> Add Page
          </Button>
        </div>
      }
    >
      {/* Upload result */}
      {uploadResult && (
        <div className="mb-4 p-4 bg-success-50 rounded-lg border border-success-200 text-[13px]">
          <p className="font-semibold text-success-700">
            Import complete: {uploadResult.imported} imported, {uploadResult.duplicates} duplicates
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by company name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
      </div>

      {loading ? <Loading /> : (
        <DataTable
          columns={columns}
          rows={pages}
          searchable={false}
          pageSize={50}
          emptyText="No career pages imported yet. Upload an Excel file or add one manually."
        />
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Career Page"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={adding} disabled={!addCompany.trim() || !addUrl.trim()}>
              <Globe size={13} /> Add Page
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Company Name" required value={addCompany} onChange={e => setAddCompany(e.target.value)} placeholder="e.g. Google" />
          <Input label="Career Page URL" required value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://careers.google.com" />
        </div>
      </Modal>
    </Page>
  )
}
