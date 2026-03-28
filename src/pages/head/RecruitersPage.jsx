import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, DataTable, Badge, Button, Modal, Input, Select } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getRecruiters, createRecruiter, getBUs } from '../../utils/api'
import { Plus, RefreshCw, Download } from 'lucide-react'
import { downloadCSV } from '../../utils/export'
import { useDynamicSchema } from '../../hooks/useDynamicSchema'

export default function RecruitersPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { renderPicklist } = useDynamicSchema('recruiters')
  const [recruiters, setRecruiters] = useState([])
  const [bus, setBus] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [rData, bData] = await Promise.all([getRecruiters(), getBUs()])
      setRecruiters(rData.recruiters || [])
      setBus(Array.isArray(bData) ? bData : bData?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password are required')
    setCreating(true)
    try {
      await createRecruiter(form)
      toast.success('Recruiter created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  return (
    <Page title="Recruiters" subtitle={`${recruiters.length} recruiters`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => downloadCSV(recruiters, 'recruiters')}><Download size={13} /> Export</Button>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Recruiter</Button>
        </div>
      }>
      <DataTable
        columns={[
          { key: 'name', label: 'Recruiter', render: (_, r) => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                {(r.user?.name || r.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-[13px]">{r.user?.name || r.name || '—'}</p>
                <p className="text-[11px] text-gray-400">{r.user?.email || r.email || ''}</p>
              </div>
            </div>
          )},
          { key: 'businessUnit', label: 'Business Unit', render: (_, r) => r.businessUnit?.name || r.buName || '—' },
          { key: '_count', label: 'Students', render: (_, r) => <span className="tabular-nums font-medium">{r._count?.students || r.studentCount || 0}</span> },
          { key: 'submissionCount', label: 'Submissions', render: (v, r) => <span className="tabular-nums">{v || r._count?.submissions || 0}</span> },
          { key: 'placementCount', label: 'Placements', render: (v, r) => <span className="text-success-600 tabular-nums font-medium">{v || r.placements || 0}</span> },
          { key: 'conversionRate', label: 'Conv%', render: v => {
            if (v == null) return <span className="text-gray-300">—</span>
            const pct = parseFloat(v)
            return <Badge color={pct > 5 ? 'green' : pct > 0 ? 'amber' : 'gray'}>{v}%</Badge>
          }},
        ]}
        rows={recruiters}
        loading={loading}
        onRowClick={r => nav(`/head/records/recruiters/${r.id}`)}
        emptyText="No recruiters yet"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="Add New Recruiter"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Recruiter</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Input label="Email" required type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Password" required type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <Select label="Business Unit" value={form.buId || ''} onChange={e => setForm(f => ({ ...f, buId: e.target.value }))} className="col-span-2">
            <option value="">Select BU</option>
            {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
      </Modal>
    </Page>
  )
}
