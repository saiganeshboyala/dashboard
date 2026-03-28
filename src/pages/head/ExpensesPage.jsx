import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, StatCard } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getExpenses, createExpense, getExpenseRollup, getBUs } from '../../utils/api'
import { Plus, RefreshCw, DollarSign } from 'lucide-react'

const CATEGORIES = ['Travel', 'Software', 'Marketing', 'Training', 'Equipment', 'Meals', 'Other']

export default function ExpensesPage() {
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [rollup, setRollup] = useState(null)
  const [bus, setBus] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})
  const [buFilter, setBuFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const q = buFilter ? `buId=${buFilter}` : ''
      const [exp, roll, buData] = await Promise.all([
        getExpenses(q),
        getExpenseRollup().catch(() => null),
        getBUs(),
      ])
      setExpenses(Array.isArray(exp) ? exp : exp?.expenses || exp?.data || [])
      setRollup(roll)
      setBus(Array.isArray(buData) ? buData : buData?.data || [])
    } catch (e) { toast.error('Failed to load expenses') }
    setLoading(false)
  }

  useEffect(() => { load() }, [buFilter])

  const handleCreate = async () => {
    if (!form.description || !form.amount) return toast.error('Description and amount are required')
    setCreating(true)
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount) })
      toast.success('Expense added')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  return (
    <Page
      title="Expenses"
      subtitle="Track costs by business unit"
      actions={
        <div className="flex items-center gap-2">
          <Select value={buFilter} onChange={e => setBuFilter(e.target.value)} className="w-44">
            <option value="">All Business Units</option>
            {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Add Expense</Button>
        </div>
      }
    >
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Expenses" value={`$${totalAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`} icon="briefcase" color="brand" />
        <StatCard label="This Month"     value={rollup?.thisMonth ? `$${Number(rollup.thisMonth).toLocaleString()}` : '—'} icon="calendar" color="warn" />
        <StatCard label="Last Month"     value={rollup?.lastMonth ? `$${Number(rollup.lastMonth).toLocaleString()}` : '—'} icon="trending" color="gray" />
        <StatCard label="Budget Used"    value={rollup?.budgetUsedPct ? `${rollup.budgetUsedPct}%` : '—'} icon="chart" color={parseFloat(rollup?.budgetUsedPct) > 80 ? 'danger' : 'success'} />
      </div>

      <DataTable
        columns={[
          { key: 'description', label: 'Description', render: v => <span className="font-medium">{v}</span> },
          { key: 'category', label: 'Category', render: v => v ? <Badge color="blue">{v}</Badge> : '—' },
          { key: 'amount', label: 'Amount', render: v => <span className="font-mono tabular-nums font-semibold">${parseFloat(v || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span> },
          { key: 'bu', label: 'Business Unit', render: (v, r) => r.businessUnit?.name || r.buName || '—' },
          { key: 'submitted_by', label: 'Submitted By', render: (v, r) => r.submitter?.name || v || '—' },
          { key: 'status', label: 'Status', render: v => <Badge color={v === 'approved' ? 'green' : v === 'rejected' ? 'red' : 'amber'} dot>{v || 'pending'}</Badge> },
          { key: 'expense_date', label: 'Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
        ]}
        rows={expenses}
        loading={loading}
        emptyText="No expenses recorded"
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="Add Expense"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Add Expense</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Description" required value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="col-span-2" />
          <Input label="Amount ($)" required type="number" step="0.01" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Select label="Category" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select label="Business Unit" value={form.buId || ''} onChange={e => setForm(f => ({ ...f, buId: e.target.value }))}>
            <option value="">No BU</option>
            {bus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Input label="Expense Date" type="date" value={form.expenseDate || ''} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
          <Input label="Receipt URL" value={form.receiptUrl || ''} onChange={e => setForm(f => ({ ...f, receiptUrl: e.target.value }))} className="col-span-2" placeholder="https://..." />
        </div>
      </Modal>
    </Page>
  )
}
