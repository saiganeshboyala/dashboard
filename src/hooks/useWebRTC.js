import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import Peer from 'simple-peer'
import { getToken, getUser } from '../utils/auth'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * useWebRTC — manages all WebRTC peer connections + Socket.IO signaling
 * for a given roomId.
 *
 * Returns streams, media state, and control functions used by VideoCallPage.
 */
export default function useWebRTC(roomId) {
  const user = getUser()
  const userId = user?.id

  const [localStream,   setLocalStream]   = useState(null)
  const [remoteStreams, setRemoteStreams]  = useState({})  // userId -> { stream, userName, muted, videoOff }
  const [isMuted,       setIsMuted]       = useState(false)
  const [isVideoOff,    setIsVideoOff]    = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording,   setIsRecording]   = useState(false)
  const [chatMessages,  setChatMessages]  = useState([])
  const [participants,  setParticipants]  = useState([])  // { userId, userName }
  const [connectionError, setConnectionError] = useState(null)

  const socketRef      = useRef(null)
  const peersRef       = useRef({})     // peerId -> Peer instance
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingChunksRef = useRef([])

  // ── Get user media ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        localStreamRef.current = stream
        setLocalStream(stream)
      })
      .catch(err => {
        console.warn('Camera/mic unavailable:', err.message)
        // Create silent audio-only fallback
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
            localStreamRef.current = stream
            setLocalStream(stream)
          })
          .catch(() => setConnectionError('Could not access camera or microphone'))
      })
    return () => { cancelled = true }
  }, [])

  // ── Connect to Socket.IO once we have local stream ─────────────────────────
  useEffect(() => {
    if (!localStream || !roomId) return

    const socket = io(window.location.origin, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect_error', (err) => setConnectionError(err.message))

    socket.on('connect', () => {
      socket.emit('join-room', { roomId })
    })

    // Someone already in the room — we are the initiator
    socket.on('room-users', ({ users }) => {
      for (const peerId of users) {
        if (peerId !== userId) createPeer(socket, peerId, true)
      }
    })

    // New peer joined — they will initiate
    socket.on('peer-joined', ({ userId: peerId, userName }) => {
      setParticipants(prev => {
        if (prev.find(p => p.userId === peerId)) return prev
        return [...prev, { userId: peerId, userName }]
      })
    })

    // Receive offer from new peer
    socket.on('offer', ({ fromUserId, fromUserName, sdp }) => {
      createPeer(socket, fromUserId, false, sdp, fromUserName)
    })

    // Receive answer
    socket.on('answer', ({ fromUserId, sdp }) => {
      const peer = peersRef.current[fromUserId]
      if (peer && !peer.destroyed) peer.signal(sdp)
    })

    // Receive ICE candidate
    socket.on('ice-candidate', ({ fromUserId, candidate }) => {
      const peer = peersRef.current[fromUserId]
      if (peer && !peer.destroyed) peer.signal(candidate)
    })

    // Peer left
    socket.on('peer-left', ({ userId: peerId }) => {
      destroyPeer(peerId)
      setParticipants(prev => prev.filter(p => p.userId !== peerId))
    })

    // Media state updates
    socket.on('peer-audio-toggle', ({ userId: peerId, muted }) => {
      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: { ...(prev[peerId] || {}), muted },
      }))
    })

    socket.on('peer-video-toggle', ({ userId: peerId, videoOff }) => {
      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: { ...(prev[peerId] || {}), videoOff },
      }))
    })

    // Chat
    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg])
    })

    // Call ended by host
    socket.on('call-ended', () => {
      cleanup()
      window.location.href = '/'
    })

    socket.on('removed-from-call', () => {
      cleanup()
      window.location.href = '/'
    })

    return () => {
      socket.emit('leave-room', { roomId })
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, roomId])

  // ── Create a Peer connection ────────────────────────────────────────────────
  const createPeer = useCallback((socket, peerId, initiator, incomingSdp, peerName) => {
    if (peersRef.current[peerId]) return  // already connected

    const peer = new Peer({
      initiator,
      stream: localStreamRef.current,
      config: { iceServers: ICE_SERVERS },
      trickle: true,
    })

    peer.on('signal', (data) => {
      if (initiator) {
        socket.emit('offer', { roomId, targetUserId: peerId, sdp: data })
      } else {
        socket.emit('answer', { roomId, targetUserId: peerId, sdp: data })
      }
    })

    peer.on('stream', (remoteStream) => {
      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: { ...(prev[peerId] || {}), stream: remoteStream, userName: peerName },
      }))
      setParticipants(prev => {
        if (prev.find(p => p.userId === peerId)) return prev
        return [...prev, { userId: peerId, userName: peerName || `User ${peerId}` }]
      })
    })

    peer.on('error', (err) => {
      console.warn('Peer error:', err.message)
    })

    peer.on('close', () => {
      destroyPeer(peerId)
    })

    if (!initiator && incomingSdp) {
      peer.signal(incomingSdp)
    }

    peersRef.current[peerId] = peer
  }, [roomId])

  const destroyPeer = (peerId) => {
    const peer = peersRef.current[peerId]
    if (peer && !peer.destroyed) peer.destroy()
    delete peersRef.current[peerId]
    setRemoteStreams(prev => {
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }

  const cleanup = () => {
    for (const peer of Object.values(peersRef.current)) {
      if (!peer.destroyed) peer.destroy()
    }
    peersRef.current = {}
    socketRef.current?.disconnect()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (!audioTrack) return
    const muted = !audioTrack.enabled
    audioTrack.enabled = muted
    setIsMuted(!muted)
    socketRef.current?.emit('toggle-audio', { roomId, muted: !muted })
  }, [roomId])

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return
    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (!videoTrack) return
    const videoOff = !videoTrack.enabled
    videoTrack.enabled = videoOff
    setIsVideoOff(!videoOff)
    socketRef.current?.emit('toggle-video', { roomId, videoOff: !videoOff })
  }, [roomId])

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenStreamRef.current = screen
      const screenTrack = screen.getVideoTracks()[0]

      // Replace video track in all peer connections
      for (const peer of Object.values(peersRef.current)) {
        if (peer.destroyed) continue
        const sender = peer._pc?.getSenders?.().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(screenTrack)
      }

      screenTrack.onended = () => stopScreenShare()
      setIsScreenSharing(true)
      socketRef.current?.emit('screen-share-started', { roomId })
    } catch (err) {
      console.warn('Screen share failed:', err.message)
    }
  }, [roomId])

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null

    // Restore camera track
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0]
    if (cameraTrack) {
      for (const peer of Object.values(peersRef.current)) {
        if (peer.destroyed) continue
        const sender = peer._pc?.getSenders?.().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(cameraTrack)
      }
    }
    setIsScreenSharing(false)
    socketRef.current?.emit('screen-share-stopped', { roomId })
  }, [roomId])

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return
    const tracks = [...localStreamRef.current.getTracks()]
    for (const rs of Object.values(remoteStreams)) {
      if (rs.stream) tracks.push(...rs.stream.getTracks())
    }

    let mimeType = 'video/webm;codecs=vp9'
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm'

    const recorder = new MediaRecorder(localStreamRef.current, { mimeType })
    recordingChunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `call-recording-${roomId}-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    }
    recorder.start(1000)
    mediaRecorderRef.current = recorder
    setIsRecording(true)
  }, [remoteStreams, roomId])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
  }, [])

  const endCall = useCallback(async () => {
    try {
      await fetch(`/api/v1/video/calls/${roomId}/end`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
    } catch { /* ignore */ }
    if (isRecording) stopRecording()
    cleanup()
  }, [roomId, isRecording, stopRecording])

  const sendChatMessage = useCallback((message) => {
    socketRef.current?.emit('chat-message', { roomId, message })
  }, [roomId])

  return {
    localStream,
    remoteStreams,
    participants,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isRecording,
    chatMessages,
    connectionError,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    startRecording,
    stopRecording,
    endCall,
    sendChatMessage,
  }
}
