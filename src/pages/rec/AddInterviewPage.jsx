import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Input, Select, Button, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getStudents, getSubmissions, createInterview } from '../../utils/api'
import { Calendar } from 'lucide-react'

const INTERVIEW_TYPES = [
  'Vendor', 'Client', 'Implementation', 'HR',
  'First Round', 'Second Round', 'Third Round', 'Fourth Round', 'Final Round', 'Assessment',
]

const FINAL_STATUSES = [
  'Very Bad', 'Average', 'Good', 'Very Good',
  'Expecting Confirmation', 'Re-Scheduled', 'Confirmation', 'Cancelled',
]

export default function AddInterviewPage() {
  const nav = useNavigate(); const toast = useToast()
  const [students, setStudents] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [form, setForm] = useState({})
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStudents().then(d => setStudents(d.students || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleStudentChange = async (studentId) => {
    set('studentId', studentId)
    set('submissionId', '')
    setSubmissions([])
    if (!studentId) return
    const d = await getSubmissions(`studentId=${studentId}`).catch(() => ({ submissions: [] }))
    setSubmissions(d.submissions || [])
  }

  const handleCreate = async () => {
    setError(null)
    if (!form.studentId)    { setError('Student is required'); return }
    if (!form.scheduledAt)  { setError('Interview date & time is required'); return }
    if (!form.interviewType){ setError('Interview type is required'); return }

    setCreating(true)
    try {
      const payload = {
        studentId:         parseInt(form.studentId),
        submissionId:      form.submissionId ? parseInt(form.submissionId) : null,
        scheduledAt:       new Date(form.scheduledAt).toISOString(),
        interviewType:     form.interviewType || null,
        clientName:        form.clientName || null,
        vendorCompany:     form.vendorCompany || null,
        vendorPerson:      form.vendorPerson || null,
        billRate:          form.billRate ? parseFloat(form.billRate) : null,
        finalStatus:       form.finalStatus || null,
        durationInMinutes: form.durationInMinutes ? parseInt(form.durationInMinutes) : null,
        finalFeedback:     form.finalFeedback || null,
      }
      await createInterview(payload)
      toast.success('Interview created')
      nav('/rec/interviews')
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  return (
    <Page title="Add Interview">
      <div className="max-w-2xl card p-6 space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Student & Submission */}
        <div className="grid grid-cols-2 gap-4">
          <Select label="Student" required value={form.studentId || ''} onChange={e => handleStudentChange(e.target.value)}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ''} — {s.technology || ''}</option>)}
          </Select>
          <Select label="Submission (Linked)" value={form.submissionId || ''} onChange={e => set('submissionId', e.target.value)} disabled={!form.studentId}>
            <option value="">Select submission (optional)</option>
            {submissions.map(s => <option key={s.id} value={s.id}>{s.clientName || s.vendorCompany || `#${s.id}`} — {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : ''}</option>)}
          </Select>
        </div>

        {/* Date & Type */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Interview Date & Time" required type="datetime-local" value={form.scheduledAt || ''} onChange={e => set('scheduledAt', e.target.value)} />
          <Select label="Interview Type" required value={form.interviewType || ''} onChange={e => set('interviewType', e.target.value)}>
            <option value="">Select type</option>
            {INTERVIEW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>

        {/* Client & Vendor */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Client Name" value={form.clientName || ''} onChange={e => set('clientName', e.target.value)} />
          <Input label="Vendor Company" value={form.vendorCompany || ''} onChange={e => set('vendorCompany', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Vendor Person" value={form.vendorPerson || ''} onChange={e => set('vendorPerson', e.target.value)} />
          <Input label="Bill Rate ($/hr)" type="number" value={form.billRate || ''} onChange={e => set('billRate', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Final Status" value={form.finalStatus || ''} onChange={e => set('finalStatus', e.target.value)}>
            <option value="">Select status</option>
            {FINAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Duration (minutes)" type="number" value={form.durationInMinutes || ''} onChange={e => set('durationInMinutes', e.target.value)} />
        </div>

        {/* Final Feedback */}
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Final Feedback</label>
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            value={form.finalFeedback || ''}
            onChange={e => set('finalFeedback', e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleCreate} loading={creating}><Calendar size={13} /> Schedule Interview</Button>
          <Button variant="secondary" onClick={() => nav('/rec/interviews')}>Cancel</Button>
        </div>
      </div>
    </Page>
  )
}
