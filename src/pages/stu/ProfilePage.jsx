import { useState, useEffect } from 'react'
import { Page, Input, Select, Button, Loading, Badge, statusBadgeColor } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getMe, updateStudent } from '../../utils/api'
import { getUser } from '../../utils/auth'
import { Save } from 'lucide-react'

export default function ProfilePage() {
  const toast = useToast()
  const user = getUser()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMe().then(d => setProfile(d?.student || d)).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!profile?.id) return
    setSaving(true)
    try { await updateStudent(profile.id, profile); toast.success('Profile updated') }
    catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <Page title="Profile"><Loading /></Page>

  return (
    <Page title="My Profile" subtitle="Update your personal information">
      <div className="max-w-xl card p-6 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold">
            {(user?.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">{user?.name}</p>
            <p className="text-[12px] text-gray-400">{user?.email}</p>
            {profile?.marketingStatus && <Badge color={statusBadgeColor(profile.marketingStatus)} dot className="mt-1">{profile.marketingStatus}</Badge>}
          </div>
        </div>

        {profile && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={profile.firstName || ''} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
              <Input label="Last Name" value={profile.lastName || ''} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
            </div>
            <Input label="Phone" value={profile.phone || ''} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            <Input label="LinkedIn URL" value={profile.linkedIn || ''} onChange={e => setProfile(p => ({ ...p, linkedIn: e.target.value }))} />
            <Input label="GitHub URL" value={profile.github || ''} onChange={e => setProfile(p => ({ ...p, github: e.target.value }))} />
            <Button onClick={handleSave} loading={saving}><Save size={13} /> Save Changes</Button>
          </>
        )}
      </div>
    </Page>
  )
}
