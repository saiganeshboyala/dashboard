export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
            active === t.id
              ? 'bg-white text-gray-900 shadow-card'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
          {t.count != null && (
            <span className="ml-1.5 text-[10px] text-gray-400 tabular-nums">({t.count})</span>
          )}
        </button>
      ))}
    </div>
  )
}
