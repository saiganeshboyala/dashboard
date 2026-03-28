import { AlertCircle } from 'lucide-react'

export function Input({ label, hint, error, required, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <input
        {...props}
        className={`field-input ${error ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100' : ''}`}
      />
      {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
      {error && (
        <p className="text-[11px] text-danger-600 mt-1 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  )
}

export function Textarea({ label, hint, error, required, rows = 4, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        {...props}
        className={`field-input resize-none ${error ? 'border-danger-300' : ''}`}
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-danger-600 mt-1">{error}</p>}
    </div>
  )
}

export function Select({ label, children, error, required, className = '', hint, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <select
        {...props}
        className={`field-input appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")] bg-[right_10px_center] bg-no-repeat pr-8 ${error ? 'border-danger-300' : ''}`}
      >
        {children}
      </select>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-danger-600 mt-1">{error}</p>}
    </div>
  )
}
