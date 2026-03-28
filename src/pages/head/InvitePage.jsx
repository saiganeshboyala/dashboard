import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../context/ToastContext'
import { Page, DataTable, Loading, Badge, Button, Input, Select, Tabs, Modal } from '../../components/Shared'
import api from '../../utils/api'
import { Mail, Users, Clock, RefreshCw, Trash2, Copy, CheckCheck } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'BU_ADMIN',  label: 'BU Admin' },
  { value: 'RECRUITER', label: 'Recruiter' },
  { value: 'STUDENT',   label: 'Student' },
]

const STATUS_COLOR = { pending: 'amber', accepted: 'green', expired: 'red' }

// ══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL INVITE TAB
// ══════════════════════════════════════════════════════════════════════════════

function IndividualTab({ bus }) {
  const toast = useToast()
  const [form,       setForm]       = useState({ email: '', name: '', role: 'RECRUITER', buId: '' })
  const [sending,    setSending]    = useState(false)
  const [inviteUrl,  setInviteUrl]  = useState(null)
  const [copied,     setCopied]     = useState(false)

  async function send() {
    if (!form.email || !form.role) return toast.error('Email and role are required')
    setSending(true)
    try {
      const res = await api.post('/api/v1/tenants/send-invite', {
        email: form.email,
        name:  form.name || form.email.split('@')[0],
        role:  form.role,
        buId:  form.buId ? parseInt(form.buId) : null,
      })
      toast.success(`Invite sent to ${form.email}`)
      setInviteUrl(res?.inviteUrl || null)
      setForm({ email: '', name: '', role: 'RECRUITER', buId: '' })
    } catch (e) {
      toast.error(e.message)
    }
    setSending(false)
  }

  function copyUrl() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg">
      <p className="text-sm text-gray-500 mb-6">
        Send a password-setup link to one person. They'll receive an email (or you can copy the link below).
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <Input
          label="Email address *"
          type="email"
          placeholder="recruiter@example.com"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Full name"
          placeholder="Jane Smith (optional — defaults to email prefix)"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role *"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Select
            label="Business Unit"
            value={form.buId}
            onChange={e => setForm({ ...form, buId: e.target.value })}
          >
            <option value="">— Any / None —</option>
            {bus.map(bu => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
          </Select>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={send} disabled={sending || !form.email}>
            <Mail size={14} /> {sending ? 'Sending…' : 'Send Invite'}
          </Button>
        </div>
      </div>

      {/* Invite URL copy box */}
      {inviteUrl && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
            <Mail size={12} /> Invite link (copy and share if email isn't configured)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-blue-100 rounded px-3 py-2 text-blue-800 overflow-x-auto whitespace-nowrap">
              {inviteUrl}
            </code>
            <button
              onClick={copyUrl}
              className="shrink-0 p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
              title="Copy link"
            >
              {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK INVITE TAB
// ══════════════════════════════════════════════════════════════════════════════

function BulkTab({ bus }) {
  const toast    = useToast()
  const [role,   setRole]    = useState('RECRUITER')
  const [buId,   setBuId]    = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)

  async function loadPreview() {
    if (!buId) return
    setLoading(true)
    try {
      const res = await api.get(`/api/v1/tenants/bulk-invite/preview?role=${role}&buId=${buId}`)
      setPreview(res)
    } catch { setPreview(null) }
    setLoading(false)
  }

  useEffect(() => { setPreview(null); setResult(null) }, [role, buId])

  async function sendBulk() {
    if (!buId) return toast.error('Select a Business Unit')
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post('/api/v1/tenants/bulk-invite', { role, buId: parseInt(buId) })
      setResult(res)
      toast.success(`Invited ${res.invited} users`)
    } catch (e) {
      toast.error(e.message)
    }
    setLoading(false)
  }

  const buName = bus.find(b => String(b.id) === String(buId))?.name

  return (
    <div className="max-w-lg">
      <p className="text-sm text-gray-500 mb-6">
        Invite all recruiters or students in a Business Unit who don't yet have passwords.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Role *" value={role} onChange={e => setRole(e.target.value)}>
            <option value="RECRUITER">Recruiter</option>
            <option value="STUDENT">Student</option>
          </Select>
          <Select label="Business Unit *" value={buId} onChange={e => setBuId(e.target.value)}>
            <option value="">— Select BU —</option>
            {bus.map(bu => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
          </Select>
        </div>

        {/* Preview button */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={loadPreview} disabled={!buId || loading}>
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Users size={13} />}
            Preview
          </Button>
          {preview && (
            <span className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{preview.count}</span>{' '}
              {role.toLowerCase()}s in <span className="font-medium">{buName}</span> don't have accounts yet
            </span>
          )}
        </div>

        {/* Progress / result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
            <p className="text-sm font-semibold text-green-800">Bulk invite complete</p>
            <div className="flex gap-6 text-sm">
              <span className="text-green-700"><strong>{result.invited}</strong> invited</span>
              <span className="text-gray-500"><strong>{result.skipped}</strong> skipped</span>
              <span className="text-gray-500"><strong>{result.total}</strong> total</span>
            </div>
            {result.errors?.length > 0 && (
              <p className="text-xs text-red-600 mt-1">{result.errors.length} error(s): {result.errors.map(e => e.email).join(', ')}</p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={sendBulk}
            disabled={loading || !buId || (preview && preview.count === 0)}
          >
            <Mail size={14} />
            {loading ? 'Sending…' : `Invite All${preview ? ` (${preview.count})` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PENDING INVITES TAB
// ══════════════════════════════════════════════════════════════════════════════

function PendingTab() {
  const toast             = useToast()
  const [invites, setInvites]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [revokeId, setRevokeId] = useState(null)
  const [acting, setActing]     = useState(null) // tokenId being actioned

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/tenants/pending-invites')
      setInvites(res?.invites || [])
    } catch { setInvites([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function resend(id) {
    setActing(id)
    try {
      const res = await api.post(`/api/v1/tenants/resend-invite/${id}`, {})
      toast.success('Invite resent')
      if (res?.inviteUrl) {
        navigator.clipboard?.writeText(res.inviteUrl).catch(() => {})
        toast.success('New link copied to clipboard')
      }
      await load()
    } catch (e) {
      toast.error(e.message)
    }
    setActing(null)
  }

  async function revoke(id) {
    setActing(id)
    try {
      await api.del(`/api/v1/tenants/revoke-invite/${id}`)
      toast.success('Invite revoked')
      setRevokeId(null)
      await load()
    } catch (e) {
      toast.error(e.message)
    }
    setActing(null)
  }

  if (loading) return <Loading />

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{invites.length} invite{invites.length !== 1 ? 's' : ''} total</p>
        <Button variant="secondary" onClick={load} size="sm">
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <DataTable
        columns={[
          { key: 'email', label: 'Email', render: (v, r) => (
            <div>
              <p className="font-medium text-gray-900">{r.name || v}</p>
              <p className="text-[11px] text-gray-400">{v}</p>
            </div>
          )},
          { key: 'role',       label: 'Role',       render: v => <Badge color="blue">{v}</Badge> },
          { key: 'status',     label: 'Status',     render: v => <Badge color={STATUS_COLOR[v] || 'gray'}>{v}</Badge> },
          { key: 'created_at', label: 'Invited',    render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'expires_at', label: 'Expires',    render: v => v ? new Date(v).toLocaleDateString() : '—' },
          { key: 'actions',    label: '',           render: (_, r) => (
            <div className="flex items-center gap-2 justify-end">
              {(r.status === 'pending' || r.status === 'expired') && (
                <Button
                  size="sm" variant="secondary"
                  disabled={acting === r.id}
                  onClick={() => resend(r.id)}
                >
                  <RefreshCw size={12} /> Resend
                </Button>
              )}
              {r.status === 'pending' && (
                <Button
                  size="sm" variant="ghost"
                  disabled={acting === r.id}
                  onClick={() => setRevokeId(r.id)}
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
          )},
        ]}
        rows={invites}
      />

      {/* Revoke confirmation modal */}
      <Modal open={!!revokeId} onClose={() => setRevokeId(null)} title="Revoke Invite">
        <p className="text-sm text-gray-600 mb-6">
          This will invalidate the invite link. The user won't be able to set their password with the old link.
          You can re-invite them later.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRevokeId(null)}>Cancel</Button>
          <Button onClick={() => revoke(revokeId)} disabled={acting === revokeId}>
            Revoke Invite
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function InvitePage() {
  const [tab, setTab]   = useState('individual')
  const [bus, setBus]   = useState([])

  useEffect(() => {
    api.get('/api/v1/dynamic/business_units?limit=200')
      .then(r => setBus(r?.records || r?.data || []))
      .catch(() => setBus([]))
  }, [])

  const tabs = [
    { id: 'individual', label: 'Invite Individual' },
    { id: 'bulk',       label: 'Bulk Invite' },
    { id: 'pending',    label: 'Pending Invites' },
  ]

  return (
    <Page
      title="Invite Users"
      subtitle="Send password-setup links to recruiters and students from your Salesforce import"
    >
      <Tabs active={tab} onChange={setTab} tabs={tabs} />
      <div className="mt-6">
        {tab === 'individual' && <IndividualTab bus={bus} />}
        {tab === 'bulk'       && <BulkTab bus={bus} />}
        {tab === 'pending'    && <PendingTab />}
      </div>
    </Page>
  )
}
