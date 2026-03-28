import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getSubmissions, createSubmission, getStudents } from '../../utils/api'
import { Plus, RefreshCw, Download } from 'lucide-react'
import { downloadCSV } from '../../utils/export'
import { useDynamicSchema } from '../../hooks/useDynamicSchema'

export default function SubmissionsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { renderPicklist } = useDynamicSchema('submissions')
  const [submissions, setSubmissions] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [sData, stData] = await Promise.all([getSubmissions(), getStudents('limit=200')])
      setSubmissions(sData.submissions || [])
      setStudents(stData.students || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.studentId || !form.clientName) return toast.error('Student and client name are required')
    setCreating(true)
    try {
      await createSubmission({ ...form, studentId: parseInt(form.studentId), rate: form.rate ? parseFloat(form.rate) : undefined })
      toast.success('Submission created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  return (
    <Page title="Submissions" subtitle={`${submissions.length} total submissions`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => downloadCSV(submissions, 'submissions')}><Download size={13} /> Export</Button>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Submission</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'student', label: 'Student', render: (v, r) => {
            const s = v || r.studentData
            return s ? `${s.firstName} ${s.lastName || ''}` : <span className="text-gray-300">—</span>
          }},
          { key: 'clientName', label: 'Client', render: v => <span className="font-medium">{v || '—'}</span> },
          { key: 'vendorCompany', label: 'Vendor', render: v => v || <span className="text-gray-300">—</span> },
          { key: 'rate', label: 'Rate', render: v => v ? <span className="font-mono tabular-nums">${v}/hr</span> : <span className="text-gray-300">—</span> },
          { key: 'status', label: 'Status', render: v => {
            const pv = renderPicklist('status', v)
            return <Badge color={pv?.color || statusBadgeColor(v)}>{pv?.label || v || 'Submitted'}</Badge>
          }},
          { key: 'submittedAt', label: 'Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'recruiter', label: 'Recruiter', render: (v, r) => r.recruiter?.user?.name || r.recruiterName || '—' },
        ]}
        rows={submissions}
        loading={loading}
        onRowClick={r => nav(`/head/records/submissions/${r.id}`)}
        emptyText="No submissions found"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Submission"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Student" required value={form.studentId || ''} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} className="col-span-2">
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ''}</option>)}
          </Select>
          <Input label="Client Name" required value={form.clientName || ''} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
          <Input label="Vendor Company" value={form.vendorCompany || ''} onChange={e => setForm(f => ({ ...f, vendorCompany: e.target.value }))} />
          <Input label="Rate ($/hr)" type="number" value={form.rate || ''} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
          <Input label="Vendor Contact Email" type="email" value={form.vendorEmail || ''} onChange={e => setForm(f => ({ ...f, vendorEmail: e.target.value }))} />
          <Input label="Job Description URL" value={form.jobDescriptionUrl || ''} onChange={e => setForm(f => ({ ...f, jobDescriptionUrl: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>
    </Page>
  )
}
