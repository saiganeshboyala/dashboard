import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, Badge, Button, Modal, Input, Select, Loading, DataTable, ConfirmDialog } from '../../components/Shared'
import { getToken } from '../../utils/auth'
import { Plus, Play, Save, Trash2, ArrowLeft, Zap, Mail, Bell, Clock, GitBranch, CheckSquare, Repeat, Globe, Database, Square, Settings, X, Copy } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

async function api(p, o = {}) {
  const r = await fetch(p, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...o.headers } })
  const j = await r.json()
  if (j.success !== undefined) { if (!j.success) throw new Error(j.error?.message || 'Failed'); return j.data || j }
  return j
}

// ═══ Node type definitions ═══
const NODE_DEFS = {
  trigger:           { label: 'Trigger',          icon: Zap,        color: '#f59e0b', bg: '#fffbeb', desc: 'Starts the flow' },
  condition:         { label: 'Condition',         icon: GitBranch,  color: '#8b5cf6', bg: '#f5f3ff', desc: 'If/else branch' },
  send_notification: { label: 'Notification',      icon: Bell,       color: '#3b82f6', bg: '#eff6ff', desc: 'Send in-app notification' },
  send_email:        { label: 'Send Email',        icon: Mail,       color: '#06b6d4', bg: '#ecfeff', desc: 'Send email via template' },
  update_field:      { label: 'Update Field',      icon: Database,   color: '#16a34a', bg: '#f0fdf4', desc: 'Update a record field' },
  create_record:     { label: 'Create Record',     icon: Plus,       color: '#16a34a', bg: '#f0fdf4', desc: 'Create a new record' },
  wait:              { label: 'Wait / Delay',      icon: Clock,      color: '#64748b', bg: '#f8fafc', desc: 'Pause for duration' },
  http_callout:      { label: 'HTTP Callout',      icon: Globe,      color: '#d946ef', bg: '#fdf4ff', desc: 'Call external API' },
  approval:          { label: 'Request Approval',  icon: CheckSquare,color: '#f97316', bg: '#fff7ed', desc: 'Submit for approval' },
  loop:              { label: 'Loop',              icon: Repeat,     color: '#64748b', bg: '#f8fafc', desc: 'Iterate over collection' },
  end:               { label: 'End',               icon: Square,     color: '#ef4444', bg: '#fef2f2', desc: 'End the flow' },
}

// ═══ Visual Node Component ═══
function FlowNode({ node, selected, onSelect, onDrag, onDelete, onConfig, position }) {
  const def = NODE_DEFS[node.type] || NODE_DEFS.end
  const Icon = def.icon
  const ref = useRef(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    if (e.target.closest('.node-btn')) return
    setDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    onSelect(node.id)
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e) => onDrag(node.id, { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
    const up = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging])

  return (
    <div ref={ref} onMouseDown={handleMouseDown}
      className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md'}`}
      style={{ left: position.x, top: position.y, zIndex: selected ? 20 : 10 }}>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ width: 200 }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: def.bg }}>
          <Icon size={14} style={{ color: def.color }} />
          <span className="text-xs font-bold flex-1" style={{ color: def.color }}>{def.label}</span>
          <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded font-mono text-gray-500">#{node.id}</span>
        </div>
        <div className="px-3 py-2">
          {node.type === 'trigger' && <p className="text-[10px] text-gray-500">On {node.config?.event || 'record change'}</p>}
          {node.type === 'condition' && <p className="text-[10px] text-gray-500">{node.config?.field || 'field'} {node.config?.operator || '=='} {node.config?.value || '?'}</p>}
          {node.type === 'send_notification' && <p className="text-[10px] text-gray-500">{node.config?.title || 'Notification'}</p>}
          {node.type === 'send_email' && <p className="text-[10px] text-gray-500">Template: {node.config?.templateId || '—'}</p>}
          {node.type === 'update_field' && <p className="text-[10px] text-gray-500">{node.config?.field || 'field'} = {node.config?.value || '?'}</p>}
          {node.type === 'wait' && <p className="text-[10px] text-gray-500">{node.config?.duration || '?'} {node.config?.unit || 'minutes'}</p>}
          {node.type === 'http_callout' && <p className="text-[10px] text-gray-500 truncate">{node.config?.url || 'URL'}</p>}
          {node.type === 'create_record' && <p className="text-[10px] text-gray-500">{node.config?.objectType || 'object'}</p>}
          {node.type === 'approval' && <p className="text-[10px] text-gray-500">{node.config?.approverRole || 'HEAD'}</p>}
          {node.type === 'loop' && <p className="text-[10px] text-gray-500">Collection: {node.config?.collection || '—'}</p>}
          {node.type === 'end' && <p className="text-[10px] text-gray-500">Flow ends here</p>}
        </div>
        <div className="flex border-t border-gray-100">
          <button className="node-btn flex-1 py-1.5 text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => onConfig(node)}>
            <Settings size={10} className="inline mr-1" />Config
          </button>
          {node.type !== 'trigger' && (
            <button className="node-btn flex-1 py-1.5 text-[10px] text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-gray-100" onClick={() => onDelete(node.id)}>
              <Trash2 size={10} className="inline mr-1" />Delete
            </button>
          )}
        </div>
      </div>
      {/* Connection dots */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full z-30" />
      {node.type !== 'trigger' && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full z-30" />}
    </div>
  )
}

// ═══ Edge drawing ═══
function FlowEdges({ edges, positions }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" style={{ zIndex: 5, overflow: 'visible' }}>
      {edges.map((edge, i) => {
        const from = positions[edge.source]
        const to = positions[edge.target]
        if (!from || !to) return null
        const x1 = from.x + 100, y1 = from.y + 80
        const x2 = to.x + 100, y2 = to.y
        const midY = (y1 + y2) / 2
        return (
          <g key={i}>
            <path d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray={edge.label === 'false' ? '6,4' : 'none'} />
            <polygon points={`${x2-4},${y2-6} ${x2+4},${y2-6} ${x2},${y2}`} fill="#94a3b8" />
            {edge.label && (
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" className="text-[9px] fill-gray-400 font-medium">{edge.label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ═══ Main Component ═══
export default function FlowBuilderPage() {
  const toast = useToast()
  const [flows, setFlows] = useState([])
  const [activeFlow, setActiveFlow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [executions, setExecutions] = useState([])
  const [showNewFlow, setShowNewFlow] = useState(false)
  const [newFlowName, setNewFlowName] = useState('')

  // Canvas state
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [positions, setPositions] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [configNode, setConfigNode] = useState(null)
  const [configForm, setConfigForm] = useState({})
  const [showAddNode, setShowAddNode] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [testData, setTestData] = useState('{}')
  const [testResult, setTestResult] = useState(null)

  // Load flows list
  const loadFlows = () => { setLoading(true); api('/api/v1/flows').then(r => setFlows(Array.isArray(r) ? r : r?.flows || [])).catch(console.error).finally(() => setLoading(false)) }
  useEffect(() => {
    loadFlows()
    api('/api/v1/flows/executions/recent').then(r => setExecutions(Array.isArray(r) ? r : r?.executions || [])).catch(() => {})
  }, [])

  // Open a flow for editing
  const openFlow = async (id) => {
    try {
      const data = await api(`/api/v1/flows/${id}`)
      // API returns { flow: {...}, executions: [...] } wrapped in ApiResponse.success
      const flow = data.flow || data
      setShowNewFlow(false); setNewFlowName('');
      setActiveFlow(flow)
      const n = Array.isArray(flow.nodes) ? flow.nodes : []
      const e = Array.isArray(flow.edges) ? flow.edges : []
      setNodes(n)
      setEdges(e)
      // Auto-layout positions
      const pos = {}
      n.forEach((node, i) => {
        pos[node.id] = node.position || { x: 300, y: 40 + i * 120 }
      })
      setPositions(pos)
    } catch (e) { toast.error(e.message) }
  }

  // Create new flow
  const createFlow = () => setShowNewFlow(true)
  const doCreateFlow = async () => {
    const name = newFlowName.trim()
    if (!name) return
    try {
      const flow = await api('/api/v1/flows', { method: 'POST', body: JSON.stringify({
        name, triggerType: 'record_update', triggerObject: 'students',
        nodes: [{ id: '1', type: 'trigger', config: { event: 'record_update' } }, { id: '2', type: 'end', config: {} }],
        edges: [{ source: '1', target: '2' }],
      })})
      setShowNewFlow(false); setNewFlowName('')
      loadFlows()
      if (flow.id) openFlow(flow.id)
    } catch (e) { toast.error(e.message) }
  }

  // Save current flow
  const saveFlow = async () => {
    if (!activeFlow) return
    try {
      const updatedNodes = nodes.map(n => ({ ...n, position: positions[n.id] }))
      await api(`/api/v1/flows/${activeFlow.id}`, { method: 'PUT', body: JSON.stringify({ name: activeFlow.name, nodes: updatedNodes, edges }) })
      toast.success('Flow saved!'); setTimeout(() => toast.success(''), 3000)
    } catch (e) { toast.error(e.message) }
  }

  // Toggle active
  const toggleFlow = async (id, isActive) => {
    await api(`/api/v1/flows/${id}/${isActive ? 'deactivate' : 'activate'}`, { method: 'PUT' })
    loadFlows()
  }

  // Delete flow
  const deleteFlow = async (id) => {
        await api(`/api/v1/flows/${id}`, { method: 'DELETE' })
    if (activeFlow?.id === id) setActiveFlow(null)
    loadFlows()
  }

  // Add node to canvas
  const addNode = (type) => {
    const id = String(Date.now())
    const newNode = { id, type, config: {} }
    setNodes(prev => [...prev, newNode])
    setPositions(prev => ({ ...prev, [id]: { x: 300, y: Object.keys(prev).length * 120 + 40 } }))
    // Auto-connect to last node before end
    const endNode = nodes.find(n => n.type === 'end')
    if (endNode) {
      const edgeToEnd = edges.find(e => e.target === endNode.id)
      if (edgeToEnd) {
        setEdges(prev => [
          ...prev.filter(e => e !== edgeToEnd),
          { source: edgeToEnd.source, target: id },
          { source: id, target: endNode.id },
        ])
      }
    }
    setShowAddNode(false)
  }

  // Delete node
  const deleteNode = (id) => {
    // Reconnect edges around deleted node
    const incoming = edges.filter(e => e.target === id)
    const outgoing = edges.filter(e => e.source === id)
    const newEdges = edges.filter(e => e.source !== id && e.target !== id)
    if (incoming.length && outgoing.length) {
      newEdges.push({ source: incoming[0].source, target: outgoing[0].target })
    }
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(newEdges)
    setPositions(prev => { const p = { ...prev }; delete p[id]; return p })
  }

  // Update node config
  const saveNodeConfig = () => {
    setNodes(prev => prev.map(n => n.id === configNode.id ? { ...n, config: { ...n.config, ...configForm } } : n))
    setConfigNode(null)
  }

  // Drag node
  const onDrag = useCallback((id, pos) => {
    setPositions(prev => ({ ...prev, [id]: pos }))
  }, [])

  // Test flow
  const testFlow = async () => {
    try {
      const r = await api(`/api/v1/flows/${activeFlow.id}/test`, { method: 'POST', body: JSON.stringify({ data: JSON.parse(testData) }) })
      setTestResult(r)
    } catch (e) { setTestResult({ error: e.message }) }
  }

  // ═══ LIST VIEW ═══
  if (!activeFlow) {
    // Name input modal
    const NewFlowModal = () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowNewFlow(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-modal p-6 w-80 anim-scale" onClick={e => e.stopPropagation()}>
          <h3 className="text-[15px] font-bold mb-4">New Flow</h3>
          <input autoFocus value={newFlowName} onChange={e => setNewFlowName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doCreateFlow()}
            placeholder="Flow name..." className="field-input mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewFlow(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={doCreateFlow} disabled={!newFlowName.trim()} className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    )
    return (
      <Page title="Flow Builder" subtitle={`${flows.length} flows`}
        actions={<Button onClick={createFlow}><Plus size={14} /> New Flow</Button>}>
      {showNewFlow && <NewFlowModal />}
      {loading ? <Loading /> : (
          <DataTable columns={[
            { key: 'name', label: 'Flow', render: (v, r) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><GitBranch size={14} /></div>
                <div><p className="font-medium text-gray-900">{v}</p><p className="text-[11px] text-gray-400">{r.trigger_type} on {r.trigger_object}</p></div>
              </div>
            )},
            { key: 'is_active', label: 'Status', render: (v, r) => (
              <button onClick={(e) => { e.stopPropagation(); toggleFlow(r.id, v) }}>
                <Badge color={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge>
              </button>
            )},
            { key: 'node_count', label: 'Nodes', render: (_, r) => r.nodes?.length || r.node_count || 0 },
            { key: 'execution_count', label: 'Runs' },
            { key: 'actions', label: '', render: (_, r) => (
              <button onClick={(e) => { e.stopPropagation(); deleteFlow(r.id) }} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
            )},
          ]} rows={flows} onRowClick={(r) => openFlow(r.id)} />
        )}

        {executions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Executions</h3>
            <DataTable searchable={false} pageSize={5} columns={[
              { key: 'flow_name', label: 'Flow' },
              { key: 'status', label: 'Status', render: v => <Badge color={v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'amber'}>{v}</Badge> },
              { key: 'started_at', label: 'Started', render: v => v ? new Date(v).toLocaleString() : '—' },
              { key: 'duration_ms', label: 'Duration', render: v => v ? `${v}ms` : '—' },
            ]} rows={executions} />
          </div>
        )}
      </Page>
    )
  }

  // ═══ CANVAS VIEW ═══
  return (
    <Page title={activeFlow.name || 'Flow Editor'}
      subtitle={`${nodes.length} nodes · ${edges.length} connections`}
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setActiveFlow(null)}><ArrowLeft size={14} /> Back</Button>
          <Button variant="secondary" onClick={() => setShowTest(true)}><Play size={14} /> Test</Button>
          <Button variant="secondary" onClick={() => setShowAddNode(true)}><Plus size={14} /> Add Node</Button>
          <Button onClick={saveFlow}><Save size={14} /> Save</Button>
        </div>
      }>
      {/* Canvas */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        <div className="relative w-full h-full overflow-auto" style={{ background: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <FlowEdges edges={edges} positions={positions} />
          {nodes.map(node => (
            <FlowNode key={node.id} node={node} selected={selectedNode === node.id}
              position={positions[node.id] || { x: 100, y: 100 }}
              onSelect={setSelectedNode} onDrag={onDrag} onDelete={deleteNode}
              onConfig={(n) => { setConfigNode(n); setConfigForm(n.config || {}) }} />
          ))}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <div className="text-center"><GitBranch size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Empty flow. Add nodes to start.</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Add Node Modal */}
      <Modal open={showAddNode} onClose={() => setShowAddNode(false)} title="Add Node" width="max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(NODE_DEFS).filter(([k]) => k !== 'trigger').map(([type, def]) => {
            const Icon = def.icon
            return (
              <button key={type} onClick={() => addNode(type)}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: def.bg }}>
                  <Icon size={16} style={{ color: def.color }} />
                </div>
                <div><p className="text-sm font-medium text-gray-900">{def.label}</p><p className="text-[10px] text-gray-400">{def.desc}</p></div>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Config Node Modal */}
      <Modal open={!!configNode} onClose={() => setConfigNode(null)} title={`Configure: ${configNode ? NODE_DEFS[configNode.type]?.label : ''}`}>
        {configNode && (
          <div className="space-y-4 mb-6">
            {configNode.type === 'trigger' && (<>
              <Select label="Event" value={configForm.event || 'record_update'} onChange={e => setConfigForm({ ...configForm, event: e.target.value })}>
                <option value="record_update">Record Update</option><option value="record_create">Record Create</option><option value="scheduled">Scheduled</option>
              </Select>
              <Select label="Object" value={configForm.objectType || 'students'} onChange={e => setConfigForm({ ...configForm, objectType: e.target.value })}>
                <option value="students">Students</option><option value="submissions">Submissions</option><option value="interviews">Interviews</option>
              </Select>
              <Input label="Field (optional)" value={configForm.field || ''} onChange={e => setConfigForm({ ...configForm, field: e.target.value })} placeholder="e.g., marketingStatus" />
            </>)}
            {configNode.type === 'condition' && (<>
              <Input label="Field" value={configForm.field || ''} onChange={e => setConfigForm({ ...configForm, field: e.target.value })} placeholder="marketingStatus" />
              <Select label="Operator" value={configForm.operator || 'equals'} onChange={e => setConfigForm({ ...configForm, operator: e.target.value })}>
                <option value="equals">Equals</option><option value="not_equals">Not Equals</option><option value="contains">Contains</option><option value="greater_than">Greater Than</option><option value="is_empty">Is Empty</option>
              </Select>
              <Input label="Value" value={configForm.value || ''} onChange={e => setConfigForm({ ...configForm, value: e.target.value })} />
            </>)}
            {configNode.type === 'send_notification' && (<>
              <Input label="Title" value={configForm.title || ''} onChange={e => setConfigForm({ ...configForm, title: e.target.value })} placeholder="Status Changed" />
              <Input label="Message" value={configForm.message || ''} onChange={e => setConfigForm({ ...configForm, message: e.target.value })} placeholder="{{firstName}} is now {{marketingStatus}}" />
              <Input label="User ID Field" value={configForm.userIdField || ''} onChange={e => setConfigForm({ ...configForm, userIdField: e.target.value })} placeholder="recruiterId" />
            </>)}
            {configNode.type === 'send_email' && (<>
              <Input label="To (field)" value={configForm.toField || ''} onChange={e => setConfigForm({ ...configForm, toField: e.target.value })} placeholder="personalEmail" />
              <Input label="Template ID" type="number" value={configForm.templateId || ''} onChange={e => setConfigForm({ ...configForm, templateId: e.target.value })} />
              <Input label="Subject (or use template)" value={configForm.subject || ''} onChange={e => setConfigForm({ ...configForm, subject: e.target.value })} />
            </>)}
            {configNode.type === 'update_field' && (<>
              <Input label="Field" value={configForm.field || ''} onChange={e => setConfigForm({ ...configForm, field: e.target.value })} placeholder="marketingStatus" />
              <Input label="Value" value={configForm.value || ''} onChange={e => setConfigForm({ ...configForm, value: e.target.value })} placeholder="Exit" />
            </>)}
            {configNode.type === 'create_record' && (<>
              <Select label="Object" value={configForm.objectType || 'activities'} onChange={e => setConfigForm({ ...configForm, objectType: e.target.value })}>
                <option value="activities">Activities</option><option value="notes">Notes</option><option value="notifications">Notifications</option>
              </Select>
              <Input label="Data (JSON)" value={configForm.data || ''} onChange={e => setConfigForm({ ...configForm, data: e.target.value })} placeholder='{"subject":"Auto-created"}' />
            </>)}
            {configNode.type === 'wait' && (<>
              <Input label="Duration" type="number" value={configForm.duration || ''} onChange={e => setConfigForm({ ...configForm, duration: parseInt(e.target.value) })} />
              <Select label="Unit" value={configForm.unit || 'minutes'} onChange={e => setConfigForm({ ...configForm, unit: e.target.value })}>
                <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option>
              </Select>
            </>)}
            {configNode.type === 'http_callout' && (<>
              <Input label="URL" value={configForm.url || ''} onChange={e => setConfigForm({ ...configForm, url: e.target.value })} placeholder="https://api.example.com/webhook" />
              <Select label="Method" value={configForm.method || 'POST'} onChange={e => setConfigForm({ ...configForm, method: e.target.value })}>
                <option value="POST">POST</option><option value="GET">GET</option><option value="PUT">PUT</option>
              </Select>
            </>)}
            {configNode.type === 'approval' && (<>
              <Select label="Approver Role" value={configForm.approverRole || 'HEAD'} onChange={e => setConfigForm({ ...configForm, approverRole: e.target.value })}>
                <option value="HEAD">HEAD</option><option value="BU_ADMIN">BU_ADMIN</option>
              </Select>
              <Input label="Comments" value={configForm.comments || ''} onChange={e => setConfigForm({ ...configForm, comments: e.target.value })} />
            </>)}
            {configNode.type === 'loop' && (
              <Input label="Collection Field" value={configForm.collection || ''} onChange={e => setConfigForm({ ...configForm, collection: e.target.value })} placeholder="items" />
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfigNode(null)}>Cancel</Button>
              <Button onClick={saveNodeConfig}>Apply</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Test Modal */}
      <Modal open={showTest} onClose={() => { setShowTest(false); setTestResult(null) }} title="Test Flow" width="max-w-xl">
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Test Data (JSON)</label>
            <textarea value={testData} onChange={e => setTestData(e.target.value)} rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-blue-400"
              placeholder='{"firstName":"John","marketingStatus":"Exit","recruiterId":1}' />
          </div>
          <Button onClick={testFlow}><Play size={14} /> Run Test</Button>
          {testResult && (
            <div className={`p-4 rounded-xl border ${testResult.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="text-[12px] space-y-1.5 max-h-48 overflow-y-auto">
                {Object.entries(testResult).map(([k, v]) => (
                  <div key={k} className="flex gap-3 py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 w-28 shrink-0 font-medium">{k}</span>
                    <span className="font-mono text-gray-700 text-[11px]">{typeof v === 'object' ? JSON.stringify(v).slice(0,100) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Page>
  )
}