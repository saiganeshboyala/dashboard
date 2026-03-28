import { Info, CheckCircle, AlertCircle, X } from 'lucide-react'

export function Alert({ type = 'info', children, onClose }) {
  const styles = {
    info:    { bg: 'bg-brand-50 border-brand-200',     text: 'text-brand-800',   icon: Info },
    success: { bg: 'bg-success-50 border-success-200', text: 'text-success-800', icon: CheckCircle },
    warn:    { bg: 'bg-warn-50 border-warn-200',       text: 'text-warn-800',    icon: AlertCircle },
    error:   { bg: 'bg-danger-50 border-danger-200',   text: 'text-danger-800',  icon: AlertCircle },
  }
  const s = styles[type] || styles.info
  const Icon = s.icon
  return (
    <div className={`${s.bg} border rounded-xl px-4 py-3 flex items-center gap-3 anim-fade`}>
      <Icon size={15} className={s.text} />
      <p className={`text-[13px] flex-1 ${s.text}`}>{children}</p>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
