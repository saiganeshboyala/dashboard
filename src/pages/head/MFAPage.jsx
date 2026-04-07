import { useState, useEffect } from 'react'
import { Page, Badge, Button, Modal, Input, Alert, Loading, DataTable } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get, post } from '../../utils/api'
import { Shield, Smartphone, Key, LogOut, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function MFAPage() {
  const toast = useToast()
  const [status, setStatus] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [setupModal, setSetupModal] = useState(false)
  const [setupData, setSetupData] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [disableModal, setDisableModal] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disabling, setDisabling] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, sess] = await Promise.all([
        get('/api/v1/mfa/status').catch(() => null),
        get('/api/v1/mfa/sessions').catch(() => []),
      ])
      setStatus(s)
      setSessions(Array.isArray(sess) ? sess : sess?.sessions || [])
    } catch (e) { toast.error('Failed to load MFA status') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSetup = async () => {
    try {
      const data = await post('/api/v1/mfa/setup', {})
      setSetupData(data)
      setSetupModal(true)
    } catch (e) { toast.error(e.message) }
  }

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length < 6) return toast.error('Enter the 6-digit code from your app')
    setVerifying(true)
    try {
      // FIX: was { token: verifyCode } — backend verifySchema expects "code"
      await post('/api/v1/mfa/verify', { code: verifyCode })
      toast.success('MFA enabled successfully!')
      setSetupModal(false); setVerifyCode(''); setSetupData(null); load()
    } catch (e) { toast.error(e.message) }
    setVerifying(false)
  }

  const handleDisable = async () => {
    if (!disableCode || disableCode.length < 6) return toast.error('Enter the 6-digit code from your authenticator app')
    setDisabling(true)
    try {
      await post('/api/v1/mfa/disable', { code: disableCode })
      toast.success('MFA disabled')
      setDisableModal(false); setDisableCode(''); load()
    } catch (e) { toast.error(e.message) }
    setDisabling(false)
  }

  const handleRevokeSession = async (sessionId) => {
    try {
      await post(`/api/v1/mfa/sessions/${sessionId}/revoke`, {})
      toast.success('Session revoked')
      load()
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return <Page title="Security · MFA"><Loading /></Page>

  const mfaEnabled = status?.mfaEnabled || status?.enabled || status?.is_enabled

  return (
    <Page title="Multi-Factor Authentication" subtitle="Add an extra layer of security to your account">

      {/* Status card */}
      <div className="card p-6 mb-6 max-w-xl">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mfaEnabled ? 'bg-success-50' : 'bg-gray-100'}`}>
            <Shield size={22} className={mfaEnabled ? 'text-success-600' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Authenticator App</p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {mfaEnabled
                ? `Enabled${status?.enabled_at ? ' · ' + new Date(status.enabled_at).toLocaleDateString() : ''}`
                : 'Not configured — your account is protected by password only'}
            </p>
          </div>
          <Badge color={mfaEnabled ? 'green' : 'gray'} dot>{mfaEnabled ? 'Enabled' : 'Disabled'}</Badge>
        </div>

        {!mfaEnabled && (
          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-2.5 text-[12px] text-gray-600">
              <CheckCircle size={14} className="text-success-500 shrink-0 mt-0.5" />
              Works with Google Authenticator, Authy, 1Password, and all TOTP apps
            </div>
            <div className="flex items-start gap-2.5 text-[12px] text-gray-600">
              <CheckCircle size={14} className="text-success-500 shrink-0 mt-0.5" />
              Protects against stolen passwords and phishing attacks
            </div>
            <Button className="mt-2" onClick={handleSetup}>
              <Smartphone size={14} /> Set Up MFA
            </Button>
          </div>
        )}

        {mfaEnabled && (
          <div className="mt-4 flex gap-2">
            <Button variant="danger" size="sm" onClick={() => setDisableModal(true)}>
              Disable MFA
            </Button>
          </div>
        )}
      </div>

      {/* Active sessions */}
      {sessions.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-gray-900 mb-3">Active MFA Sessions</h3>
          <DataTable
            columns={[
              { key: 'loginMethod', label: 'Method', render: v => <span className="font-medium">{v || 'password'}</span> },
              { key: 'ipAddress', label: 'IP', render: v => <span className="font-mono text-[12px]">{v || '—'}</span> },
              { key: 'createdAt', label: 'Signed In', render: v => v ? new Date(v).toLocaleString() : '—' },
              { key: 'userAgent', label: 'Device', render: v => <span className="text-[12px] text-gray-500 truncate max-w-[200px] block">{v || '—'}</span> },
              {
                key: 'actions', label: '', sortable: false,
                render: (_, r) => (
                  <Button size="xs" variant="danger" onClick={() => handleRevokeSession(r.id)}>
                    <LogOut size={11} /> Revoke
                  </Button>
                ),
              },
            ]}
            rows={sessions}
            emptyText="No active sessions"
          />
        </div>
      )}

      {/* Setup modal */}
      <Modal open={setupModal} onClose={() => { setSetupModal(false); setVerifyCode(''); setSetupData(null) }} title="Set Up Authenticator App">
        {setupData ? (
          <div className="space-y-5">
            <div className="text-center">
              {setupData.qrCodeUrl ? (
                <img src={setupData.qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto border rounded-lg" />
              ) : (
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-[12px]">
                  QR code not available
                </div>
              )}
            </div>
            {setupData.secret && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[11px] text-gray-500 mb-1">Manual entry key</p>
                <p className="font-mono text-[13px] font-bold text-gray-800 select-all">{setupData.secret}</p>
              </div>
            )}
            <div>
              <Input
                label="Verification Code"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                hint="Enter the 6-digit code from your authenticator app"
                maxLength={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setSetupModal(false); setVerifyCode(''); setSetupData(null) }}>Cancel</Button>
              <Button onClick={handleVerify} loading={verifying} disabled={verifyCode.length < 6}>
                <Shield size={13} /> Verify & Enable
              </Button>
            </div>
          </div>
        ) : (
          <Loading />
        )}
      </Modal>

      {/* Disable modal */}
      <Modal open={disableModal} onClose={() => { setDisableModal(false); setDisableCode('') }} title="Disable MFA">
        <Alert type="warn" className="mb-4">
          Disabling MFA reduces your account security. Your password alone will protect your account.
        </Alert>
        <Input
          label="Authenticator Code" required
          value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000" maxLength={6}
          hint="Enter the 6-digit code from your authenticator app to confirm"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => { setDisableModal(false); setDisableCode('') }}>Cancel</Button>
          <Button variant="danger" onClick={handleDisable} loading={disabling} disabled={disableCode.length < 6}>Disable MFA</Button>
        </div>
      </Modal>
    </Page>
  )
}