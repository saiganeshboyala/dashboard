import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, StatCard } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getForecastPeriods, createForecastPeriod, getForecastRollup } from '../../utils/api'
import { Plus, RefreshCw, TrendingUp, ChevronRight } from 'lucide-react'

export default function ForecastingPage() {
  const toast = useToast()
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState(null)
  const [rollup, setRollup] = useState(null)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await getForecastPeriods()
      setPeriods(Array.isArray(data) ? data : data?.periods || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.periodType) return toast.error('Name and period type are required')
    setCreating(true)
    try {
      await createForecastPeriod(form)
      toast.success('Forecast period created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const loadRollup = async (period) => {
    setSelected(period)
    try {
      const data = await getForecastRollup(period.id)
      setRollup(data)
    } catch (e) { toast.error('Failed to load rollup') }
  }

  return (
    <Page title="Forecasting" subtitle="Sales forecast periods and quotas"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Period</Button>
        </div>
      }>
      {selected && rollup && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold">{selected.name} — Rollup</h3>
            <Button variant="ghost" size="xs" onClick={() => { setSelected(null); setRollup(null) }}>Close</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Quota"     value={`$${(rollup.totalQuota || 0).toLocaleString()}`}    icon="chart"     color="brand" />
            <StatCard label="Committed"       value={`$${(rollup.totalCommitted || 0).toLocaleString()}`} icon="briefcase" color="success" />
            <StatCard label="Attainment"      value={`${rollup.attainmentPct || 0}%`}                     icon="trending"  color={parseFloat(rollup.attainmentPct) >= 100 ? 'success' : 'warn'} />
          </div>
        </div>
      )}

      <DataTable
        columns={[
          { key: 'name', label: 'Period', render: v => <span className="font-medium">{v}</span> },
          { key: 'period_type', label: 'Type', render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
          { key: 'start_date', label: 'Start', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'end_date',   label: 'End',   render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'is_active', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Closed'}</Badge> },
          { key: 'actions', label: '', sortable: false, render: (_, r) => (
            <Button size="xs" variant="secondary" onClick={e => { e.stopPropagation(); loadRollup(r) }}>
              <TrendingUp size={11} /> View Rollup
            </Button>
          )},
        ]}
        rows={periods}
        loading={loading}
        emptyText="No forecast periods"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Forecast Period"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Period Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Period Type" required value={form.periodType || ''} onChange={e => setForm(f => ({ ...f, periodType: e.target.value }))}>
            <option value="">Select type</option>
            {['Monthly', 'Quarterly', 'Annual'].map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Fiscal Year" type="number" value={form.fiscalYear || new Date().getFullYear()} onChange={e => setForm(f => ({ ...f, fiscalYear: parseInt(e.target.value) }))} />
          <Input label="Start Date" required type="date" value={form.startDate || ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          <Input label="End Date" required type="date" value={form.endDate || ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </Modal>
    </Page>
  )
}

// Note: Quotas and entries are accessible via the period rollup view above.
// The ForecastingPage shows periods and clicking "View Rollup" loads the full quota data.
// submitForecastEntry and setForecastQuota are wired in api.js for use when building
// individual quota management sub-pages.
