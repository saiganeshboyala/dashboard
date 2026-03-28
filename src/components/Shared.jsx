/**
 * Shared.jsx — backward-compatible barrel.
 *
 * All components have been moved to their own files:
 *   - UI primitives  → components/ui/  (Button, Badge, Modal, Input, ...)
 *   - Layout shells  → components/layout/  (Sidebar, ErrorBoundary)
 *
 * Existing imports like:
 *   import { DataTable, Badge, Button, Sidebar, ErrorBoundary } from './Shared'
 * continue to work unchanged.
 */

export * from './ui'
export { Sidebar }       from './layout/Sidebar'
export { ErrorBoundary } from './layout/ErrorBoundary'
