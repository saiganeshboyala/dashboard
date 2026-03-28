import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Input, Select, Button, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getStudents, createSubmission } from '../../utils/api'
import { Send } from 'lucide-react'

const SUBMISSION_STATUSES = ['Submitted', 'Interview Scheduled']

export default function AddSubmissionPage() {
  const nav = useNavigate(); const toast = useToast()
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({ submittedAt: new Date().toISOString().slice(0, 10) })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => { getStudents('marketingStatus=In Market').then(d => setStudents(d.students || [])) }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    setError(null)
    if (!form.studentId)   { setError('Student is required'); return }
    if (!form.vendorCompany) { setError('Vendor Company Name is required'); return }
    if (!form.vendorPerson)  { setError('Vendor Person Name is required'); return }
    if (!form.vendorEmail)   { setError('Vendor Person Email is required'); return }
    setCreating(true)
    try {
      await createSubmission({ ...form, studentId: parseInt(form.studentId) })
      toast.success('Submission created')
      nav('/rec/submissions')
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  return (
    <Page title="Add Submission">
      <div className="max-w-2xl card p-6 space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Student & Date */}
        <div className="grid grid-cols-2 gap-4">
          <Select label="Student" required value={form.studentId || ''} onChange={e => set('studentId', e.target.value)}>
            <option value="">Select student (in market)</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ''} — {s.technology || s.visaStatus || ''}</option>)}
          </Select>
          <Input label="Submission Date" required type="date" value={form.submittedAt || ''} onChange={e => set('submittedAt', e.target.value)} />
        </div>

        {/* Client & Vendor */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Client Name" value={form.clientName || ''} onChange={e => set('clientName', e.target.value)} />
          <Input label="Vendor Company Name" required value={form.vendorCompany || ''} onChange={e => set('vendorCompany', e.target.value)} />
        </div>

        {/* Vendor Contact */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Vendor Person Name" required value={form.vendorPerson || ''} onChange={e => set('vendorPerson', e.target.value)} />
          <Input label="Vendor Person Email" required type="email" value={form.vendorEmail || ''} onChange={e => set('vendorEmail', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Vendor Person Phone" value={form.vendorPhone || ''} onChange={e => set('vendorPhone', e.target.value)} />
          <Input label="Rate ($/hr)" type="number" value={form.rate || ''} onChange={e => set('rate', e.target.value)} />
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Implementation Partner" value={form.implementPartner || ''} onChange={e => set('implementPartner', e.target.value)} />
          <Input label="Prime Vendor Name" value={form.primeVendorName || ''} onChange={e => set('primeVendorName', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Domain" value={form.domain || ''} onChange={e => set('domain', e.target.value)} />
          <Select label="Submission Status" value={form.submissionStatus || ''} onChange={e => set('submissionStatus', e.target.value)}>
            <option value="">Select status</option>
            {SUBMISSION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Job Description</label>
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            value={form.jdText || ''}
            onChange={e => set('jdText', e.target.value)}
          />
        </div>

        {/* Comments */}
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Comments</label>
          <textarea
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            value={form.comments || ''}
            onChange={e => set('comments', e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleCreate} loading={creating}><Send size={13} /> Submit</Button>
          <Button variant="secondary" onClick={() => nav('/rec/submissions')}>Cancel</Button>
        </div>
      </div>
    </Page>
  )
}
