import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Textarea, ConfirmDialog } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getEmailTemplates, createEmailTemplate, deleteEmailTemplate } from '../../utils/api'
import { Plus, RefreshCw, Trash2, Mail } from 'lucide-react'

const CATEGORIES = ['Placement', 'Interview', 'Follow-up', 'Onboarding', 'Notification', 'Marketing', 'Other']

export default function EmailTemplatesPage() {
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [preview, setPreview] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await getEmailTemplates()
      setTemplates(Array.isArray(data) ? data : data?.templates || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.subject) return toast.error('Name and subject are required')
    setCreating(true)
    try {
      await createEmailTemplate(form)
      toast.success('Template created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleDelete = async (tpl) => {
    setDeleting(true)
    try {
      await deleteEmailTemplate(tpl.id)
      toast.success('Template deleted')
      setConfirmDelete(null); load()
    } catch (e) { toast.error(e.message) }
    setDeleting(false)
  }

  return (
    <Page title="Email Templates" subtitle="Reusable email templates for communications"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Template</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'name', label: 'Template', render: v => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><Mail size={13} className="text-blue-600" /></div>
              <span className="font-medium">{v}</span>
            </div>
          )},
          { key: 'subject', label: 'Subject', render: v => <span className="text-gray-600 text-[12px]">{v}</span> },
          { key: 'category', label: 'Category', render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
          { key: 'created_at', label: 'Created', render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'actions', label: '', sortable: false, render: (_, r) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <Button size="xs" variant="secondary" onClick={() => setPreview(r)}>Preview</Button>
              <button onClick={() => setConfirmDelete(r)} className="p-1.5 text-gray-300 hover:text-danger-500 transition-colors"><Trash2 size={12} /></button>
            </div>
          )},
        ]}
        rows={templates}
        loading={loading}
        emptyText="No email templates yet"
      />

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Email Template" width="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Template</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Template Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Category" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Subject Line" required value={form.subject || ''} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="col-span-2"
            hint="Use {{variable}} for dynamic content" />
          <Textarea label="Body (HTML)" value={form.bodyHtml || ''} onChange={e => setForm(f => ({ ...f, bodyHtml: e.target.value }))} className="col-span-2" rows={8}
            placeholder="<p>Dear {{firstName}},</p><p>...</p>" />
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Preview'} width="max-w-2xl">
        <div className="mb-3 pb-3 border-b border-gray-100">
          <p className="text-[11px] text-gray-400 mb-1">Subject</p>
          <p className="text-[13px] font-medium text-gray-900">{preview?.subject}</p>
        </div>
        {preview?.bodyHtml ? (
          <div className="prose prose-sm max-w-none text-[13px]" dangerouslySetInnerHTML={{ __html: preview.bodyHtml }} />
        ) : (
          <p className="text-gray-400 text-[13px] italic">No body content</p>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Template" description={`Delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger loading={deleting} />
    </Page>
  )
}
