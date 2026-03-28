import { useState, useEffect } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Textarea, Tabs } from '../../components/Shared'
import { useToast } from '../../context/ToastContext'
import { getKBArticles, getKBCategories, createKBArticle, voteKBArticle } from '../../utils/api'
import { Plus, RefreshCw, ThumbsUp, ThumbsDown, BookOpen } from 'lucide-react'

export default function KnowledgeBasePage() {
  const toast = useToast()
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('published')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [aData, cData] = await Promise.all([getKBArticles(`status=${tab}`), getKBCategories()])
      setArticles(Array.isArray(aData) ? aData : aData?.articles || aData?.data || [])
      setCategories(Array.isArray(cData) ? cData : cData?.categories || [])
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const handleCreate = async () => {
    if (!form.title) return toast.error('Title is required')
    setCreating(true)
    try {
      await createKBArticle({ ...form, status: 'draft' })
      toast.success('Article created')
      setShowCreate(false); setForm({}); load()
    } catch (e) { toast.error(e.message) }
    setCreating(false)
  }

  const handleVote = async (id, helpful) => {
    try { await voteKBArticle(id, { helpful }); toast.success('Feedback recorded'); load() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <Page title="Knowledge Base" subtitle="Documentation and support articles"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> New Article</Button>
        </div>
      }>
      <Tabs active={tab} onChange={t => { setTab(t); setLoading(true) }} tabs={[
        { id: 'published', label: 'Published' },
        { id: 'draft',     label: 'Drafts' },
        { id: 'archived',  label: 'Archived' },
      ]} />

      <div className="mt-4">
        <DataTable
          columns={[
            { key: 'title', label: 'Article', render: v => (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><BookOpen size={13} className="text-amber-600" /></div>
                <span className="font-medium">{v}</span>
              </div>
            )},
            { key: 'category', label: 'Category', render: (v, r) => r.categoryName || v || '—' },
            { key: 'status', label: 'Status', render: v => <Badge color={v === 'published' ? 'green' : v === 'draft' ? 'amber' : 'gray'} dot>{v}</Badge> },
            { key: 'view_count', label: 'Views', render: v => <span className="tabular-nums">{v || 0}</span> },
            { key: 'helpful_count', label: 'Helpful', render: (v, r) => (
              <div className="flex items-center gap-2">
                <span className="text-success-600 text-[11px]">👍 {r.helpful_count || 0}</span>
                <span className="text-danger-600 text-[11px]">👎 {r.not_helpful_count || 0}</span>
              </div>
            )},
            { key: 'updated_at', label: 'Updated', render: v => v ? new Date(v).toLocaleDateString() : '—' },
            { key: 'actions', label: '', sortable: false, render: (_, r) => r.status === 'published' ? (
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleVote(r.id, true)} className="p-1 text-gray-300 hover:text-success-500 transition-colors"><ThumbsUp size={12} /></button>
                <button onClick={() => handleVote(r.id, false)} className="p-1 text-gray-300 hover:text-danger-500 transition-colors"><ThumbsDown size={12} /></button>
              </div>
            ) : null },
          ]}
          rows={articles}
          loading={loading}
          emptyText="No articles in this category"
        />
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm({}) }} title="New Article" width="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setForm({}) }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Save as Draft</Button>
          </div>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Title" required value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="col-span-2" />
          <Select label="Category" value={form.categoryId || ''} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Summary" value={form.summary || ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          <Textarea label="Body" value={form.body || ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="col-span-2" rows={6}
            hint="Supports basic HTML" />
        </div>
      </Modal>
    </Page>
  )
}
