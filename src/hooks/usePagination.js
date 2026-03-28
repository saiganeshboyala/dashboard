import { useState, useMemo } from 'react'

/**
 * Server-side pagination state manager.
 *
 * Usage:
 *   const pg = usePagination({ total: 500, pageSize: 20 })
 *   // pg.page, pg.offset, pg.totalPages, pg.nextPage(), ...
 */
export function usePagination({ total = 0, pageSize = 20 } = {}) {
  const [page, setPage] = useState(1)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const offset     = (page - 1) * pageSize

  function goTo(n) { setPage(Math.min(Math.max(1, n), totalPages)) }

  return {
    page,
    setPage:   goTo,
    pageSize,
    offset,
    totalPages,
    nextPage:  () => goTo(page + 1),
    prevPage:  () => goTo(page - 1),
    firstPage: () => goTo(1),
    lastPage:  () => goTo(totalPages),
    hasNext:   page < totalPages,
    hasPrev:   page > 1,
  }
}
