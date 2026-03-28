import { useState, useEffect } from 'react'
import { DataTable, Badge, Button, Modal, Input, Select } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getAdminTeam } from '../../utils/api'
import { Plus, RefreshCw } from 'lucide-react'

export default function TeamPage() {
  const toast = useToast()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAdminTeam()
      setTeam(Array.isArray(data) ? data : data?.team || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name', render: (v, r) => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[11px] font-bold">{(v||'?')[0].toUpperCase()}</div>
              <div><p className="font-medium text-[13px]">{v}</p><p className="text-[11px] text-gray-400">{r.email}</p></div>
            </div>
          )},
          { key: 'role', label: 'Role', render: v => <Badge color={v === 'super_admin' ? 'red' : 'blue'}>{v}</Badge> },
          { key: 'is_active', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'} dot>{v ? 'Active' : 'Inactive'}</Badge> },
          { key: 'last_login', label: 'Last Login', render: v => v ? new Date(v).toLocaleDateString() : 'Never' },
        ]}
        rows={team}
        loading={loading}
        emptyText="No team members"
      />
    </div>
  )
}
