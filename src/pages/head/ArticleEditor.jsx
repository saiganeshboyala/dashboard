import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, Button, Input, Select, Loading } from '../../components/Shared'
import { getToken } from '../../utils/auth'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

async function api(p, o = {}) { const r = await fetch(p, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...o.headers } }); const j = await r.json(); return j.data || j }

export default function ArticleEditor() {
  const toast = useToast()
  const { id } = useParams(); const nav = useNavigate()
  const [form, setForm] = useState({ status: 'draft' })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(!!id)
  useEffect(() => { api('/api/v1/knowledge/kb/categories').then(r => setCategories(Array.isArray(r) ? r : r?.categories || [])).catch(() => {}) }, [])
  useEffect(() => { if (id) api(`/api/v1/knowledge/kb/articles/${id}`).then(setForm).finally(() => setLoading(false)) }, [id])

  const save = async () => {
    try {
      if (id) await api(`/api/v1/knowledge/kb/articles/${id}`, { method: 'PUT', body: JSON.stringify(form) })
      else await api('/api/v1/knowledge/kb/articles', { method: 'POST', body: JSON.stringify(form) })
      toast.success(id ? 'Article updated!' : 'Article created!'); setTimeout(() => nav('/head/knowledge'), 1000)
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return <Page title="Article"><Loading /></Page>

  return (
    <Page title={id ? 'Edit Article' : 'New Article'} actions={<Button variant="secondary" onClick={() => nav(-1)}><ArrowLeft size={14} /> Back</Button>}>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card max-w-3xl space-y-4">
        <Input label="Title" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
        <Input label="Summary" value={form.summary || ''} onChange={e => setForm({ ...form, summary: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category" value={form.categoryId || form.category_id || ''} onChange={e => setForm({ ...form, categoryId: parseInt(e.target.value) })}>
            <option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </Select>
        </div>
        <Input label="Tags (comma separated)" value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Body (HTML)</label>
          <textarea value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} rows={12}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 font-mono" />
        </div>
        <Button onClick={save}>Save Article</Button>
      </div>
    </Page>
  )
}
