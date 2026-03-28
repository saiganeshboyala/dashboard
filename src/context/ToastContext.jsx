import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(({ type = 'success', message, duration = 3500 }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, type, message }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  toast.success = (msg, opts) => toast({ type: 'success', message: msg, ...opts })
  toast.error   = (msg, opts) => toast({ type: 'error',   message: msg, ...opts })
  toast.info    = (msg, opts) => toast({ type: 'info',    message: msg, ...opts })

  const icons  = { success: CheckCircle, error: AlertCircle, info: Info }
  const styles = {
    success: 'bg-white border-success-200 text-success-700',
    error:   'bg-white border-danger-200 text-danger-700',
    info:    'bg-white border-brand-200 text-brand-700',
  }
  const iconColors = { success: 'text-success-500', error: 'text-danger-500', info: 'text-brand-500' }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = icons[t.type] || Info
          return (
            <div key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-elevated pointer-events-auto anim-up min-w-[280px] max-w-sm ${styles[t.type]}`}>
              <Icon size={15} className={iconColors[t.type]} />
              <p className="text-[13px] font-medium flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 shrink-0 ml-1">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
