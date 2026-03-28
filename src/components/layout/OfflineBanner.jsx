import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Fixed banner shown when the browser loses network connectivity.
 * Listens to the native online/offline events — zero API calls.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[300] flex items-center justify-center gap-2 bg-amber-500 text-white text-[12px] font-semibold py-2 px-4 shadow-lg">
      <WifiOff size={14} />
      You are offline. Changes may not save until you reconnect.
    </div>
  )
}
