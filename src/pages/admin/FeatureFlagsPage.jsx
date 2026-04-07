import { useState, useEffect } from 'react'
import { DataTable, Badge, Button, Loading } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getFeatureFlags, updateFeatureFlag } from '../../utils/api'
import { RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'

export default function FeatureFlagsPage() {
  const toast = useToast()
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getFeatureFlags()
      const raw = Array.isArray(data) ? data : data?.flags || data?.data || []
      setFlags(raw.map(f => ({
        ...f,
        _name: f.name || f.flag_name,
        _enabled: f.defaultEnabled ?? f.default_enabled ?? f.enabled ?? false,
        _isGlobal: f.isGlobal ?? f.is_global ?? false,
      })))
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = async (flag) => {
    try {
      await updateFeatureFlag(flag._name, { defaultEnabled: !flag._enabled })
      toast.success(`Flag ${flag._enabled ? 'disabled' : 'enabled'}`)
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
          { key: '_name', label: 'Flag', render: v => <span className="font-mono text-[12px] font-medium">{v}</span> },
          { key: '_isGlobal', label: 'Scope', render: v => <Badge color={v ? 'purple' : 'gray'}>{v ? 'Global' : 'Per-tenant'}</Badge> },
          { key: '_enabled', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Enabled' : 'Disabled'}</Badge> },
          { key: 'actions', label: '', sortable: false, render: (_, r) => (
            <button onClick={() => toggle(r)} className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${r._enabled ? 'text-success-600 hover:text-danger-600' : 'text-gray-400 hover:text-success-600'}`}>
              {r._enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {r._enabled ? 'Disable' : 'Enable'}
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
