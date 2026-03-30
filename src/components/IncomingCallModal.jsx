import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, PhoneOff } from 'lucide-react'
import { io } from 'socket.io-client'
import { getToken, getUser } from '../utils/auth'

const AUTO_DISMISS_MS = 30_000

/**
 * IncomingCallModal — listens for 'incoming-call' socket events globally.
 * Renders a ringing modal overlay. Mounted once at the App level.
 */
export default function IncomingCallModal() {
  const navigate  = useNavigate()
  const user      = getUser()
  const [call, setCall]       = useState(null)  // { roomId, callerName, title, joinUrl }
  const [timeLeft, setTimeLeft] = useState(AUTO_DISMISS_MS / 1000)
  const socketRef = useRef(null)
  const timerRef  = useRef(null)
  const audioRef  = useRef(null)

  // ── Connect socket (only when logged in) ─────────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('incoming-call', (data) => {
      setCall(data)
      setTimeLeft(AUTO_DISMISS_MS / 1000)
      // Play ringtone via Web Audio
      playRingtone()
    })

    socket.on('call-scheduled', (data) => {
      // Optionally show a toast; handled by App.jsx
    })

    return () => {
      socket.disconnect()
      stopRingtone()
    }
  }, [user?.id])

  // ── Auto-dismiss countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!call) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { dismiss(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.roomId])

  const dismiss = () => {
    clearInterval(timerRef.current)
    stopRingtone()
    setCall(null)
  }

  const accept = () => {
    dismiss()
    navigate(`/call/${call.roomId}`)
  }

  const decline = () => {
    dismiss()
    // Optionally notify caller via socket
    socketRef.current?.emit('call-declined', { roomId: call.roomId })
  }

  // ── Ringtone via Web Audio API ────────────────────────────────────────────
  const audioCtxRef = useRef(null)
  const oscillatorRef = useRef(null)
  const ringIntervalRef = useRef(null)

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx

      const ring = () => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      }

      ring()
      ringIntervalRef.current = setInterval(ring, 1200)
    } catch { /* audio not available */ }
  }

  const stopRingtone = () => {
    clearInterval(ringIntervalRef.current)
    try { audioCtxRef.current?.close() } catch { /* ignore */ }
  }

  if (!call) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        {/* Ringing animation */}
        <div className="relative mx-auto mb-5 w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-green-600 flex items-center justify-center">
            <Phone size={32} className="text-white" />
          </div>
        </div>

        <h2 className="text-[18px] font-bold text-white mb-1">Incoming Call</h2>
        <p className="text-gray-300 text-[15px] font-medium mb-1">{call.callerName}</p>
        {call.title && call.title !== `${call.callerName} is calling` && (
          <p className="text-gray-500 text-[13px] mb-4">"{call.title}"</p>
        )}

        <p className="text-gray-600 text-[11px] mb-6">Auto-dismisses in {timeLeft}s</p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={decline}
            className="flex flex-col items-center gap-2 w-24 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-2xl text-red-400 transition-colors"
          >
            <PhoneOff size={22} />
            <span className="text-[12px] font-medium">Decline</span>
          </button>
          <button
            onClick={accept}
            className="flex flex-col items-center gap-2 w-24 py-3 bg-green-600 hover:bg-green-500 rounded-2xl text-white transition-colors animate-pulse"
          >
            <Phone size={22} />
            <span className="text-[12px] font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  )
}
