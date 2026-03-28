import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, Badge, Button, Loading, Modal, Input, Select, statusBadgeColor, ConfirmDialog } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getLead, updateLead, convertLead } from '../../utils/api'
import { ArrowLeft, Edit2, ArrowRightCircle, Phone, Mail, Building2, Globe } from 'lucide-react'

export default function LeadDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)

  const load = async () => {
    try {
      const data = await getLead(id)
      setLead(data?.lead || data)
    } catch (e) { toast.error('Failed to load lead') }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateLead(id, editForm)
      toast.success('Lead updated')
      setEditModal(false)
      load()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const handleConvert = async () => {
        setConverting(true)
    try {
      await convertLead(id, {})
      toast.success('Lead converted to student')
      nav('/head/leads')
    } catch (e) { toast.error(e.message) }
    setConverting(false)
  }

  if (loading) return <Page title="Loading..."><Loading /></Page>
  if (!lead) return <Page title="Lead Not Found"><p className="text-gray-400">Lead #{id} not found.</p></Page>

  const l = lead
  const name = [l.first_name || l.firstName, l.last_name || l.lastName].filter(Boolean).join(' ') || `Lead #${id}`

  return (
    <Page
      title={name}
      subtitle={l.title ? `${l.title}${l.company ? ' · ' + l.company : ''}` : l.company || ''}
      actions={
        <div className="flex items-center gap-2">
          {l.status !== 'converted' && (
            <Button size="sm" variant="success" onClick={handleConvert} loading={converting}>
              <ArrowRightCircle size={13} /> Convert Lead
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => { setEditForm({ ...l }); setEditModal(true) }}>
            <Edit2 size={13} /> Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => nav(-1)}><ArrowLeft size={13} /> Back</Button>
        </div>
      }
    >
      {/* Status badges */}
      <div className="flex items-center gap-3 mb-6">
        <Badge color={l.status === 'converted' ? 'green' : l.status === 'qualified' ? 'blue' : 'amber'} dot>{l.status || 'new'}</Badge>
        {l.rating && <Badge color={l.rating === 'hot' ? 'red' : l.rating === 'warm' ? 'amber' : 'blue'}>{l.rating}</Badge>}
        {l.lead_source && <span className="text-[12px] text-gray-400">via {l.lead_source}</span>}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Contact info */}
        <div className="col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Mail,     label: 'Email',   value: l.email,   href: l.email ? `mailto:${l.email}` : null },
                { icon: Phone,    label: 'Phone',   value: l.phone,   href: l.phone ? `tel:${l.phone}` : null },
                { icon: Building2,label: 'Company', value: l.company },
                { icon: Globe,    label: 'Website', value: l.website, href: l.website },
              ].map(({ icon: Icon, label, value, href }) => value ? (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={13} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                    {href
                      ? <a href={href} target="_blank" rel="noreferrer" className="text-[13px] text-brand-600 hover:underline">{value}</a>
                      : <p className="text-[13px] text-gray-800">{value}</p>
                    }
                  </div>
                </div>
              ) : null)}
            </div>
          </div>

          {l.description && (
            <div className="card p-5">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Description</h3>
              <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{l.description}</p>
            </div>
          )}
        </div>

        {/* Side details */}
        <div className="card p-5 space-y-3 h-fit">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lead Details</h3>
          {[
            { label: 'Owner',        value: l.owner?.name || l.assigned_to || 'Unassigned' },
            { label: 'Annual Revenue',value: l.annual_revenue ? `$${Number(l.annual_revenue).toLocaleString()}` : '—' },
            { label: 'Employees',    value: l.num_employees || '—' },
            { label: 'Industry',     value: l.industry || '—' },
            { label: 'Created',      value: l.created_at ? new Date(l.created_at).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-[12px]">
              <span className="text-gray-400">{label}</span>
              <span className="text-gray-700 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Lead" width="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={editForm.first_name || editForm.firstName || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
          <Input label="Last Name"  value={editForm.last_name  || editForm.lastName  || ''} onChange={e => setEditForm(f => ({ ...f, last_name:  e.target.value }))} />
          <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone"  value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Company" value={editForm.company || ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} />
          <Input label="Title"   value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          <Select label="Status" value={editForm.status || ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
            {['new', 'contacted', 'qualified', 'unqualified', 'lost'].map(s => <option key={s}>{s}</option>)}
          </Select>
          <Select label="Rating" value={editForm.rating || ''} onChange={e => setEditForm(f => ({ ...f, rating: e.target.value }))}>
            {['cold', 'warm', 'hot'].map(r => <option key={r}>{r}</option>)}
          </Select>
        </div>
      </Modal>
    </Page>
  )
}
