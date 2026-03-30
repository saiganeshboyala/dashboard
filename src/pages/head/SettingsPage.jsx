import { useState, useEffect } from 'react'
import { Page, Loading, Tabs, Button, Input, Select, DataTable, Badge, Modal, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { get, post, del as apiDel } from '../../utils/api'
import {
  getTenant, updateTenant, getDomainInfo, setCustomDomain, verifyDomain,
  getPasswordPolicy, updatePasswordPolicy, getIpRestrictions, getSSOProviders,
  getDelegatedAdmins, addDelegatedAdmin, removeDelegatedAdmin, getStorage, getLetterheads,
  getPreferences, updatePreferences, getTenantUsers, inviteUser,
  getLoginHours, setLoginHours, updateBranding
} from '../../utils/api'
import { Save, Shield, Globe, Building2, Lock, Server, Mail, Sliders, Plus, Trash2, Users, LogOut, Monitor } from 'lucide-react'

export default function SettingsPage() {
  const toast = useToast()
  const [tab, setTab] = useState('company')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Data state per tab
  const [tenant, setTenant] = useState({})
  const [domain, setDomain] = useState({})
  const [policy, setPolicy] = useState({})
  const [ipRules, setIpRules] = useState([])
  const [ssoProviders, setSsoProviders] = useState([])
  const [delegated, setDelegated] = useState([])
  const [storage, setStorage] = useState(null)
  const [letterheads, setLetterheads] = useState([])
  const [prefs, setPrefs] = useState({})
  const [emailAccounts, setEmailAccounts] = useState([])
  const [smtpForm, setSmtpForm] = useState({})
  const [loginHours, setLoginHours] = useState([])
  const [branding, setBranding] = useState({})
  const [loginHistory, setLoginHistory] = useState([])
  const [sessions, setSessions] = useState([])
  const [adminHistory, setAdminHistory] = useState([])
  const [tenantUsers, setTenantUsers] = useState([])
  const [showAddDelegate, setShowAddDelegate] = useState(false)
  const [delegateForm, setDelegateForm] = useState({})
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({})

  const loadTab = async (t) => {
    setLoading(true)
    try {
      switch (t) {
        case 'company':     setTenant(await getTenant().catch(() => ({}))); break
        case 'domain':      setDomain(await getDomainInfo().catch(() => ({}))); break
        case 'security': {
          const [pw, ip, hist, sess, adminHist] = await Promise.all([
            getPasswordPolicy().catch(() => ({})),
            getIpRestrictions().catch(() => []),
            get('/api/v1/auth/login-history').catch(() => ({})),
            get('/api/v1/auth/sessions').catch(() => ({})),
            get('/api/v1/auth/admin/login-history').catch(() => ({})),
          ])
          setPolicy(pw?.policy || pw || {})
          setIpRules(ip?.restrictions || ip || [])
          setLoginHistory(hist?.loginHistory || [])
          setSessions(sess?.sessions || [])
          setAdminHistory(adminHist?.loginHistory || [])
          break
        }
        case 'sso':         setSsoProviders((await getSSOProviders().catch(() => ({})))?.providers || []); break
        case 'delegated':   setDelegated((await getDelegatedAdmins().catch(() => ({})))?.grants || []); break
        case 'storage':     setStorage(await getStorage().catch(() => null)); break
        case 'letterheads': setLetterheads((await getLetterheads().catch(() => ({})))?.letterheads || []); break
        case 'preferences': setPrefs(await getPreferences().catch(() => ({}))); break
        case 'email':
          const eAccts = await get('/api/v1/email/accounts').catch(() => [])
          setEmailAccounts(Array.isArray(eAccts) ? eAccts : eAccts?.accounts || [])
          break
        case 'users': setTenantUsers((await getTenantUsers().catch(() => null))?.users || []); break
        case 'login-hours': setLoginHours((await getLoginHours().catch(() => null))?.restrictions || []); break
      }
    } catch (e) { toast.error(`Failed to load ${t}`) }
    setLoading(false)
  }

  useEffect(() => { loadTab(tab) }, [tab])

  const save = async (fn, data, msg = 'Saved!') => {
    setSaving(true)
    try { await fn(data); toast.success(msg) }
    catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const tabDef = [
    { id: 'company',     label: 'Company',       icon: Building2 },
    { id: 'domain',      label: 'Domain',         icon: Globe },
    { id: 'security',    label: 'Security',       icon: Shield },
    { id: 'sso',         label: 'SSO',            icon: Lock },
    { id: 'delegated',   label: 'Delegated Admin',icon: Shield },
    { id: 'storage',     label: 'Storage',        icon: Server },
    { id: 'letterheads', label: 'Letterheads',    icon: Mail },
    { id: 'preferences', label: 'Preferences',    icon: Sliders },
    { id: 'email',       label: 'Email Accounts', icon: Mail },
    { id: 'users',       label: 'Users',          icon: Users },
    { id: 'login-hours', label: 'Login Hours',     icon: Shield },
  ]

  return (
    <Page title="Settings" subtitle="Platform and account configuration">
      <Tabs active={tab} onChange={t => { setTab(t); setLoading(true) }} tabs={tabDef.map(t => ({ id: t.id, label: t.label }))} />

      <div className="mt-6">
        {loading ? <Loading /> : (
          <>
            {/* ── COMPANY ── */}
            {tab === 'company' && (
              <div className="card p-6 max-w-xl space-y-4">
                <h3 className="text-[13px] font-bold text-gray-900">Company Information</h3>
                <Input label="Company Name" value={tenant.name || ''} onChange={e => setTenant(t => ({ ...t, name: e.target.value }))} />
                <Input label="Logo URL" value={tenant.logoUrl || tenant.logo_url || ''} onChange={e => setTenant(t => ({ ...t, logoUrl: e.target.value }))} hint="Direct link to your logo image" />
                <div>
                  <label className="field-label">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={tenant.primaryColor || tenant.primary_color || '#1a4ef5'}
                      onChange={e => setTenant(t => ({ ...t, primaryColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <Input value={tenant.primaryColor || '#1a4ef5'} onChange={e => setTenant(t => ({ ...t, primaryColor: e.target.value }))} className="flex-1" />
                  </div>
                </div>
                <Input label="Support Email" type="email" value={tenant.supportEmail || ''} onChange={e => setTenant(t => ({ ...t, supportEmail: e.target.value }))} />
                <Button onClick={() => save(updateTenant, tenant, 'Company info saved')} loading={saving}><Save size={13} /> Save Changes</Button>
              </div>
            )}

            {/* ── DOMAIN ── */}
            {tab === 'domain' && (
              <div className="card p-6 max-w-xl space-y-4">
                <h3 className="text-[13px] font-bold">Domain Settings</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[11px] text-gray-500 mb-1">Default domain</p>
                  <p className="font-mono text-[13px] text-gray-800">{domain.defaultDomain || domain.default_domain || '—'}</p>
                </div>
                <Input label="Custom Domain" value={domain.customDomain || domain.custom_domain || ''}
                  onChange={e => setDomain(d => ({ ...d, customDomain: e.target.value }))}
                  placeholder="crm.yourcompany.com" hint="Point your DNS CNAME to our servers first" />
                <div className="flex gap-2">
                  <Button onClick={() => save(setCustomDomain, { domain: domain.customDomain }, 'Domain updated')} loading={saving}><Save size={13} /> Set Domain</Button>
                  <Button variant="secondary" onClick={async () => { try { await verifyDomain(); toast.success('DNS verified!') } catch (e) { toast.error(e.message) } }}>Verify DNS</Button>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {tab === 'security' && (
              <div className="space-y-5 max-w-3xl">
                {/* Password Policy */}
                <div className="card p-6 space-y-4">
                  <h3 className="text-[13px] font-bold">Password Policy</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Min Length" type="number" value={policy.min_length ?? 8} onChange={e => setPolicy(p => ({ ...p, min_length: +e.target.value }))} />
                    <Input label="Expire Days (0=never)" type="number" value={policy.password_expiry_days ?? policy.max_age_days ?? 0} onChange={e => setPolicy(p => ({ ...p, password_expiry_days: +e.target.value }))} />
                    <Input label="Password History" type="number" value={policy.history_count ?? policy.password_history ?? 0} onChange={e => setPolicy(p => ({ ...p, history_count: +e.target.value }))} />
                    <Input label="Max Failed Attempts" type="number" value={policy.max_failed_attempts ?? policy.max_login_attempts ?? 5} onChange={e => setPolicy(p => ({ ...p, max_failed_attempts: +e.target.value }))} />
                    <Input label="Lockout (min)" type="number" value={policy.lockout_duration_mins ?? policy.lockout_duration_minutes ?? 30} onChange={e => setPolicy(p => ({ ...p, lockout_duration_mins: +e.target.value }))} />
                    <Input label="Session Timeout (min)" type="number" value={policy.session_timeout_minutes ?? 480} onChange={e => setPolicy(p => ({ ...p, session_timeout_minutes: +e.target.value }))} />
                  </div>
                  <div className="flex flex-wrap gap-5">
                    {[
                      ['require_uppercase', 'Require Uppercase'],
                      ['require_lowercase', 'Require Lowercase'],
                      ['require_numbers',   'Require Numbers'],
                      ['require_special',   'Require Special Char'],
                    ].map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 text-[12px] cursor-pointer">
                        <input type="checkbox" checked={!!policy[k]} onChange={e => setPolicy(p => ({ ...p, [k]: e.target.checked }))} className="rounded border-gray-300 text-brand-600" />
                        <span className="text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => save(
                      (data) => post('/api/v1/auth/password-policy', data),
                      policy, 'Password policy saved'
                    )} loading={saving}><Save size={13} /> Save Policy</Button>
                    <Button variant="secondary" onClick={() => save(updatePasswordPolicy, policy, 'Policy also saved to legacy')}>Save to Legacy</Button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Monitor size={14} className="text-gray-400" />
                      <h3 className="text-[13px] font-bold">Active Sessions</h3>
                    </div>
                    <span className="text-[11px] text-gray-400">{sessions.length} active</span>
                  </div>
                  <DataTable searchable={false} columns={[
                    { key: 'browser', label: 'Browser / OS', render: (v, r) => <span className="text-[12px]">{v} on {r.os}</span> },
                    { key: 'ip_address', label: 'IP', render: v => <span className="font-mono text-[11px] text-gray-500">{v}</span> },
                    { key: 'last_activity', label: 'Last Active', render: v => v ? new Date(v).toLocaleString() : '—' },
                    { key: 'created_at', label: 'Signed In', render: v => v ? new Date(v).toLocaleDateString() : '—' },
                    { key: 'actions', label: '', render: (_, r) => (
                      <button onClick={async () => {
                        try {
                          await apiDel(`/api/v1/auth/sessions/${r.id}`)
                          toast.success('Session revoked')
                          setSessions(prev => prev.filter(s => s.id !== r.id))
                        } catch (e) { toast.error(e.message) }
                      }} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Revoke">
                        <LogOut size={13} />
                      </button>
                    )},
                  ]} rows={sessions} emptyText="No active sessions" />
                </div>

                {/* Login History (own + all users for HEAD) */}
                <div className="card p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-gray-400" />
                    <h3 className="text-[13px] font-bold">Login History (All Users)</h3>
                  </div>
                  <DataTable searchable={false} columns={[
                    { key: 'user_name', label: 'User', render: (v, r) => <div><p className="text-[12px] font-medium">{v || '—'}</p><p className="text-[10px] text-gray-400">{r.email}</p></div> },
                    { key: 'ip_address', label: 'IP', render: v => <span className="font-mono text-[11px]">{v}</span> },
                    { key: 'browser', label: 'Browser / OS', render: (v, r) => <span className="text-[11px] text-gray-500">{v} / {r.os}</span> },
                    { key: 'status', label: 'Status', render: v => <Badge variant={v === 'success' ? 'success' : 'danger'}>{v}</Badge> },
                    { key: 'failure_reason', label: 'Reason', render: v => v ? <span className="text-[11px] text-red-500">{v}</span> : '—' },
                    { key: 'created_at', label: 'Date', render: v => v ? new Date(v).toLocaleString() : '—' },
                  ]} rows={adminHistory.length > 0 ? adminHistory : loginHistory} emptyText="No login history" />
                </div>

                {/* IP Restrictions */}
                <div className="card p-6">
                  <h3 className="text-[13px] font-bold mb-3">IP Restrictions</h3>
                  <DataTable searchable={false} columns={[
                    { key: 'profile_role', label: 'Role' },
                    { key: 'ip_range_start', label: 'IP Start', render: v => <span className="font-mono text-[12px]">{v}</span> },
                    { key: 'ip_range_end', label: 'IP End', render: v => <span className="font-mono text-[12px]">{v}</span> },
                    { key: 'description', label: 'Description' },
                  ]} rows={ipRules} emptyText="No IP restrictions configured" />
                </div>
              </div>
            )}

            {/* ── SSO ── */}
            {tab === 'sso' && (
              <div className="card p-6 max-w-2xl">
                <h3 className="text-[13px] font-bold mb-3">SSO Providers</h3>
                <DataTable searchable={false} columns={[
                  { key: 'provider', label: 'Provider', render: v => <span className="font-medium">{v}</span> },
                  { key: 'entity_id', label: 'Entity ID', render: v => <span className="font-mono text-[11px]">{v}</span> },
                  { key: 'is_active', label: 'Active', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Disabled'}</Badge> },
                ]} rows={ssoProviders} emptyText="No SSO providers configured" />
              </div>
            )}

            {/* ── DELEGATED ADMIN ── */}
            {tab === 'delegated' && (
              <div className="card p-6 max-w-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold">Delegated Admin Grants</h3>
                  <Button size="sm" onClick={() => setShowAddDelegate(true)}><Plus size={13} /> Add Grant</Button>
                </div>
                <DataTable searchable={false} columns={[
                  { key: 'user_name', label: 'User', render: v => <span className="font-medium">{v}</span> },
                  { key: 'can_manage_users', label: 'Manage Users', render: v => <Badge color={v ? 'green' : 'gray'}>{v ? '✓' : '✗'}</Badge> },
                  { key: 'can_create_users', label: 'Create Users', render: v => <Badge color={v ? 'green' : 'gray'}>{v ? '✓' : '✗'}</Badge> },
                  { key: 'max_users_can_create', label: 'Max Users' },
                  { key: 'actions', label: '', sortable: false, render: (_, r) => (
                    <button onClick={() => removeDelegatedAdmin(r.id).then(() => { toast.success('Grant removed'); loadTab('delegated') }).catch(e => toast.error(e.message))}
                      className="p-1.5 text-gray-300 hover:text-danger-500 transition-colors"><Trash2 size={12} /></button>
                  )},
                ]} rows={delegated} emptyText="No delegated admin grants" />
              </div>
            )}

            {/* ── STORAGE ── */}
            {tab === 'storage' && storage && (
              <div className="card p-6 max-w-xl">
                <h3 className="text-[13px] font-bold mb-4">Storage Usage</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                    <span>Records used</span>
                    <span>{storage.usage?.recordsUsedPct || 0}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${storage.usage?.recordsUsedPct || 0}%` }} />
                  </div>
                </div>
                {storage.records && (
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(storage.records).map(([k, v]) => (
                      <div key={k} className="p-3 bg-gray-50 rounded-xl text-center">
                        <p className="text-lg font-bold text-gray-900">{typeof v === 'number' ? v.toLocaleString() : v}</p>
                        <p className="text-[10px] text-gray-400 capitalize mt-0.5">{k.replace(/_/g, ' ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── LETTERHEADS ── */}
            {tab === 'letterheads' && (
              <div className="card p-6 max-w-2xl">
                <h3 className="text-[13px] font-bold mb-3">Email Letterheads</h3>
                <DataTable searchable={false} columns={[
                  { key: 'name', label: 'Name', render: v => <span className="font-medium">{v}</span> },
                  { key: 'company_name', label: 'Company' },
                  { key: 'is_default', label: 'Default', render: v => v ? <Badge color="green">Default</Badge> : '' },
                ]} rows={letterheads} emptyText="No letterheads configured" />
              </div>
            )}

            {/* ── EMAIL ACCOUNTS ── */}
            {tab === 'email' && (
              <div className="space-y-5 max-w-2xl">
                <div className="card p-6">
                  <h3 className="text-[13px] font-bold mb-3">Connected Email Accounts</h3>
                  {emailAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {emailAccounts.map((acct, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-[13px] font-medium">{acct.email || acct.from_email}</p>
                            <p className="text-[11px] text-gray-400">{acct.type || 'SMTP'} · {acct.is_active ? 'Active' : 'Inactive'}</p>
                          </div>
                          <Badge color={acct.is_active ? 'green' : 'gray'} dot>{acct.is_active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-400">No email accounts configured</p>
                  )}
                </div>
                <div className="card p-6 space-y-4">
                  <h3 className="text-[13px] font-bold">Add SMTP Account</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="SMTP Host" value={smtpForm.host || ''} onChange={e => setSmtpForm(f => ({...f, host: e.target.value}))} placeholder="smtp.gmail.com" />
                    <Input label="Port" type="number" value={smtpForm.port || ''} onChange={e => setSmtpForm(f => ({...f, port: +e.target.value}))} placeholder="587" />
                    <Input label="Username" value={smtpForm.username || ''} onChange={e => setSmtpForm(f => ({...f, username: e.target.value}))} />
                    <Input label="Password" type="password" value={smtpForm.password || ''} onChange={e => setSmtpForm(f => ({...f, password: e.target.value}))} />
                    <Input label="From Email" type="email" value={smtpForm.fromEmail || ''} onChange={e => setSmtpForm(f => ({...f, fromEmail: e.target.value}))} />
                    <Input label="From Name" value={smtpForm.fromName || ''} onChange={e => setSmtpForm(f => ({...f, fromName: e.target.value}))} />
                  </div>
                  <Button onClick={async () => {
                    try {
                      await post('/api/v1/email/accounts/smtp', smtpForm)
                      toast.success('SMTP account connected')
                      setSmtpForm({})
                      loadTab('email')
                    } catch (e) { toast.error(e.message) }
                  }}><Mail size={13} /> Connect SMTP</Button>
                </div>
              </div>
            )}

            {/* ── PREFERENCES ── */}
            {tab === 'preferences' && (
              <div className="card p-6 max-w-sm space-y-4">
                <h3 className="text-[13px] font-bold">User Preferences</h3>
                <Select label="Theme" value={prefs.theme || 'light'} onChange={e => setPrefs(p => ({ ...p, theme: e.target.value }))}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </Select>
                <Select label="Date Format" value={prefs.dateFormat || 'DD/MM/YYYY'} onChange={e => setPrefs(p => ({ ...p, dateFormat: e.target.value }))}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </Select>
                <Select label="Timezone" value={prefs.timezone || 'UTC'} onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                </Select>
                <Button onClick={() => save(updatePreferences, prefs, 'Preferences saved')} loading={saving}><Save size={13} /> Save Preferences</Button>
              </div>
            )}
          </>
        )}
      </div>


            {/* ── USERS ── */}
            {tab === 'users' && (
              <div className="card p-6 max-w-3xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold">Team Members</h3>
                  <Button size="sm" onClick={() => setShowInvite(true)}><Plus size={13} /> Invite User</Button>
                </div>
                <DataTable searchable={false} columns={[
                  { key: 'name', label: 'Name', render: (v, r) => (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-bold">{(v||'?')[0]}</div>
                      <div><p className="font-medium text-[13px]">{v}</p><p className="text-[11px] text-gray-400">{r.email}</p></div>
                    </div>
                  )},
                  { key: 'role', label: 'Role', render: v => <Badge color={v==='HEAD'?'red':v==='BU_ADMIN'?'blue':v==='RECRUITER'?'purple':'gray'}>{v}</Badge> },
                  { key: 'is_active', label: 'Status', render: v => <Badge color={v?'green':'gray'} dot>{v?'Active':'Inactive'}</Badge> },
                  { key: 'last_login', label: 'Last Login', render: v => v ? new Date(v).toLocaleDateString() : 'Never' },
                ]} rows={tenantUsers} emptyText="No users found" />
              </div>
            )}

            {/* ── LOGIN HOURS ── */}
            {tab === 'login-hours' && (
              <div className="card p-6 max-w-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold">Login Hour Restrictions</h3>
                  <Button size="sm" onClick={async () => {
                    const schedule = [
                      { day_of_week: 1, start_time: '08:00', end_time: '20:00', profile_role: 'RECRUITER' },
                      { day_of_week: 2, start_time: '08:00', end_time: '20:00', profile_role: 'RECRUITER' },
                      { day_of_week: 3, start_time: '08:00', end_time: '20:00', profile_role: 'RECRUITER' },
                      { day_of_week: 4, start_time: '08:00', end_time: '20:00', profile_role: 'RECRUITER' },
                      { day_of_week: 5, start_time: '08:00', end_time: '20:00', profile_role: 'RECRUITER' },
                    ]
                    try { await setLoginHours({ restrictions: schedule }); toast.success('Login hours saved'); loadTab('login-hours') }
                    catch(e) { toast.error(e.message) }
                  }}>Apply Mon-Fri 8am-8pm</Button>
                </div>
                <DataTable searchable={false} columns={[
                  { key: 'profile_role', label: 'Role' },
                  { key: 'day_of_week', label: 'Day', render: v => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][v] || v },
                  { key: 'start_time', label: 'Start' },
                  { key: 'end_time', label: 'End' },
                  { key: 'is_active', label: 'Active', render: v => <Badge color={v?'green':'gray'}>{v?'Yes':'No'}</Badge> },
                ]} rows={loginHours} emptyText="No login hour restrictions" />
              </div>
            )}

      {/* Delegate modal */}
      <Modal open={showAddDelegate} onClose={() => { setShowAddDelegate(false); setDelegateForm({}) }} title="Add Delegated Admin"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowAddDelegate(false); setDelegateForm({}) }}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await addDelegatedAdmin(delegateForm)
                toast.success('Grant added')
                setShowAddDelegate(false); setDelegateForm({}); loadTab('delegated')
              } catch (e) { toast.error(e.message) }
            }}>Add Grant</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="User ID" type="number" value={delegateForm.userId || ''} onChange={e => setDelegateForm(f => ({ ...f, userId: e.target.value }))} required />
          <Input label="Max Users Can Create" type="number" value={delegateForm.maxUsersCanCreate || ''} onChange={e => setDelegateForm(f => ({ ...f, maxUsersCanCreate: +e.target.value }))} />
          <div className="space-y-2">
            {['can_manage_users', 'can_create_users', 'can_reset_passwords', 'can_manage_profiles'].map(k => (
              <label key={k} className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input type="checkbox" checked={!!delegateForm[k]} onChange={e => setDelegateForm(f => ({ ...f, [k]: e.target.checked }))} className="rounded" />
                <span className="capitalize">{k.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </Page>
  )
      {/* Invite modal */}
      <Modal open={showInvite} onClose={() => { setShowInvite(false); setInviteForm({}) }} title="Invite Team Member"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowInvite(false); setInviteForm({}) }}>Cancel</Button>
            <Button onClick={async () => {
              if (!inviteForm.email || !inviteForm.role) return toast.error('Email and role required')
              try { await inviteUser(inviteForm); toast.success('Invitation sent'); setShowInvite(false); setInviteForm({}) }
              catch(e) { toast.error(e.message) }
            }}>Send Invite</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Email Address" required type="email" value={inviteForm.email || ''} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Name" value={inviteForm.name || ''} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Role" required value={inviteForm.role || ''} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
            <option value="">Select role</option>
            {['BU_ADMIN', 'RECRUITER', 'STUDENT'].map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </Select>
        </div>
      </Modal>

}
