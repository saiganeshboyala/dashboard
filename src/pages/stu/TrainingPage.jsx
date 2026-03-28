import { useToast } from '../../context/ToastContext'
import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Loading } from '../../components/Shared'
import { getKBArticles } from '../../utils/api'
import { BookOpen, ExternalLink } from 'lucide-react'

export default function TrainingPage() {
  const toast = useToast()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getKBArticles('status=published').then(d => setArticles(Array.isArray(d) ? d : d?.articles || [])).finally(() => setLoading(false)) }, [])
  return (
    <Page title="Training & Resources" subtitle="Learning materials and guides">
      <DataTable columns={[
        { key: 'title', label: 'Article', render: v => (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><BookOpen size={13} className="text-amber-600" /></div>
            <span className="font-medium">{v}</span>
          </div>
        )},
        { key: 'category', label: 'Category' },
        { key: 'view_count', label: 'Views', render: v => <span className="tabular-nums">{v || 0}</span> },
        { key: 'updated_at', label: 'Updated', render: v => v ? new Date(v).toLocaleDateString() : '—' },
      ]} rows={articles} loading={loading} emptyText="No training materials available yet" />
    </Page>
  )
}
