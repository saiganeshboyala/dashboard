import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Circle, PhoneOff, Users, Send, X,
} from 'lucide-react'
import useWebRTC from '../../hooks/useWebRTC'
import { get } from '../../utils/api'
import { getUser } from '../../utils/auth'

// ── Video Tile ────────────────────────────────────────────────────────────────

function VideoTile({ stream, label, muted, videoOff, isLocal, isMain, onClick }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      onClick={onClick}
      className={`relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center
        ${isMain ? 'w-full h-full' : 'cursor-pointer hover:ring-2 hover:ring-brand-400 transition-all'}
        ${isMain ? 'ring-2 ring-brand-500' : ''}`}
    >
      {stream && !videoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-white">
            {(label || '?')[0].toUpperCase()}
          </div>
          <span className="text-xs">{label}</span>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-white text-[11px] bg-black/50 rounded px-1.5 py-0.5">{label}</span>
        {muted && <MicOff size={11} className="text-red-400" />}
      </div>

      {/* Local badge */}
      {isLocal && (
        <span className="absolute top-2 right-2 text-[10px] bg-brand-600 text-white rounded px-1.5 py-0.5">You</span>
      )}
    </div>
  )
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

function ChatPanel({ messages, onSend, onClose }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const user = getUser()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-white/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white font-semibold text-[13px]">Chat</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-[12px] mt-8">No messages yet</p>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.userId === user?.id
          return (
            <div key={i} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-0.5">{msg.userName}</span>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] ${
                isOwn ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-200'
              }`}>
                {msg.message}
              </div>
              <span className="text-[10px] text-gray-600 mt-0.5">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message…"
          className="flex-1 bg-gray-800 text-white text-[12px] rounded-lg px-3 py-2 outline-none placeholder-gray-600 border border-white/10 focus:border-brand-500/50"
        />
        <button
          onClick={send}
          className="p-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-white transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onScheduled }) {
  const [form, setForm] = useState({ title: '', scheduledAt: '', durationMinutes: 30, description: '' })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/v1/video/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rp_token')}` },
        body: JSON.stringify(form),
      })
      onScheduled?.()
      onClose()
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-white font-bold mb-4">Schedule a Call</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Call title" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="w-full bg-gray-800 text-white text-[13px] rounded-lg px-3 py-2 outline-none border border-white/10" />
          <input required type="datetime-local" value={form.scheduledAt}
            onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
            className="w-full bg-gray-800 text-white text-[13px] rounded-lg px-3 py-2 outline-none border border-white/10" />
          <select value={form.durationMinutes}
            onChange={e => setForm(p => ({ ...p, durationMinutes: parseInt(e.target.value) }))}
            className="w-full bg-gray-800 text-white text-[13px] rounded-lg px-3 py-2 outline-none border border-white/10">
            {[15, 30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}
          </select>
          <textarea placeholder="Notes (optional)" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full bg-gray-800 text-white text-[13px] rounded-lg px-3 py-2 outline-none border border-white/10 resize-none" />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-[12px] text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 text-[12px] font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VideoCallPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = getUser()

  const [callInfo, setCallInfo] = useState(null)
  const [mainUserId, setMainUserId] = useState(null)  // which peer is in main view
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [callDuration, setCallDuration] = useState(0)

  const {
    localStream, remoteStreams, participants,
    isMuted, isVideoOff, isScreenSharing, isRecording,
    chatMessages, connectionError,
    toggleMic, toggleCamera, startScreenShare, stopScreenShare,
    startRecording, stopRecording, endCall, sendChatMessage,
  } = useWebRTC(roomId)

  // Fetch call info
  useEffect(() => {
    get(`/api/v1/video/calls/${roomId}`).then(setCallInfo).catch(() => {})
  }, [roomId])

  // Call duration timer
  useEffect(() => {
    const t = setInterval(() => setCallDuration(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Unread badge
  useEffect(() => {
    if (!showChat) setUnreadCount(prev => prev + 1)
    else setUnreadCount(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.length])

  useEffect(() => {
    if (showChat) setUnreadCount(0)
  }, [showChat])

  const handleEndCall = async () => {
    await endCall()
    navigate('/')
  }

  const formatDuration = (s) => {
    const m = Math.floor(s / 60), sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // Layout: determine video grid
  const remotePeerIds = Object.keys(remoteStreams)
  const totalPeers = remotePeerIds.length + 1  // +1 for local

  const getGridClass = () => {
    if (totalPeers <= 1) return 'grid-cols-1'
    if (totalPeers === 2) return 'grid-cols-2'
    if (totalPeers <= 4) return 'grid-cols-2 grid-rows-2'
    return 'grid-cols-3 grid-rows-2'
  }

  // Main view: screen share or selected peer, otherwise largest remote stream
  const mainPeerId = mainUserId || (remotePeerIds[0] ?? 'local')

  const title = callInfo?.title || 'Video Call'

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-950 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-[14px]">{title}</span>
          <span className="text-gray-500 text-[12px] font-mono">{formatDuration(callDuration)}</span>
          {isRecording && (
            <span className="flex items-center gap-1 text-red-400 text-[11px] animate-pulse">
              <Circle size={8} className="fill-red-400" /> REC
            </span>
          )}
        </div>
        <button
          onClick={handleEndCall}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[12px] font-semibold rounded-lg transition-colors"
        >
          <PhoneOff size={14} /> End Call
        </button>
      </div>

      {connectionError && (
        <div className="bg-red-900/50 border-b border-red-500/20 px-4 py-2 text-red-300 text-[12px]">
          {connectionError}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Video area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Main video (active speaker / selected) */}
          <div className="flex-1 p-3 relative">
            {mainPeerId === 'local' ? (
              <VideoTile
                stream={localStream}
                label={user?.name || 'You'}
                isLocal
                isMain
                muted={isMuted}
                videoOff={isVideoOff || isScreenSharing}
              />
            ) : (
              <VideoTile
                stream={remoteStreams[mainPeerId]?.stream}
                label={remoteStreams[mainPeerId]?.userName || `User ${mainPeerId}`}
                muted={remoteStreams[mainPeerId]?.muted}
                videoOff={remoteStreams[mainPeerId]?.videoOff}
                isMain
              />
            )}
          </div>

          {/* Thumbnail strip */}
          {(remotePeerIds.length > 0 || mainPeerId !== 'local') && (
            <div className="flex gap-2 px-3 pb-2 overflow-x-auto shrink-0" style={{ height: '110px' }}>
              {/* Always show local in strip */}
              {mainPeerId !== 'local' && (
                <div className="w-[150px] shrink-0">
                  <VideoTile
                    stream={localStream}
                    label={user?.name || 'You'}
                    isLocal
                    muted={isMuted}
                    videoOff={isVideoOff}
                    onClick={() => setMainUserId('local')}
                  />
                </div>
              )}
              {remotePeerIds.filter(pid => pid !== mainPeerId).map(pid => (
                <div key={pid} className="w-[150px] shrink-0">
                  <VideoTile
                    stream={remoteStreams[pid]?.stream}
                    label={remoteStreams[pid]?.userName || `User ${pid}`}
                    muted={remoteStreams[pid]?.muted}
                    videoOff={remoteStreams[pid]?.videoOff}
                    onClick={() => setMainUserId(pid)}
                  />
                </div>
              ))}
              {/* Main user thumbnail if someone else is in main */}
              {mainPeerId !== 'local' && remotePeerIds.filter(pid => pid !== mainPeerId).length === 0 && null}
            </div>
          )}

          {/* ── Controls bar ── */}
          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-gray-950 border-t border-white/10 shrink-0">
            <ControlBtn
              active={!isMuted}
              activeIcon={<Mic size={18} />}
              inactiveIcon={<MicOff size={18} />}
              label={isMuted ? 'Unmute' : 'Mute'}
              onClick={toggleMic}
              danger={isMuted}
            />
            <ControlBtn
              active={!isVideoOff}
              activeIcon={<Video size={18} />}
              inactiveIcon={<VideoOff size={18} />}
              label={isVideoOff ? 'Start Video' : 'Stop Video'}
              onClick={toggleCamera}
              danger={isVideoOff}
            />
            <ControlBtn
              active={isScreenSharing}
              activeIcon={<MonitorOff size={18} />}
              inactiveIcon={<Monitor size={18} />}
              label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              highlight={isScreenSharing}
            />
            <ControlBtn
              active={showChat}
              activeIcon={<MessageSquare size={18} />}
              inactiveIcon={<MessageSquare size={18} />}
              label="Chat"
              onClick={() => setShowChat(v => !v)}
              badge={!showChat && unreadCount > 0 ? unreadCount : null}
            />
            <ControlBtn
              active={isRecording}
              activeIcon={<Circle size={18} className="fill-red-400 text-red-400" />}
              inactiveIcon={<Circle size={18} />}
              label={isRecording ? 'Stop Rec' : 'Record'}
              onClick={isRecording ? stopRecording : startRecording}
              danger={isRecording}
            />
            <ControlBtn
              active={showParticipants}
              activeIcon={<Users size={18} />}
              inactiveIcon={<Users size={18} />}
              label={`Participants (${participants.length + 1})`}
              onClick={() => setShowParticipants(v => !v)}
            />
            <button
              onClick={handleEndCall}
              className="flex flex-col items-center gap-0.5 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white transition-colors"
            >
              <PhoneOff size={18} />
              <span className="text-[10px]">End</span>
            </button>
          </div>
        </div>

        {/* ── Chat panel ── */}
        {showChat && (
          <div className="w-72 shrink-0">
            <ChatPanel
              messages={chatMessages}
              onSend={sendChatMessage}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}

        {/* ── Participants panel ── */}
        {showParticipants && (
          <div className="w-56 shrink-0 bg-gray-900 border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-semibold text-[13px]">Participants</span>
              <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Local user */}
              <ParticipantRow name={`${user?.name || 'You'} (You)`} muted={isMuted} videoOff={isVideoOff} />
              {participants.map(p => (
                <ParticipantRow
                  key={p.userId}
                  name={p.userName || `User ${p.userId}`}
                  muted={remoteStreams[p.userId]?.muted}
                  videoOff={remoteStreams[p.userId]?.videoOff}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ControlBtn({ active, activeIcon, inactiveIcon, label, onClick, danger, highlight, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors
        ${danger   ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
        : highlight ? 'bg-brand-600/20 text-brand-400 hover:bg-brand-600/30'
        : active    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
    >
      {active ? activeIcon : inactiveIcon}
      <span className="text-[10px]">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

function ParticipantRow({ name, muted, videoOff }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5">
      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
        {(name || '?')[0].toUpperCase()}
      </div>
      <span className="flex-1 text-[12px] text-gray-300 truncate">{name}</span>
      <div className="flex gap-1">
        {muted    && <MicOff size={12} className="text-red-400" />}
        {videoOff && <VideoOff size={12} className="text-gray-500" />}
      </div>
    </div>
  )
}
