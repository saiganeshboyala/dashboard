import { getToken } from './auth'
const L = '/api/lms'
async function r(p, o = {}) { const res = await fetch(`${L}${p}`, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...o.headers } }); if (!res.ok) throw new Error(await res.text()); return res.json() }
export const getPaths = (t) => r(`/paths${t ? `?technology=${t}` : ''}`)
export const getPath = (id) => r(`/paths/${id}`)
export const getPathProgress = (id) => r(`/paths/${id}/progress`)
export const createPath = (d) => r('/paths', { method: 'POST', body: JSON.stringify(d) })
export const updatePath = (id, d) => r(`/paths/${id}`, { method: 'PUT', body: JSON.stringify(d) })
export const createCourse = (d) => r('/courses', { method: 'POST', body: JSON.stringify(d) })
export const createLesson = (d) => r('/lessons', { method: 'POST', body: JSON.stringify(d) })
export const getLesson = (id) => r(`/lessons/${id}`)
export const markWatched = (id, pos, done) => r(`/lessons/${id}/progress`, { method: 'POST', body: JSON.stringify({ position: pos, completed: done }) })
export const addQuiz = (lid, d) => r(`/lessons/${lid}/quiz`, { method: 'POST', body: JSON.stringify(d) })
export const submitQuiz = (qid, a) => r(`/quiz/${qid}/submit`, { method: 'POST', body: JSON.stringify({ answer: a }) })
export const getMyProgress = () => r('/my-progress')
