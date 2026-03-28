import { ArrowUp, ArrowDown } from 'lucide-react'
import { ICONS } from '../../lib/icons'

export function StatCard({ label, value, sub, trend, icon, color = 'brand' }) {
  const Icon = ICONS[icon] || null
  const colorMap = {
    brand:   'bg-brand-50 text-brand-600',
    success: 'bg-success-50 text-success-600',
    warn:    'bg-warn-50 text-warn-600',
    danger:  'bg-danger-50 text-danger-600',
    gray:    'bg-gray-100 text-gray-500',
    purple:  'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card p-5 hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-[26px] font-bold text-gray-900 mt-1.5 leading-none tabular-nums">{value ?? '—'}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
          {trend != null && (
            <p className={`text-[11px] font-semibold mt-1.5 flex items-center gap-1 ${trend >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(trend)}% vs last week
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
    </div>
  )
}
