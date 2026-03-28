import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Loading, Tabs, ConfirmDialog } from '../../components/Shared'
import { getToken } from '../../utils/auth'
import { Plus, Play, Download, Trash2, FileBarChart } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

async function api(p, o = {}) { const r = await fetch(p, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...o.headers } }); const j = await r.json(); return j.data || j }

const OBJECTS = ['students', 'submissions', 'interviews', 'placements', 'recruiters']
const CHART_TYPES = ['table', 'bar', 'pie', 'line']
const AGG_FNS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']

export default function ReportBuilderPage() {
  const [tab, setTab] = useState('saved')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ objectType: 'students', chartType: 'table' })
  const toast = useToast()
  const [result, setResult] = useState(null)
  const [runLoading, setRunLoading] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [availableObjects, setAvailableObjects] = useState([])
  const [availableFields, setAvailableFields] = useState([])
  const [quickSummary, setQuickSummary] = useState(null)

  useEffect(() => {
    api('/api/v1/reports/objects/list').then(r => setAvailableObjects(Array.isArray(r) ? r : r?.objects || OBJECTS)).catch(() => {})
    api('/api/v1/reports/quick/summary').then(setQuickSummary).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.objectType) {
      api(`/api/v1/reports/fields/${form.objectType}`).then(r => {
        const fields = Array.isArray(r) ? r : r?.fields || []
        setAvailableFields(fields)
      }).catch(() => setAvailableFields([]))
    }
  }, [form.objectType])

  const load = () => {
    setLoading(true); api('/api/v1/reports').then(r => setReports(Array.isArray(r) ? r : r?.reports || [])).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const execute = async () => {
    setRunLoading(true); setResult(null)
    try {
      const payload = { objectType: form.objectType }
      if (form.groupBy) { payload.groupBy = form.groupBy; payload.summaryFields = [{ field: 'id', fn: 'COUNT' }] }
      else { payload.columns = (form.columns || 'first_name,last_name,technology').split(',').map(s => s.trim()) }
      if (form.filterField && form.filterValue) { payload.filters = [{ field: form.filterField, op: 'equals', value: form.filterValue }] }
      const r = await api('/api/v1/reports/execute', { method: 'POST', body: JSON.stringify(payload) })
      setResult(r)
    } catch (e) { toast.error(e.message) }
    setRunLoading(false)
  }

  const save = async () => {
    try {
      await api('/api/v1/reports', { method: 'POST', body: JSON.stringify({ name: form.name || 'Untitled', objectType: form.objectType, groupBy: form.groupBy, columns: form.columns?.split(',').map(s => s.trim()), chartType: form.chartType }) })
      toast.success('Report saved!'); setShowCreate(false); load();
    } catch (e) { toast.error(e.message) }
  }

  // Export saved report as CSV - hits /api/v1/reports/:id/export
  const exportReport = async (id) => {
    try {
      const res = await fetch(`/api/v1/reports/${id}/export`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `report_${id}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported')
    } catch(e) { toast.error(e.message) }
  }

  const runSaved = async (id) => {
    setRunLoading(true); setResult(null); setTab('result')
    try { const r = await api(`/api/v1/reports/${id}/run`, { method: 'POST' }); setResult(r) }
    catch (e) { toast.error(e.message) }
    setRunLoading(false)
  }

  const del = async (id) => {
    setDeleting(true)
    try { await api(`/api/v1/reports/${id}`, { method: 'DELETE' }); toast.success('Report deleted'); load() }
    catch (e) { toast.error(e.message) }
    setDeleting(false); setConfirmDel(null)
  }

  return (
    <Page title="Report Builder" subtitle={`${reports.length} saved reports`} actions={<Button onClick={() => { setShowCreate(true); setForm({ objectType: 'students', chartType: 'table' }) }}><Plus size={14} /> New Report</Button>}>
      {quickSummary && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {Object.entries(quickSummary)
            .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
            .slice(0, 4)
            .map(([k, v]) => (
              <div key={k} className="card p-3 text-center">
                <p className="text-xl font-bold tabular-nums">{typeof v === 'number' ? v.toLocaleString() : v}</p>
                <p className="text-[11px] text-gray-400 capitalize mt-0.5">{k.replace(/_/g, ' ')}</p>
              </div>
            ))}
        </div>
      )}
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'saved', label: 'Saved Reports' }, { id: 'builder', label: 'Builder' }, { id: 'result', label: 'Results' }]} />

      <div className="mt-6">
        {tab === 'saved' && (loading ? <Loading /> : (
          <DataTable columns={[
            { key: 'name', label: 'Report', render: (v, r) => (<div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><FileBarChart size={14} /></div><div><p className="font-medium text-gray-900">{v}</p><p className="text-[11px] text-gray-400">{r.object_type} · {r.chart_type || 'table'}</p></div></div>) },
            { key: 'chart_type', label: 'Type', render: v => <Badge>{v || 'table'}</Badge> },
            { key: 'updated_at', label: 'Updated', render: v => v ? new Date(v).toLocaleDateString() : '—' },
            { key: 'actions', label: '', render: (_, r) => (
              <div className="flex gap-1">
                <button onClick={() => runSaved(r.id)} className="p-1 text-gray-400 hover:text-blue-600"><Play size={14} /></button>
                <button onClick={() => setConfirmDel(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            )},
          ]} rows={reports} emptyText="No saved reports yet" />
        ))}

        {tab === 'builder' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Select label="Object" value={form.objectType} onChange={e => setForm({ ...form, objectType: e.target.value })}>{OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}</Select>
              <Select label="Chart Type" value={form.chartType} onChange={e => setForm({ ...form, chartType: e.target.value })}>{CHART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</Select>
              <Input label="Group By" value={form.groupBy || ''} onChange={e => setForm({ ...form, groupBy: e.target.value })} placeholder="e.g., technology" />
            </div>
            {availableFields.length > 0 && (
              <div className="mb-2">
                <p className="text-[11px] text-gray-500 mb-1">Available fields:</p>
                <div className="flex flex-wrap gap-1">
                  {availableFields.slice(0, 20).map((f, i) => {
                    const label = f.columnName || f.column_name || f.name || (typeof f === 'string' ? f : String(i))
                    return (
                      <button key={label + i} onClick={() => setForm(prev => ({...prev, columns: prev.columns ? prev.columns + ', ' + label : label}))}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 rounded text-[11px] font-mono text-gray-600 transition-colors">
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <Input label="Columns (comma-separated, for table)" value={form.columns || ''} onChange={e => setForm({ ...form, columns: e.target.value })} placeholder="first_name, last_name, technology, marketing_status" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Filter Field" value={form.filterField || ''} onChange={e => setForm({ ...form, filterField: e.target.value })} placeholder="marketing_status" />
              <Input label="Filter Value" value={form.filterValue || ''} onChange={e => setForm({ ...form, filterValue: e.target.value })} placeholder="In Market" />
            </div>
            <div className="flex gap-3">
              <Button onClick={execute} disabled={runLoading}>{runLoading ? 'Running...' : <><Play size={14} /> Execute</>}</Button>
              <Input label="" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Report name to save" className="flex-1" />
              <Button variant="secondary" onClick={save} disabled={!form.name}>Save</Button>
            </div>
          </div>
        )}

        {tab === 'result' && (
          runLoading ? <Loading /> : result ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
              {result.rows ? (
                <DataTable columns={Object.keys(result.rows[0] || {}).map(k => ({ key: k, label: k.replace(/_/g, ' ') }))} rows={result.rows} />
              ) : result.groups ? (
                <DataTable columns={[{ key: 'group', label: 'Group', render: v => <span className="font-medium">{v}</span> }, { key: 'count', label: 'Count' }]} rows={result.groups} />
              ) : (
                <div className="text-[13px] text-gray-500 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-2">Raw result ({Object.keys(result).join(', ')}):</p>
                  <div className="space-y-1">
                    {Object.entries(result).slice(0, 20).map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <span className="text-gray-400 w-32 shrink-0">{k}</span>
                        <span className="text-gray-700 font-mono text-[11px]">{typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-gray-400 text-sm">Run a report to see results</p>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Quick Report">
        <div className="space-y-4 mb-6">
          <Select label="Object" value={form.objectType || 'students'} onChange={e => setForm({ ...form, objectType: e.target.value })}>{OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}</Select>
          <Input label="Group By" value={form.groupBy || ''} onChange={e => setForm({ ...form, groupBy: e.target.value })} placeholder="technology" />
          <Input label="Report Name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={save}>Save Report</Button></div>
      </Modal>
      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => del(confirmDel)}
        title="Delete Report" description="Delete this report? This cannot be undone."
        confirmLabel="Delete" danger loading={deleting}
      />
    </Page>
  )
}