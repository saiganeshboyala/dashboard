import { useState, useEffect } from 'react'
import { Page, StatCard, DataTable, Badge, Button, Modal, Select, Loading, Alert, ConfirmDialog } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getBillingSubscription, getBillingInvoices, getBillingPlans, createOrder, get, post } from '../../utils/api'
import { CreditCard, CheckCircle, Calendar, Zap, RefreshCw } from 'lucide-react'

export default function BillingPage() {
  const toast = useToast()
  const [sub, setSub] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [payments, setPayments] = useState([])
  const [cancelling, setCancelling] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [subData, invData, planData, payData] = await Promise.all([
        getBillingSubscription().catch(() => null),
        getBillingInvoices().catch(() => []),
        getBillingPlans().catch(() =>
          // Fallback to tenants/plans
          fetch('/api/v1/tenants/plans', { headers: { Authorization: `Bearer ${getToken()}` } })
            .then(r => r.json()).then(d => d.plans || d.data || d).catch(() => [])
        ),
        get('/api/v1/billing/payments').catch(() => []),
      ])
      setSub(subData)
      setInvoices(Array.isArray(invData) ? invData : invData?.invoices || [])
      setPlans(Array.isArray(planData) ? planData : planData?.plans || [])
      setPayments(Array.isArray(payData) ? payData : payData?.payments || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleUpgrade = async () => {
    if (!selectedPlan) return toast.error('Select a plan')
    setUpgrading(true)
    try {
      const order = await createOrder({ planId: selectedPlan })
      toast.success('Order created — complete payment to upgrade')
      setShowUpgrade(false)
    } catch (e) { toast.error(e.message) }
    setUpgrading(false)
  }

  const planColors = { free: 'gray', starter: 'blue', pro: 'purple', enterprise: 'amber' }

  if (loading) return <Page title="Billing"><Loading /></Page>

  return (
    <Page title="Billing" subtitle="Subscription and payment management"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowUpgrade(true)}><Zap size={13} /> Upgrade Plan</Button>
        </div>
      }>
      {/* Current subscription */}
      {sub && (
        <div className="card p-6 mb-6">
          <h3 className="text-[13px] font-bold text-gray-900 mb-4">Current Subscription</h3>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Plan" value={sub.plan?.name || sub.planName || 'Free'} icon="briefcase" color="brand" />
            <StatCard label="Status" value={<Badge color={sub.status === 'active' ? 'green' : 'red'} dot>{sub.status || 'inactive'}</Badge>} icon="chart" color="success" />
            <StatCard label="Next Billing" value={sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'} icon="calendar" color="gray" />
            <StatCard label="Seats Used" value={`${sub.seatsUsed || 0} / ${sub.seatsTotal || '∞'}`} icon="users" color="warn" />
          </div>
          {sub.status === 'trialing' && (
            <Alert type="info" className="mt-4">
              Trial ends on {new Date(sub.trial_end).toLocaleDateString()}. Upgrade now to avoid service interruption.
            </Alert>
          )}
        </div>
      )}

      {/* Plans overview */}
      {plans.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {plans.map(plan => (
            <div key={plan.id} className={`card p-5 ${sub?.planName === plan.name ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-900">{plan.name}</h4>
                {sub?.planName === plan.name && <Badge color="blue">Current</Badge>}
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                ${plan.price}<span className="text-[12px] text-gray-400 font-normal">/mo</span>
              </p>
              <p className="text-[11px] text-gray-400 mb-3">{plan.description}</p>
              {plan.features?.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[12px] text-gray-600 mb-1">
                  <CheckCircle size={11} className="text-success-500 shrink-0" /> {f}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Invoices */}
      <DataTable
        columns={[
          { key: 'invoice_number', label: 'Invoice', render: v => <span className="font-mono text-[12px] font-medium">{v || '—'}</span> },
          { key: 'amount', label: 'Amount', render: v => v != null ? <span className="font-mono tabular-nums">${(v / 100).toFixed(2)}</span> : '—' },
          { key: 'status', label: 'Status', render: v => <Badge color={v === 'paid' ? 'green' : v === 'open' ? 'amber' : 'red'} dot>{v || 'pending'}</Badge> },
          { key: 'created', label: 'Date', render: v => v ? new Date(v * 1000 || v).toLocaleDateString() : '—' },
          { key: 'hosted_invoice_url', label: '', sortable: false, render: v => v ? (
            <a href={v} target="_blank" rel="noreferrer" className="text-[12px] text-brand-600 hover:underline">View PDF</a>
          ) : null },
        ]}
        rows={invoices}
        emptyText="No invoices yet"
      />

      {/* Payments */}
      {payments.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-900">Payment History</h3>
            {sub?.status === 'active' && (
              <Button variant="danger" size="sm" loading={cancelling} onClick={async () => {
                    setCancelling(true)
                try { await get('/api/v1/billing/cancel').catch(() => post('/api/v1/billing/cancel', {})); toast.success('Subscription cancelled'); load() }
                catch (e) { toast.error(e.message) }
                setCancelling(false)
              }}>Cancel Subscription</Button>
            )}
          </div>
          <DataTable columns={[
            { key: 'id', label: 'Payment ID', render: v => <span className="font-mono text-[11px]">{v}</span> },
            { key: 'amount', label: 'Amount', render: v => v != null ? <span className="font-mono tabular-nums">${(v/100).toFixed(2)}</span> : '—' },
            { key: 'status', label: 'Status', render: v => <Badge color={v === 'succeeded' ? 'green' : 'red'} dot>{v}</Badge> },
            { key: 'created', label: 'Date', render: v => v ? new Date(v * 1000 || v).toLocaleDateString() : '—' },
          ]} rows={payments} />
        </div>
      )}
      <Modal open={showUpgrade} onClose={() => setShowUpgrade(false)} title="Upgrade Plan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowUpgrade(false)}>Cancel</Button>
            <Button onClick={handleUpgrade} loading={upgrading}><Zap size={13} /> Upgrade</Button>
          </div>
        }>
        <Select label="Select Plan" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
          <option value="">Choose a plan...</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}/mo</option>)}
        </Select>
      </Modal>
    </Page>
  )
}
