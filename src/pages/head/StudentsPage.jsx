import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select, statusBadgeColor, ConfirmDialog } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getStudents, createStudent, deleteStudent, bulkDeleteStudents, bulkAssignStudents, getBUs } from '../../utils/api'
import { Plus, Download, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { downloadCSV } from '../../utils/export'
import { useDynamicSchema } from '../../hooks/useDynamicSchema'

const FALLBACK_TECH = ['Java', 'Python', 'React', 'Angular', 'Node.js', '.NET', 'DevOps', 'QA', 'Data Science', 'iOS', 'Android']
const FALLBACK_STATUS = ['Bench', 'Pre-Marketing', 'In Market', 'On Project', 'Placed', 'On Hold', 'Exit']

export default function StudentsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { getPicklist, renderPicklist } = useDynamicSchema('students')

  // Use DB picklist values if available, else fall back to hardcoded
  const techOptions = getPicklist('technology')?.map(p => p.value) || FALLBACK_TECH
  const statusOptions = getPicklist('marketing_status')?.map(p => p.value) || FALLBACK_STATUS

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selected, setSelected] = useState([])
  const [bus, setBus] = useState([])
  const [assignModal, setAssignModal] = useState(false)
  const [assignBuId, setAssignBuId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [form, setForm] = useState({})
  const [filters, setFilters] = useState({ tech: '', status: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      getBUs().then(d => setBus(Array.isArray(d) ? d : d?.data || []))
      const q = new URLSearchParams()
      if (filters.tech)   q.set('technology', filters.tech)
      if (filters.status) q.set('marketingStatus', filters.status)
      const { students: data } = await getStudents(q.toString())
      setStudents(data)
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.firstName || !form.email || !form.password) return toast.error('First name, email and password are required')
    setCreating(true)
    try {
      await createStudent(form)
      toast.success('Student created successfully')
      setShowCreate(false)
      setForm({})
      load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleDelete = async (student) => {
    setDeleting(true)
    try {
      await deleteStudent(student.id)
      toast.success(`${student.firstName} removed`)
      setConfirmDelete(null)
      load()
    } catch (e) { toast.error(e.message) }
    setDeleting(false)
  }

  const handleBulkAssign = async () => {
    if (!assignBuId) return toast.error('Select a business unit')
    setAssigning(true)
    try {
      await bulkAssignStudents({ studentIds: selected.map(s => s.id), buId: parseInt(assignBuId) })
      toast.success(`${selected.length} students assigned`)
      setAssignModal(false); setAssignBuId(''); setSelected([]); load()
    } catch (e) { toast.error(e.message) }
    setAssigning(false)
  }

  const handleBulkDelete = async () => {
    if (!selected.length) return
    setDeleting(true)
    try {
      await bulkDeleteStudents({ ids: selected.map(s => s.id) })
      toast.success(`${selected.length} students removed`)
      setSelected([])
      load()
    } catch (e) { toast.error(e.message) }
    setDeleting(false)
  }

  const columns = [
    {
      key: 'firstName', label: 'Name', sortable: true,
      render: (v, r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-bold shrink-0">
            {v?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-[13px]">{v} {r.lastName || ''}</p>
            <p className="text-[11px] text-gray-400">{r.email || ''}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'technology', label: 'Technology', sortable: true,
      render: v => {
        if (!v) return <span className="text-gray-300">—</span>
        const pv = renderPicklist('technology', v)
        return <Badge color={pv?.color || 'blue'}>{pv?.label || v}</Badge>
      },
    },
    {
      key: 'marketingStatus', label: 'Status', sortable: true,
      render: v => {
        if (!v) return <span className="text-gray-300">—</span>
        const pv = renderPicklist('marketing_status', v)
        return <Badge color={pv?.color || statusBadgeColor(v)} dot>{pv?.label || v}</Badge>
      },
    },
    {
      key: 'daysInMarket', label: 'Days in Market', sortable: true,
      render: v => v != null ? (
        <span className={`tabular-nums font-medium ${v > 90 ? 'text-danger-600' : v > 60 ? 'text-warn-600' : 'text-gray-700'}`}>{v}d</span>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      key: 'businessUnit', label: 'Business Unit',
      render: (v, r) => <span className="text-gray-600">{r.businessUnit?.name || '—'}</span>,
    },
    {
      key: '_count', label: 'Activity',
      render: (v, r) => (
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span>{r._count?.submissions || 0} subs</span>
          <span>{r._count?.interviews || 0} int</span>
        </div>
      ),
    },
    {
      key: 'actions', label: '', sortable: false,
      render: (_, r) => (
        <button onClick={e => { e.stopPropagation(); setConfirmDelete(r) }}
          className="p-1.5 rounded text-gray-300 hover:text-danger-500 hover:bg-danger-50 transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={13} />
        </button>
      ),
    },
  ]

  return (
    <Page
      title="Students"
      subtitle={`${students.length} total students`}
      actions={
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setAssignModal(true)}>
                <UserPlus size={13} /> Assign {selected.length}
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkDelete} loading={deleting}>
                <Trash2 size={13} /> Delete {selected.length}
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => downloadCSV(students, 'students')}>
            <Download size={13} /> Export
          </Button>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Student
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={filters.tech} onChange={e => setFilters(f => ({ ...f, tech: e.target.value }))} className="w-44">
          <option value="">All Technologies</option>
          {techOptions.map(t => <option key={t}>{t}</option>)}
        </Select>
        <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="w-44">
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s}>{s}</option>)}
        </Select>
        {(filters.tech || filters.status) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ tech: '', status: '' })}>Clear filters</Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={students}
        loading={loading}
        onRowClick={r => nav(`/head/records/students/${r.id}`)}
        selectable
        onSelectionChange={setSelected}
        emptyText="No students found. Add your first student to get started."
      />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="Add New Student" width="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Student</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" required value={form.firstName || ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          <Input label="Last Name" value={form.lastName || ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          <Input label="Email" required type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="col-span-2" />
          <Input label="Password" required type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <Input label="Phone" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Select label="Technology" value={form.technology || ''} onChange={e => setForm(f => ({ ...f, technology: e.target.value }))}>
            <option value="">Select technology</option>
            {techOptions.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Select label="Marketing Status" value={form.marketingStatus || ''} onChange={e => setForm(f => ({ ...f, marketingStatus: e.target.value }))}>
            <option value="">Select status</option>
            {statusOptions.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Input label="LinkedIn URL" value={form.linkedIn || ''} onChange={e => setForm(f => ({ ...f, linkedIn: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>

      {/* Bulk assign modal */}
      <Modal open={assignModal} onClose={() => { setAssignModal(false); setAssignBuId('') }} title={`Assign ${selected.length} Students to BU`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setAssignModal(false); setAssignBuId('') }}>Cancel</Button>
            <Button onClick={handleBulkAssign} loading={assigning}>Assign Students</Button>
          </div>
        }>
        <Select label="Business Unit" required value={assignBuId} onChange={e => setAssignBuId(e.target.value)}>
          <option value="">Select business unit</option>
          {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Student"
        description={`Are you sure you want to delete ${confirmDelete?.firstName} ${confirmDelete?.lastName || ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </Page>
  )
}