import { useState, useEffect } from 'react'
import { Page, StatCard, DataTable, Badge, Button, Modal, Select, Loading, Alert } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getBillingSubscription, getBillingInvoices, getBillingPlans, createOrder, verifyPayment, get, post } from '../../utils/api'
import { CreditCard, CheckCircle, Zap, RefreshCw, AlertTriangle, Clock, Users, Database } from 'lucide-react'

export default function BillingPage() {
  const toast = useToast()
  const [sub, setSub] = useState(null)
  const [usage, setUsage] = useState(null)
  const [daysRemaining, setDaysRemaining] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [plans, setPlans] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [subData, invData, planData, payData] = await Promise.all([
        getBillingSubscription().catch(() => null),
        getBillingInvoices().catch(() => ({ invoices: [] })),
        getBillingPlans().catch(() => ({ plans: [] })),
        get('/api/v1/billing/payments').catch(() => ({ payments: [] })),
      ])

      // Subscription — response is { subscription, usage, daysRemaining }
      const subscription = subData?.subscription || subData
      setSub(subscription)
      setUsage(subData?.usage || null)
      setDaysRemaining(subData?.daysRemaining ?? null)

      // Invoices
      const invArr = Array.isArray(invData) ? invData : invData?.invoices || []
      setInvoices(invArr)

      // Plans
      const planArr = Array.isArray(planData) ? planData : planData?.plans || []
      setPlans(planArr)

      // Payments
      const payArr = Array.isArray(payData) ? payData : payData?.payments || []
      setPayments(payArr)
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleUpgrade = async () => {
    if (!selectedPlan) return toast.error('Select a plan')
    setUpgrading(true)
    try {
      const order = await createOrder({ planName: selectedPlan })
      if (order?.orderId && order?.keyId) {
        // Open Razorpay checkout
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Fyxo CRM',
          description: `Upgrade to ${order.plan?.label || selectedPlan}`,
          order_id: order.orderId,
          prefill: order.prefill || {},
          handler: async (response) => {
            try {
              await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planName: selectedPlan,
              })
              toast.success('Payment verified! Plan upgraded successfully.')
              setShowUpgrade(false); setSelectedPlan('')
              load()
            } catch (e) { toast.error(e.message || 'Payment verification failed') }
          },
          theme: { color: '#6366f1' },
        }
        if (window.Razorpay) {
          const rzp = new window.Razorpay(options)
          rzp.open()
        } else {
          toast.error('Payment gateway not loaded. Please refresh and try again.')
        }
      } else {
        toast.success('Order created')
        setShowUpgrade(false)
      }
    } catch (e) { toast.error(e.message) }
    setUpgrading(false)
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await post('/api/v1/billing/cancel', {})
      toast.success('Subscription will be cancelled at the end of the billing period')
      load()
    } catch (e) { toast.error(e.message) }
    setCancelling(false)
  }

  const handleReactivate = async () => {
    try {
      await post('/api/v1/billing/reactivate', {})
      toast.success('Subscription reactivated')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const planColors = { free: 'gray', starter: 'green', pro: 'purple', enterprise: 'amber' }

  if (loading) return <Page title="Billing"><Loading /></Page>

  const currentPlanName = sub?.planName || sub?.plan_name || 'free'
  const currentPlanLabel = sub?.planLabel || sub?.plan_label || 'Free'
  const subStatus = sub?.status || 'free'

  return (
    <Page title="Billing" subtitle="Subscription and payment management"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowUpgrade(true)}><Zap size={13} /> Change Plan</Button>
        </div>
      }>

      {/* Current subscription summary */}
      <div className="card p-6 mb-6">
        <h3 className="text-[13px] font-bold text-gray-900 mb-4">Current Subscription</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Plan" value={currentPlanLabel} icon="briefcase" color="brand" />
          <StatCard label="Status" value={
            <Badge color={subStatus === 'active' ? 'green' : subStatus === 'trialing' ? 'blue' : subStatus === 'past_due' ? 'amber' : 'gray'} dot>
              {subStatus}
            </Badge>
          } icon="chart" color="success" />
          <StatCard label="Days Remaining" value={daysRemaining != null ? daysRemaining : '—'} icon="calendar" color="gray" />
          <StatCard label="Users" value={`${usage?.current_users ?? '—'} / ${sub?.maxUsers || sub?.max_users || '∞'}`} icon="users" color="warn" />
        </div>

        {sub?.cancelAtPeriodEnd && (
          <Alert type="warning" className="mt-4">
            Your subscription will be cancelled at the end of the current period ({sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}).
            <Button variant="secondary" size="sm" className="ml-3" onClick={handleReactivate}>Reactivate</Button>
          </Alert>
        )}

        {daysRemaining != null && daysRemaining <= 7 && daysRemaining > 0 && !sub?.cancelAtPeriodEnd && (
          <Alert type="warning" className="mt-4">
            <AlertTriangle size={13} className="inline mr-1" />
            Your subscription renews in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
          </Alert>
        )}
      </div>

      {/* Usage */}
      {usage && (
        <div className="card p-6 mb-6">
          <h3 className="text-[13px] font-bold text-gray-900 mb-4">Usage</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Users size={16} className="text-brand-500" />
              <div>
                <p className="text-[11px] text-gray-500">Users</p>
                <p className="text-[15px] font-bold">{usage.current_users ?? 0} <span className="text-[11px] text-gray-400 font-normal">/ {sub?.maxUsers || sub?.max_users || '∞'}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Database size={16} className="text-success-500" />
              <div>
                <p className="text-[11px] text-gray-500">Records</p>
                <p className="text-[15px] font-bold">{(usage.current_records ?? 0).toLocaleString()} <span className="text-[11px] text-gray-400 font-normal">/ {sub?.maxRecords || sub?.max_records ? (sub?.maxRecords || sub?.max_records).toLocaleString() : '∞'}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Clock size={16} className="text-warn-500" />
              <div>
                <p className="text-[11px] text-gray-500">Period</p>
                <p className="text-[13px] font-medium">
                  {sub?.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : '—'}
                  {' → '}
                  {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans comparison */}
      {plans.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-bold text-gray-900 mb-4">Available Plans</h3>
          <div className="grid grid-cols-4 gap-4">
            {plans.map(plan => {
              const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (Array.isArray(plan.features) ? plan.features : [])
              const isCurrent = currentPlanName === plan.name
              return (
                <div key={plan.id || plan.name} className={`card p-5 transition-all ${isCurrent ? 'ring-2 ring-brand-500 bg-brand-50/30' : 'hover:shadow-md'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900">{plan.label || plan.name}</h4>
                    {isCurrent && <Badge color="blue">Current</Badge>}
                  </div>
                  <p className="text-[20px] font-bold text-gray-900 mb-1">
                    {plan.priceDisplay || (plan.priceInr > 0 ? `₹${(plan.priceInr / 100).toLocaleString()}` : 'Free')}
                  </p>
                  <div className="text-[11px] text-gray-400 mb-3 space-y-0.5">
                    <p>Up to {plan.maxUsers || plan.max_users} users</p>
                    <p>Up to {(plan.maxRecords || plan.max_records || 0).toLocaleString()} records</p>
                  </div>
                  {features.length > 0 && features.slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-1">
                      <CheckCircle size={10} className="text-success-500 shrink-0" />
                      {f.replace(/_/g, ' ')}
                    </div>
                  ))}
                  {!isCurrent && plan.priceInr > 0 && (
                    <Button size="sm" variant="secondary" className="w-full mt-3" onClick={() => { setSelectedPlan(plan.name); setShowUpgrade(true) }}>
                      {plans.findIndex(p => p.name === currentPlanName) < plans.findIndex(p => p.name === plan.name) ? 'Upgrade' : 'Switch'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-bold text-gray-900 mb-3">Invoices</h3>
          <DataTable
            searchable={false}
            columns={[
              { key: 'id', label: 'Invoice', render: v => <span className="font-mono text-[11px] font-medium">#{v}</span> },
              { key: 'description', label: 'Description' },
              { key: 'amountDisplay', label: 'Amount', render: (v, r) => <span className="font-mono tabular-nums font-medium">{v || `₹${((r.amount || 0) / 100).toLocaleString()}`}</span> },
              { key: 'status', label: 'Status', render: v => <Badge color={v === 'paid' ? 'green' : v === 'open' ? 'amber' : 'red'} dot>{v || 'pending'}</Badge> },
              { key: 'createdAt', label: 'Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
            ]}
            rows={invoices}
          />
        </div>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-900">Payment History</h3>
            {subStatus === 'active' && !sub?.cancelAtPeriodEnd && (
              <Button variant="danger" size="sm" loading={cancelling} onClick={handleCancel}>
                Cancel Subscription
              </Button>
            )}
          </div>
          <DataTable
            searchable={false}
            columns={[
              { key: 'razorpayPaymentId', label: 'Payment ID', render: v => <span className="font-mono text-[11px]">{v || '—'}</span> },
              { key: 'amount', label: 'Amount', render: v => v != null ? <span className="font-mono tabular-nums font-medium">₹{(v / 100).toLocaleString()}</span> : '—' },
              { key: 'method', label: 'Method', render: v => v ? <Badge color="gray">{v}</Badge> : '—' },
              { key: 'status', label: 'Status', render: v => <Badge color={v === 'captured' ? 'green' : v === 'failed' ? 'red' : 'amber'} dot>{v}</Badge> },
              { key: 'createdAt', label: 'Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
            ]}
            rows={payments}
          />
        </div>
      )}

      {/* No billing data at all */}
      {!sub && invoices.length === 0 && payments.length === 0 && plans.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <CreditCard size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No billing data yet. You are on the Free plan.</p>
          <Button size="sm" className="mt-3" onClick={() => setShowUpgrade(true)}><Zap size={13} /> Explore Plans</Button>
        </div>
      )}

      {/* Upgrade modal */}
      <Modal open={showUpgrade} onClose={() => { setShowUpgrade(false); setSelectedPlan('') }} title="Change Plan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowUpgrade(false); setSelectedPlan('') }}>Cancel</Button>
            <Button onClick={handleUpgrade} loading={upgrading}><Zap size={13} /> Proceed to Payment</Button>
          </div>
        }>
        <Select label="Select Plan" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
          <option value="">Choose a plan...</option>
          {plans.filter(p => p.name !== currentPlanName && (p.priceInr > 0 || p.price_inr > 0)).map(p => (
            <option key={p.id || p.name} value={p.name}>
              {p.label || p.name} — {p.priceDisplay || `₹${((p.priceInr || p.price_inr || 0) / 100).toLocaleString()}/mo`}
            </option>
          ))}
        </Select>
        {selectedPlan && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-[12px] text-gray-600">
            {(() => {
              const plan = plans.find(p => p.name === selectedPlan)
              if (!plan) return null
              return (
                <>
                  <p className="font-medium text-gray-900 mb-1">{plan.label || plan.name}</p>
                  <p>Up to {plan.maxUsers || plan.max_users} users, {(plan.maxRecords || plan.max_records || 0).toLocaleString()} records</p>
                  <p className="font-bold mt-1">{plan.priceDisplay || `₹${((plan.priceInr || plan.price_inr || 0) / 100).toLocaleString()}/mo`}</p>
                </>
              )
            })()}
          </div>
        )}
      </Modal>
    </Page>
  )
}
