import { useState, useEffect } from 'react'
import { DataTable, Badge, Button, Loading } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getFeatureFlags, updateFeatureFlag, enableFlagForTenant } from '../../utils/api'
import { RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'

export default function FeatureFlagsPage() {
  const toast = useToast()
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getFeatureFlags()
      setFlags(Array.isArray(data) ? data : data?.flags || data?.data || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = async (flag) => {
    try {
      await updateFeatureFlag(flag.flag_name || flag.name, { enabled: !flag.enabled })
      toast.success(`Flag ${flag.enabled ? 'disabled' : 'enabled'}`)
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /> Refresh</Button>
      </div>
      <DataTable
        columns={[
          { key: 'flag_name', label: 'Flag', render: v => <span className="font-mono text-[12px] font-medium">{v}</span> },
          { key: 'description', label: 'Description' },
          { key: 'enabled', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Enabled' : 'Disabled'}</Badge> },
          { key: 'rollout_pct', label: 'Rollout', render: v => v != null ? `${v}%` : 'All' },
          { key: 'actions', label: '', sortable: false, render: (_, r) => (
            <button onClick={() => toggle(r)} className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${r.enabled ? 'text-success-600 hover:text-danger-600' : 'text-gray-400 hover:text-success-600'}`}>
              {r.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {r.enabled ? 'Disable' : 'Enable'}
            </button>
          )},
        ]}
        rows={flags}
        loading={loading}
        emptyText="No feature flags"
      />
    </div>
  )
}
