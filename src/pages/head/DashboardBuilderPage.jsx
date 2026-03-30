import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Badge, Button, Modal, Input, Select, Loading, ConfirmDialog } from '../../components/Shared'
import { getToken } from '../../utils/auth'
import { Plus, Save, Settings, Trash2, GripVertical, BarChart3, Hash, Table, Filter, Activity, Trophy, FileText, ArrowLeft, RefreshCw } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const API = '/api/dashboards'
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts.headers } })
  const j = await res.json()
  if (!res.ok) throw new Error(j?.error?.message || j?.message || 'Request failed')
  if (j.success !== undefined) { if (!j.success) throw new Error(j.error?.message || 'Failed'); return j.data || j }
  return j
}

const WIDGET_ICONS = { metric: Hash, chart: BarChart3, table: Table, funnel: Filter, activity_feed: Activity, leaderboard: Trophy, saved_report: FileText }
const COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#64748b', '#ec4899', '#f97316', '#06b6d4']
const OBJECTS = ['students', 'submissions', 'interviews', 'placements', 'recruiters']
const AGGS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']

export default function DashboardBuilderPage() {
  const toast = useToast()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDash, setActiveDash] = useState(null) // editing a dashboard
  const [widgetData, setWidgetData] = useState({})   // {widgetId: data}
  const [editWidget, setEditWidget] = useState(null)  // widget being configured
  const [addModal, setAddModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newDashName, setNewDashName] = useState('')
  const [showNewDash, setShowNewDash] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  useEffect(() => {
    loadDashboards()
    api('/widget-types').then(d => {
      const types = d.widgetTypes || d.data || d || []
      if (Array.isArray(types) && types.length > 0) {
        // Use server widget types if available
      }
    }).catch(() => {}) // fall back to hardcoded if endpoint not ready
  }, [])

  async function loadDashboards() {
    setLoading(true)
    try { const d = await api(''); setDashboards(d.dashboards || []) } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function openDashboard(id) {
    try {
      const d = await api(`/${id}`)
      setActiveDash(d.dashboard)
      fetchAllWidgetData(d.dashboard.widgets || [])
    } catch (e) { toast.error(e.message) }
  }

  async function fetchAllWidgetData(widgets) {
    if (!widgets?.length) return
    setRefreshing(true)
    try {
      const d = await api('/bulk-widget-data', { method: 'POST', body: JSON.stringify({ widgets }) })
      setWidgetData(d.results || {})
    } catch (e) { console.error(e) }
    setRefreshing(false)
  }

  async function createDashboard() {
    setShowNewDash(true)
  }
  async function doCreateDashboard() {
    const name = newDashName.trim()
    if (!name) return
    try {
      const d = await api('', { method: 'POST', body: JSON.stringify({ name, widgets: [] }) })
      setActiveDash(d.dashboard)
      setShowNewDash(false); setNewDashName('')
      loadDashboards()
    } catch (e) { toast.error(e.message) }
  }

  async function saveDashboard() {
    if (!activeDash) return
    try {
      await api(`/${activeDash.id}`, { method: 'PUT', body: JSON.stringify({ widgets: activeDash.widgets }) })
      toast.success('Dashboard saved!'); loadDashboards()
      setTimeout(() => toast.success(''), 3000)
    } catch (e) { toast.error(e.message) }
  }

  async function deleteDashboard(id) {
        await api(`/${id}`, { method: 'DELETE' })
    if (activeDash?.id === id) setActiveDash(null)
    loadDashboards()
  }

  function addWidget(type) {
    const id = `w_${Date.now()}`
    const defaults = { metric: { w: 3, h: 2 }, chart: { w: 6, h: 4 }, table: { w: 6, h: 4 }, funnel: { w: 12, h: 3 }, activity_feed: { w: 4, h: 4 }, leaderboard: { w: 4, h: 4 }, saved_report: { w: 6, h: 4 } }
    const size = defaults[type] || { w: 4, h: 3 }
    const widget = { id, type, title: `New ${type}`, config: {}, ...size }
    setActiveDash(prev => ({ ...prev, widgets: [...(prev.widgets || []), widget] }))
    setAddModal(false)
    setEditWidget(widget)
  }

  function updateWidgetConfig(widgetId, config) {
    setActiveDash(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w),
    }))
  }

  function updateWidgetTitle(widgetId, title) {
    setActiveDash(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? { ...w, title } : w),
    }))
  }

  function removeWidget(widgetId) {
    setActiveDash(prev => ({ ...prev, widgets: prev.widgets.filter(w => w.id !== widgetId) }))
  }

  async function refreshWidget(widget) {
    try {
      const d = await api('/widget-data', { method: 'POST', body: JSON.stringify({ widgetType: widget.type, config: widget.config }) })
      setWidgetData(prev => ({ ...prev, [widget.id]: d.data }))
    } catch (e) { console.error(e) }
  }

  // ═══ LIST VIEW ═══
  if (!activeDash) {
    const NewDashModal = showNewDash ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowNewDash(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-modal p-6 w-80 anim-scale" onClick={e => e.stopPropagation()}>
          <h3 className="text-[15px] font-bold mb-4">New Dashboard</h3>
          <input autoFocus value={newDashName} onChange={e => setNewDashName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doCreateDashboard()}
            placeholder="Dashboard name..." className="field-input mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewDash(false)} className="px-3 py-1.5 text-sm text-gray-500">Cancel</button>
            <button onClick={doCreateDashboard} disabled={!newDashName.trim()} className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    ) : null
    return (
      <Page title="Dashboard Builder" subtitle={`${dashboards.length} dashboards`}
        actions={<Button onClick={createDashboard}><Plus size={14} /> New Dashboard</Button>}>
      {NewDashModal}
      {loading ? <Loading /> : (
          <div className="grid grid-cols-3 gap-4">
            {dashboards.map(d => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => openDashboard(d.id)}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{d.name}</h3>
                  <button onClick={e => { e.stopPropagation(); deleteDashboard(d.id) }} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="flex gap-2">
                  <Badge color="blue">{d.widget_count || 0} widgets</Badge>
                  {d.is_shared && <Badge color="green">Shared</Badge>}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">{d.updated_at ? new Date(d.updated_at).toLocaleDateString() : ''}</p>
              </div>
            ))}
            {dashboards.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No dashboards yet. Click "New Dashboard" to create one.</p>
              </div>
            )}
          </div>
        )}
      </Page>
    )
  }

  // ═══ CANVAS VIEW ═══
  return (
    <Page title={activeDash.name} subtitle={`${activeDash.widgets?.length || 0} widgets`}
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setActiveDash(null)}><ArrowLeft size={14} /> Back</Button>
          <Button variant="secondary" onClick={() => fetchAllWidgetData(activeDash.widgets)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh</Button>
          <Button variant="secondary" onClick={() => setAddModal(true)}><Plus size={14} /> Add Widget</Button>
          <Button onClick={saveDashboard}><Save size={14} /> Save</Button>
        </div>
      }>
      {/* Widget Grid */}
      <div className="grid grid-cols-12 gap-4 auto-rows-[80px]">
        {(activeDash.widgets || []).map(widget => (
          <div key={widget.id}
            draggable
            onDragStart={() => setDraggedId(widget.id)}
            onDragOver={e => { e.preventDefault(); setDragOverId(widget.id) }}
            onDrop={() => {
              if (!draggedId || draggedId === widget.id) return
              const widgets = [...activeDash.widgets]
              const fromIdx = widgets.findIndex(w => w.id === draggedId)
              const toIdx   = widgets.findIndex(w => w.id === widget.id)
              widgets.splice(toIdx, 0, widgets.splice(fromIdx, 1)[0])
              setActiveDash(prev => ({ ...prev, widgets }))
              setDraggedId(null); setDragOverId(null)
            }}
            onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
            className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-all
              ${dragOverId === widget.id && draggedId !== widget.id ? 'border-blue-400 ring-2 ring-blue-300' : 'border-gray-200'}
              ${draggedId === widget.id ? 'opacity-40 scale-95' : 'opacity-100'}
            `}
            style={{ gridColumn: `span ${Math.min(widget.w || 4, 12)}`, gridRow: `span ${widget.h || 3}` }}>
            {/* Widget header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                <GripVertical size={12} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-700">{widget.title}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => refreshWidget(widget)} className="p-1 text-gray-300 hover:text-blue-500"><RefreshCw size={12} /></button>
                <button onClick={() => setEditWidget(widget)} className="p-1 text-gray-300 hover:text-blue-500"><Settings size={12} /></button>
                <button onClick={() => removeWidget(widget.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            </div>
            {/* Widget body */}
            <div className="flex-1 p-3 overflow-auto">
              <WidgetRenderer type={widget.type} data={widgetData[widget.id]} config={widget.config} />
            </div>
          </div>
        ))}
      </div>

      {(activeDash.widgets || []).length === 0 && (
        <div className="text-center py-16 text-gray-300">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm mb-4">Empty dashboard. Add widgets to get started.</p>
          <Button variant="secondary" onClick={() => setAddModal(true)}><Plus size={14} /> Add Widget</Button>
        </div>
      )}

      {/* Add Widget Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Widget" width="max-w-lg">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { type: 'metric', label: 'Metric Card', desc: 'Single number' },
            { type: 'chart', label: 'Chart', desc: 'Bar, line, pie' },
            { type: 'table', label: 'Data Table', desc: 'Rows of records' },
            { type: 'funnel', label: 'Pipeline Funnel', desc: 'Conversion stages' },
            { type: 'activity_feed', label: 'Activity Feed', desc: 'Recent activities' },
            { type: 'leaderboard', label: 'Leaderboard', desc: 'Top performers' },
            { type: 'saved_report', label: 'Saved Report', desc: 'Embed a report' },
          ].map(w => {
            const Icon = WIDGET_ICONS[w.type] || Hash
            return (
              <button key={w.type} onClick={() => addWidget(w.type)}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                <Icon size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{w.label}</p>
                  <p className="text-[11px] text-gray-400">{w.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Edit Widget Config Modal */}
      <Modal open={!!editWidget} onClose={() => setEditWidget(null)} title={`Configure: ${editWidget?.title || ''}`} width="max-w-lg">
        {editWidget && (
          <div className="space-y-4 mb-6">
            <Input label="Widget Title" value={editWidget.title || ''} onChange={e => {
              const t = e.target.value; setEditWidget(prev => ({ ...prev, title: t })); updateWidgetTitle(editWidget.id, t)
            }} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Width (columns 1-12)" type="number" value={editWidget.w || 4} onChange={e => {
                const v = parseInt(e.target.value) || 4
                setActiveDash(prev => ({ ...prev, widgets: prev.widgets.map(w => w.id === editWidget.id ? { ...w, w: Math.min(v, 12) } : w) }))
              }} />
              <Input label="Height (rows)" type="number" value={editWidget.h || 3} onChange={e => {
                const v = parseInt(e.target.value) || 3
                setActiveDash(prev => ({ ...prev, widgets: prev.widgets.map(w => w.id === editWidget.id ? { ...w, h: v } : w) }))
              }} />
            </div>

            {/* Type-specific config */}
            {editWidget.type === 'metric' && (
              <>
                <Select label="Object" value={editWidget.config?.objectType || ''} onChange={e => updateWidgetConfig(editWidget.id, { objectType: e.target.value })}>
                  <option value="">Select</option>
                  {OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
                <Select label="Aggregation" value={editWidget.config?.aggregation || 'COUNT'} onChange={e => updateWidgetConfig(editWidget.id, { aggregation: e.target.value })}>
                  {AGGS.map(a => <option key={a} value={a}>{a}</option>)}
                </Select>
                <Input label="Field (for SUM/AVG)" placeholder="e.g., bill_rate" value={editWidget.config?.field || ''} onChange={e => updateWidgetConfig(editWidget.id, { field: e.target.value })} />
              </>
            )}

            {editWidget.type === 'chart' && (
              <>
                <Select label="Object" value={editWidget.config?.objectType || ''} onChange={e => updateWidgetConfig(editWidget.id, { objectType: e.target.value })}>
                  <option value="">Select</option>
                  {OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
                <Input label="Group by field" placeholder="e.g., marketing_status, technology" value={editWidget.config?.groupBy || ''} onChange={e => updateWidgetConfig(editWidget.id, { groupBy: e.target.value })} />
                <Select label="Chart Type" value={editWidget.config?.chartType || 'bar'} onChange={e => updateWidgetConfig(editWidget.id, { chartType: e.target.value })}>
                  <option value="bar">Bar</option><option value="pie">Pie</option><option value="line">Line</option>
                </Select>
                <Select label="Aggregation" value={editWidget.config?.aggregation || 'COUNT'} onChange={e => updateWidgetConfig(editWidget.id, { aggregation: e.target.value })}>
                  {AGGS.map(a => <option key={a} value={a}>{a}</option>)}
                </Select>
              </>
            )}

            {editWidget.type === 'table' && (
              <>
                <Select label="Object" value={editWidget.config?.objectType || ''} onChange={e => updateWidgetConfig(editWidget.id, { objectType: e.target.value })}>
                  <option value="">Select</option>
                  {OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
                <Input label="Columns (comma-separated)" placeholder="first_name,last_name,technology" value={editWidget.config?.columns?.join(',') || ''} onChange={e => updateWidgetConfig(editWidget.id, { columns: e.target.value.split(',').map(s => s.trim()) })} />
                <Input label="Limit" type="number" value={editWidget.config?.limit || 10} onChange={e => updateWidgetConfig(editWidget.id, { limit: parseInt(e.target.value) })} />
              </>
            )}

            {editWidget.type === 'leaderboard' && (
              <Select label="Metric" value={editWidget.config?.metric || 'placements'} onChange={e => updateWidgetConfig(editWidget.id, { metric: e.target.value })}>
                <option value="submissions">Submissions</option>
                <option value="interviews">Interviews</option>
                <option value="placements">Placements</option>
              </Select>
            )}

            {editWidget.type === 'saved_report' && (
              <Input label="Report ID" type="number" placeholder="Enter saved report ID" value={editWidget.config?.reportId || ''} onChange={e => updateWidgetConfig(editWidget.id, { reportId: parseInt(e.target.value) })} />
            )}

            <Button onClick={() => { refreshWidget(editWidget); setEditWidget(null) }}>Apply & Load Data</Button>
          </div>
        )}
      </Modal>
    </Page>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET RENDERERS — display data per widget type
// ═══════════════════════════════════════════════════════════════════════════════

function WidgetRenderer({ type, data, config }) {
  if (!data) return <div className="h-full flex items-center justify-center text-xs text-gray-300">Click ⚙ to configure</div>
  if (data.error) return <div className="text-xs text-red-400">{data.error}</div>

  switch (type) {
    case 'metric': return <MetricWidget data={data} />
    case 'chart': return <ChartWidget data={data} />
    case 'table': return <TableWidget data={data} />
    case 'funnel': return <FunnelWidget data={data} />
    case 'activity_feed': return <ActivityWidget data={data} />
    case 'leaderboard': return <LeaderboardWidget data={data} />
    case 'saved_report': return data.labels ? <ChartWidget data={data} /> : <TableWidget data={data} />
    default: return <div className="text-xs text-gray-400">Unknown widget</div>
  }
}

function MetricWidget({ data }) {
  const val = data.value
  const display = typeof val === 'number' ? val >= 1000 ? `${(val / 1000).toFixed(1)}K` : Math.round(val * 100) / 100 : val
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <p className="text-3xl font-bold text-gray-900">{display?.toLocaleString?.() || display}</p>
      {data.label && <p className="text-xs text-gray-400 mt-1">{data.label}</p>}
    </div>
  )
}

function ChartWidget({ data }) {
  if (!data.labels?.length) return <div className="text-xs text-gray-300 text-center">No data</div>
  const max = Math.max(...data.values)

  if (data.chartType === 'pie') {
    const total = data.values.reduce((a, b) => a + b, 0)
    return (
      <div className="space-y-1.5">
        {data.labels.slice(0, 8).map((label, i) => {
          const pct = total > 0 ? Math.round((data.values[i] / total) * 100) : 0
          return (
            <div key={i} className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span className="text-[11px] text-gray-600 flex-1 truncate">{label}</span>
              <span className="text-[11px] font-mono font-medium text-gray-900">{data.values[i].toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {data.labels.slice(0, 10).map((label, i) => {
        const pct = max > 0 ? Math.round((data.values[i] / max) * 100) : 0
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 w-24 truncate text-right">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="h-full rounded-full flex items-center justify-end px-1.5 transition-all" style={{ width: `${Math.max(pct, 4)}%`, background: COLORS[i % COLORS.length] }}>
                <span className="text-[9px] text-white font-medium">{Math.round(data.values[i]).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TableWidget({ data }) {
  const rows = data.rows || []
  if (!rows.length) return <div className="text-xs text-gray-300 text-center">No data</div>
  const cols = Object.keys(rows[0]).slice(0, 6)
  return (
    <table className="w-full text-[11px]">
      <thead><tr>{cols.map(c => <th key={c} className="text-left py-1 px-2 font-medium text-gray-500 border-b bg-gray-50">{c.replace(/_/g, ' ')}</th>)}</tr></thead>
      <tbody>{rows.slice(0, 15).map((r, i) => <tr key={i} className="hover:bg-gray-50">{cols.map(c => <td key={c} className="py-1 px-2 border-b border-gray-50 text-gray-700 truncate max-w-[120px]">{r[c] !== null ? String(r[c]).slice(0, 30) : '—'}</td>)}</tr>)}</tbody>
    </table>
  )
}

function FunnelWidget({ data }) {
  const stages = data.stages || []
  const max = stages[0]?.value || 1
  return (
    <div className="flex items-end gap-2 h-full">
      {stages.map((s, i) => {
        const pct = Math.round((s.value / max) * 100)
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] font-mono font-bold text-gray-900 mb-1">{s.value.toLocaleString()}</span>
            <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(pct, 8)}%`, background: COLORS[i % COLORS.length], minHeight: 8 }} />
            <span className="text-[9px] text-gray-500 mt-1 text-center leading-tight">{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function ActivityWidget({ data }) {
  const items = data.activities || []
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((a, i) => (
        <div key={i} className="flex gap-2 text-[11px]">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
          <div>
            <span className="font-medium text-gray-700">{a.user_name || 'User'}</span>
            <span className="text-gray-400 mx-1">{a.activity_type}</span>
            <span className="text-gray-600">{a.subject || ''}</span>
            <p className="text-[10px] text-gray-300">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</p>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-gray-300 text-center">No recent activities</p>}
    </div>
  )
}

function LeaderboardWidget({ data }) {
  const rows = data.rows || []
  const max = rows[0]?.value || 1
  return (
    <div className="space-y-2">
      {rows.slice(0, 8).map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
          <span className="text-[11px] text-gray-700 flex-1 truncate">{r.name}</span>
          <div className="w-20 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.round((r.value / max) * 100)}%`, background: COLORS[i % COLORS.length] }} />
          </div>
          <span className="text-[11px] font-mono font-medium text-gray-900 w-8 text-right">{r.value}</span>
        </div>
      ))}
    </div>
  )
}