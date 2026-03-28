import { useToast } from '../../context/ToastContext'
import { useState, useEffect } from 'react'
import { Page, DataTable, Loading, Badge, Button, Modal, Input, Select, Tabs } from '../../components/Shared'
import { getPaths, createPath, updatePath, createCourse, createLesson, addQuiz, getPath } from '../../utils/lmsApi'
import { Plus, BookOpen, Film, Brain, Trash2, ChevronRight } from 'lucide-react'

async function safe(fn) { try { return await fn() } catch (e) { console.warn(e); return null } }

export default function LMSAdminPage() {
  const [tab, setTab] = useState('paths')
  const [paths, setPaths] = useState([])
  const toast = useToast()
  const [selectedPath, setSelectedPath] = useState(null)
  const [pathDetail, setPathDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'path' | 'course' | 'lesson' | 'quiz'
  const [form, setForm] = useState({})
  useEffect(() => { loadPaths() }, [])

  async function loadPaths() {
    setLoading(true)
    const p = await safe(getPaths)
    setPaths(p?.paths || [])
    setLoading(false)
  }

  async function loadPathDetail(pathId) {
    setLoading(true)
    const p = await safe(() => getPath(pathId))
    setPathDetail(p?.path || null)
    setSelectedPath(pathId)
    setLoading(false)
  }

  async function handleCreate() {
    try {
      switch (modal) {
        case 'path':
          await createPath(form)
          toast.success('Path created!'); loadPaths(); break
        case 'course':
          await createCourse({ ...form, pathId: selectedPath })
          toast.success('Course created!'); loadPathDetail(selectedPath); break
        case 'lesson':
          await createLesson(form)
          toast.success('Lesson created!'); loadPathDetail(selectedPath); break
        case 'quiz':
          await addQuiz(form.lessonId, form)
          toast.success('Quiz added!'); loadPathDetail(selectedPath); break
      }
      setModal(null); setForm({})
    } catch (e) { toast.error(e.message) }
  }

  if (loading && !paths.length) return <Page title="LMS Admin"><Loading /></Page>

  // ═══ PATH DETAIL VIEW ═══
  if (selectedPath && pathDetail) {
    return (
      <Page title={pathDetail.title}
        subtitle={`${pathDetail.technology} · ${pathDetail.difficulty}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setSelectedPath(null); setPathDetail(null) }}>← Back</Button>
            <Button onClick={() => { setModal('course'); setForm({}) }}><Plus size={14} /> Add Course</Button>
          </div>
        }>
      <div className="space-y-4">
          {pathDetail.courses?.map((course, ci) => (
            <div key={course.id} className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Module {ci + 1}: {course.title}</h3>
                  {course.description && <p className="text-xs text-gray-500 mt-0.5">{course.description}</p>}
                </div>
                <Button size="sm" variant="secondary" onClick={() => { setModal('lesson'); setForm({ courseId: course.id }) }}>
                  <Plus size={12} /> Add Lesson
                </Button>
              </div>

              <div className="divide-y divide-gray-50">
                {course.lessons?.map((lesson, li) => (
                  <div key={lesson.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                      <Film size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                      <div className="flex gap-3 text-[11px] text-gray-400 mt-0.5">
                        <span>{lesson.videoType === 's3' ? '📦 S3' : '▶️ YouTube'}</span>
                        {lesson.duration && <span>{Math.floor(lesson.duration / 60)}m</span>}
                        <span>{lesson.quizzes?.length || lesson._count?.quizzes || 0} quizzes</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setModal('quiz'); setForm({ lessonId: lesson.id }) }}>
                      <Brain size={12} /> Add Quiz
                    </Button>
                  </div>
                ))}
                {(!course.lessons || course.lessons.length === 0) && (
                  <p className="px-5 py-4 text-sm text-gray-400">No lessons yet</p>
                )}
              </div>
            </div>
          ))}

          {(!pathDetail.courses || pathDetail.courses.length === 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No courses yet. Click "Add Course" to get started.
            </div>
          )}
        </div>

        {/* ═══ MODALS ═══ */}
        <Modal open={modal === 'course'} onClose={() => setModal(null)} title="Add Course">
          <div className="space-y-4 mb-6">
            <Input label="Title" placeholder="Core Java Fundamentals" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input label="Description" placeholder="OOP, Collections, Streams..." value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Input label="Sort order" type="number" value={form.sortOrder || ''} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleCreate}>Create Course</Button></div>
        </Modal>

        <Modal open={modal === 'lesson'} onClose={() => setModal(null)} title="Add Lesson">
          <div className="space-y-4 mb-6">
            <Input label="Title" placeholder="What is JVM?" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input label="Video URL (S3 or YouTube)" placeholder="https://your-bucket.s3.amazonaws.com/video.mp4" value={form.videoUrl || ''} onChange={e => setForm({ ...form, videoUrl: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Video type" value={form.videoType || 's3'} onChange={e => setForm({ ...form, videoType: e.target.value })}>
                <option value="s3">S3 Bucket</option>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </Select>
              <Input label="Duration (seconds)" type="number" placeholder="1200" value={form.duration || ''} onChange={e => setForm({ ...form, duration: e.target.value })} />
            </div>
            <Input label="Description (optional)" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleCreate}>Create Lesson</Button></div>
        </Modal>

        <Modal open={modal === 'quiz'} onClose={() => setModal(null)} title="Add Quiz Question" width="max-w-xl">
          <div className="space-y-4 mb-6">
            <Input label="Question" placeholder="What is encapsulation in Java?" value={form.question || ''} onChange={e => setForm({ ...form, question: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Option A" value={form.optionA || ''} onChange={e => setForm({ ...form, optionA: e.target.value })} />
              <Input label="Option B" value={form.optionB || ''} onChange={e => setForm({ ...form, optionB: e.target.value })} />
              <Input label="Option C (optional)" value={form.optionC || ''} onChange={e => setForm({ ...form, optionC: e.target.value })} />
              <Input label="Option D (optional)" value={form.optionD || ''} onChange={e => setForm({ ...form, optionD: e.target.value })} />
            </div>
            <Select label="Correct answer" value={form.correct || ''} onChange={e => setForm({ ...form, correct: e.target.value })}>
              <option value="">Select</option>
              <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleCreate}>Add Question</Button></div>
        </Modal>
      </Page>
    )
  }

  // ═══ PATHS LIST VIEW ═══
  return (
    <Page title="LMS Admin" subtitle="Manage training paths, courses, and lessons"
      actions={<Button onClick={() => { setModal('path'); setForm({}) }}><Plus size={14} /> Create Path</Button>}>
      <DataTable
        columns={[
          { key: 'title', label: 'Path', render: (v, r) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600"><BookOpen size={16} /></div>
              <div>
                <p className="font-medium text-gray-900">{v}</p>
                <p className="text-[11px] text-gray-400">{r.description?.slice(0, 60) || '—'}</p>
              </div>
            </div>
          )},
          { key: 'technology', label: 'Technology', render: v => <Badge color="blue">{v}</Badge> },
          { key: 'difficulty', label: 'Level', render: v => <Badge color={v === 'beginner' ? 'green' : v === 'intermediate' ? 'amber' : 'red'}>{v}</Badge> },
          { key: 'courses', label: 'Courses', render: v => v?.length || 0 },
          { key: 'courses_lessons', label: 'Lessons', render: (_, r) => r.courses?.reduce((a, c) => a + (c._count?.lessons || 0), 0) || 0 },
          { key: 'isActive', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge> },
        ]}
        rows={paths}
        onRowClick={(row) => loadPathDetail(row.id)}
      />

      {/* Create Path Modal */}
      <Modal open={modal === 'path'} onClose={() => setModal(null)} title="Create Training Path">
        <div className="space-y-4 mb-6">
          <Input label="Title" placeholder="Java Full Stack Developer" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input label="Description" placeholder="Complete training path..." value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Technology" placeholder="JAVA, PYTHON, DE, .NET" value={form.technology || ''} onChange={e => setForm({ ...form, technology: e.target.value })} />
            <Select label="Difficulty" value={form.difficulty || 'beginner'} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleCreate}>Create Path</Button></div>
      </Modal>
    </Page>
  )
}