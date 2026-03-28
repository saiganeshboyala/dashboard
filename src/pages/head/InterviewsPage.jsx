import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getInterviews, createInterview, updateResult, getStudents } from '../../utils/api'
import { Plus, RefreshCw, Download, CheckCircle } from 'lucide-react'
import { downloadCSV } from '../../utils/export'
import { useDynamicSchema } from '../../hooks/useDynamicSchema'

export default function InterviewsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { renderPicklist, getPicklist } = useDynamicSchema('interviews')
  const interviewTypes = getPicklist('interview_type')?.map(p => p.value) || ['Phone Screen', 'Technical', 'Panel', 'Final', 'Client']
  const resultOptions = getPicklist('final_status')?.map(p => p.value) || ['Passed', 'Failed', 'No Show', 'Verbal', 'Client Hold', 'Cancelled']
  const [interviews, setInterviews] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [resultModal, setResultModal] = useState(null)
  const [resultForm, setResultForm] = useState({})
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [iData, stData] = await Promise.all([getInterviews(), getStudents('limit=200')])
      setInterviews(iData.interviews || [])
      setStudents(stData.students || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.studentId || !form.clientName) return toast.error('Student and client are required')
    setCreating(true)
    try {
      await createInterview({ ...form, studentId: parseInt(form.studentId) })
      toast.success('Interview scheduled')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleUpdateResult = async () => {
    if (!resultModal) return
    try {
      await updateResult(resultModal.id, resultForm)
      toast.success('Result updated')
      setResultModal(null); setResultForm({}); load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Page title="Interviews" subtitle={`${interviews.length} total interviews`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => downloadCSV(interviews, 'interviews')}><Download size={13} /> Export</Button>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Schedule Interview</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'student', label: 'Student', render: (v, r) => {
            const s = v || r.studentData
            return s ? `${s.firstName} ${s.lastName || ''}` : <span className="text-gray-300">—</span>
          }},
          { key: 'clientName', label: 'Client', render: v => <span className="font-medium">{v || '—'}</span> },
          { key: 'interviewType', label: 'Type', render: v => {
            if (!v) return '—'
            const pv = renderPicklist('interview_type', v)
            return <Badge color={pv?.color || 'blue'}>{pv?.label || v}</Badge>
          }},
          { key: 'scheduledAt', label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
          { key: 'finalStatus', label: 'Result', render: v => {
            if (!v) return <Badge color="gray" dot>Pending</Badge>
            const pv = renderPicklist('final_status', v)
            return <Badge color={pv?.color || statusBadgeColor(v)} dot>{pv?.label || v}</Badge>
          }},
          { key: 'billRate', label: 'Rate', render: v => v ? <span className="font-mono tabular-nums">${v}/hr</span> : '—' },
          { key: 'actions', label: '', sortable: false, render: (_, r) => !r.finalStatus ? (
            <Button size="xs" variant="secondary" onClick={e => { e.stopPropagation(); setResultModal(r); setResultForm({}) }}>
              <CheckCircle size={11} /> Update Result
            </Button>
          ) : null },
        ]}
        rows={interviews}
        loading={loading}
        onRowClick={r => nav(`/head/records/interviews/${r.id}`)}
        emptyText="No interviews scheduled"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="Schedule Interview"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Schedule</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Student" required value={form.studentId || ''} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} className="col-span-2">
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ''}</option>)}
          </Select>
          <Input label="Client Name" required value={form.clientName || ''} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
          <Input label="Date & Time" required type="datetime-local" value={form.scheduledAt || ''} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          <Select label="Interview Type" value={form.interviewType || ''} onChange={e => setForm(f => ({ ...f, interviewType: e.target.value }))}>
            <option value="">Select type</option>
            {interviewTypes.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Bill Rate ($/hr)" type="number" value={form.billRate || ''} onChange={e => setForm(f => ({ ...f, billRate: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={!!resultModal} onClose={() => { setResultModal(null); setResultForm({}) }} title="Update Interview Result"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setResultModal(null); setResultForm({}) }}>Cancel</Button>
            <Button onClick={handleUpdateResult}>Save Result</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Final Status" required value={resultForm.finalStatus || ''} onChange={e => setResultForm(f => ({ ...f, finalStatus: e.target.value }))} className="col-span-2">
            <option value="">Select result</option>
            {resultOptions.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Input label="Bill Rate ($/hr)" type="number" value={resultForm.billRate || ''} onChange={e => setResultForm(f => ({ ...f, billRate: e.target.value }))} />
          <Input label="Start Date" type="date" value={resultForm.startDate || ''} onChange={e => setResultForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
      </Modal>
    </Page>
  )
}
