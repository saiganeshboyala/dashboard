/**
 * Services barrel — re-exports everything so pages can:
 *   import { getStudents, getOverview } from '../services'
 * or stay on the old path:
 *   import { getStudents } from '../utils/api'   ← still works (api.js re-exports from here)
 */

export * from './api'
export * from './students.api'
export * from './analytics.api'
export * from './schema.api'
export * from './profiles.api'
export * from './admin.api'

// Remaining domain exports (kept in utils/api.js which re-exports all of this)
