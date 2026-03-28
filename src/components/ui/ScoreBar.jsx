export function ScoreBar({ label, value, max = 100, showPct = false }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color = pct >= 70 ? 'bg-success-500' : pct >= 40 ? 'bg-warn-500' : 'bg-danger-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-gray-500 w-28 text-right shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono font-semibold text-gray-700 w-10 text-right tabular-nums">
        {showPct ? `${Math.round(pct)}%` : value}
      </span>
    </div>
  )
}
