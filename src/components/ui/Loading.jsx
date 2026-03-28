/**
 * Loading — spinner with optional full-page centering.
 * Skeleton — single shimmer bar.
 * SkeletonTable — shimmer rows that mimic a data table.
 * SkeletonCards — shimmer grid that mimics stat cards.
 */

export function Loading({ text = 'Loading...', fullPage = false }) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="w-8 h-8 border-[2.5px] border-gray-100 border-t-brand-500 rounded-full animate-spin" />
      <p className="text-[12px] text-gray-400">{text}</p>
    </div>
  )
  if (fullPage) return (
    <div className="ml-[220px] min-h-screen flex items-center justify-center">{inner}</div>
  )
  return inner
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} />
}

/**
 * SkeletonTable — shimmer rows that mimic a data table loading state.
 *
 * Props:
 *   rows  number — data rows to show (default 6)
 *   cols  number — columns to show  (default 5)
 */
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Fake header */}
      <div className="flex gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 rounded" style={{ width: `${55 + (i % 3) * 22}px`, opacity: 0.6 }} />
        ))}
      </div>
      {/* Fake rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 px-4 py-3 border-b border-gray-50 last:border-b-0"
          style={{ opacity: 1 - ri * 0.1 }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <div key={ci} className="skeleton h-3.5 rounded flex-1" style={{ maxWidth: `${80 + (ci * 28) % 130}px` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * SkeletonCards — shimmer grid mimicking stat cards loading.
 *
 * Props:
 *   count  number — cards to show (default 4)
 */
export function SkeletonCards({ count = 4 }) {
  const gridCols = count <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
                   count <= 3 ? 'grid-cols-1 sm:grid-cols-3' :
                                'grid-cols-2 md:grid-cols-4'
  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
          style={{ opacity: 1 - i * 0.08 }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="skeleton h-2.5 w-20 rounded mb-3" />
              <div className="skeleton h-7 w-14 rounded mb-2.5" />
              <div className="skeleton h-2 w-28 rounded" />
            </div>
            <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
