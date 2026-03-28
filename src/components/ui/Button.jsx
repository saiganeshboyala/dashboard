import { Loader2 } from 'lucide-react'

export function Button({
  children, variant = 'primary', size = 'md', onClick,
  disabled, className = '', type = 'button', loading = false,
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none'
  const variants = {
    primary:   'bg-brand-600 text-white hover:bg-brand-700 shadow-sm active:bg-brand-800',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-card active:bg-gray-100',
    danger:    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
    ghost:     'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200',
    success:   'bg-success-600 text-white hover:bg-success-700',
    outline:   'border border-brand-300 text-brand-600 hover:bg-brand-50',
  }
  const sizes = {
    xs: 'px-2.5 py-1 text-[11px] gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-[13px] gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  )
}
