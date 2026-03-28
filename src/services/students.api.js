import { get, post, put, del } from './api'

export const getStudents        = (q = '') => get(`/api/v1/students?${q}`).then(r => ({
  students: Array.isArray(r) ? r : r?.students || r?.data || [],
  total:    r?.total || r?.meta?.total || 0,
}))
export const getStudent         = (id)     => get(`/api/v1/students/${id}`)
export const createStudent      = (d)      => post('/api/v1/students', d)
export const updateStudent      = (id, d)  => put(`/api/v1/students/${id}`, d)
export const deleteStudent      = (id)     => del(`/api/v1/students/${id}`)
export const assignStudent      = (id, d)  => put(`/api/v1/students/${id}/assign`, d)
export const bulkAssignStudents = (d)      => post('/api/v1/students/bulk-assign', d)
export const bulkDeleteStudents = (d)      => post('/api/v1/students/bulk-delete', d)
