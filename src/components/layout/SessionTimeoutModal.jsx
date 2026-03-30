import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'

const IDLE_TIMEOUT_MS  = 30 * 60 * 1000  // 30 minutes before logout
const WARN_BEFORE_MS   =  5 * 60 * 1000  // show warning 5 min before logout
const WARN_AT_MS       = IDLE_TIMEOUT_MS - WARN_BEFORE_MS  // 25 min idle → show warning
const ACTIVITY_EVENTS  = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']

function formatSeconds(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function SessionTimeoutModal() {
  const navigate    = useNavigate()
  const [visible, setVisible]   = useState(false)
  const [remaining, setRemaining] = useState(WARN_BEFORE_MS)
  const lastActivity = useRef(Date.now())
  const warnTimer    = useRef(null)
  const logoutTimer  = useRef(null)
  const countdownRef = useRef(null)

  const logout = useCallback(() => {
    clearTimeout(warnTimer.current)
    clearTimeout(logoutTimer.current)
    clearInterval(countdownRef.current)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login', { state: { reason: 'session_expired' } })
  }, [navigate])

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now()
    setVisible(false)
    clearTimeout(warnTimer.current)
    clearTimeout(logoutTimer.current)
    clearInterval(countdownRef.current)

    warnTimer.current = setTimeout(() => {
      setVisible(true)
      setRemaining(WARN_BEFORE_MS)

      // Start countdown
      countdownRef.current = setInterval(() => {
        const idle = Date.now() - lastActivity.current
        const left = IDLE_TIMEOUT_MS - idle
        if (left <= 0) {
          clearInterval(countdownRef.current)
          logout()
        } else {
          setRemaining(left)
        }
      }, 1000)

      logoutTimer.current = setTimeout(logout, WARN_BEFORE_MS)
    }, WARN_AT_MS)
  }, [logout])

  // Only run if there's a token (user is logged in)
  const hasToken = !!localStorage.getItem('token')

  useEffect(() => {
    if (!hasToken) return

    const onActivity = () => {
      // Debounce: only reset if enough time has passed to avoid performance hit
      if (Date.now() - lastActivity.current > 10_000) {
        resetTimers()
      } else {
        lastActivity.current = Date.now()
      }
    }

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    resetTimers()

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      clearTimeout(warnTimer.current)
      clearTimeout(logoutTimer.current)
      clearInterval(countdownRef.current)
    }
  }, [hasToken, resetTimers])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-4">
          <Clock size={26} className="text-yellow-500" />
        </div>
        <h2 className="text-[15px] font-bold text-gray-900 mb-1">Session Expiring Soon</h2>
        <p className="text-[13px] text-gray-500 mb-3">
          You've been inactive. Your session will expire in:
        </p>
        <div className="text-3xl font-bold text-yellow-500 tabular-nums mb-5">
          {formatSeconds(remaining)}
        </div>
        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
          <button
            onClick={resetTimers}
            className="flex-1 py-2 px-4 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}
