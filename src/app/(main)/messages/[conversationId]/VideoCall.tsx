"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Phone } from "lucide-react"
import type { RealtimeChannel } from "@supabase/supabase-js"

// 1:1 WebRTC video/audio calling. Signaling rides the SAME private Realtime
// channel the conversation already uses (conversation:{id}) — no extra channel,
// no extra RLS policy. The caller always creates the offer and the callee only
// answers, so there's no glare/perfect-negotiation to worry about (1:1, no
// mid-call renegotiation — mic/cam toggles just enable/disable existing tracks).
//
// Media is peer-to-peer. STUN handles most NATs; symmetric NATs need a TURN
// relay — configure METERED_DOMAIN / METERED_SECRET_KEY server-side (see
// /api/turn) or those users can't connect. Without TURN, calls between two open
// networks still work.

export type CallState = "idle" | "calling" | "ringing" | "connected"

export type CallSignal = "call_offer" | "call_answer" | "call_ice" | "call_end"

const STUN_ONLY: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }]

// Fetch ICE servers (STUN + short-lived TURN creds) from our server route.
// Cached for an hour — Metered creds outlive that, and a call reuses the cache.
let iceCache: { at: number; servers: RTCIceServer[] } | null = null
async function getIceServers(): Promise<RTCIceServer[]> {
  if (iceCache && Date.now() - iceCache.at < 3_600_000) return iceCache.servers
  try {
    const r = await fetch("/api/turn")
    if (!r.ok) return STUN_ONLY
    const d = await r.json()
    const servers = Array.isArray(d.iceServers) && d.iceServers.length ? d.iceServers : STUN_ONLY
    iceCache = { at: Date.now(), servers }
    return servers
  } catch {
    return STUN_ONLY
  }
}

export interface VideoCallApi {
  state: CallState
  isCaller: boolean
  audioOnly: boolean
  micOn: boolean
  camOn: boolean
  start: (video: boolean) => void
  accept: () => void
  end: () => void
  toggleMic: () => void
  toggleCam: () => void
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  /** Called by ConversationView from the shared channel's broadcast handlers. */
  onSignal: (event: CallSignal, payload: unknown) => void
  /** Callee just joined the thread — caller re-sends its offer. */
  peerJoined: () => void
  /** Next incoming offer auto-answers (callee accepted from the global ring). */
  armAutoAccept: () => void
}

export function useVideoCall(opts: {
  channelRef: React.RefObject<RealtimeChannel | null>
  viewerId: string
}): VideoCallApi {
  const { channelRef, viewerId } = opts
  const [state, setState] = useState<CallState>("idle")
  const [isCaller, setIsCaller] = useState(false)
  const [audioOnly, setAudioOnly] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localRef = useRef<MediaStream | null>(null)
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  // Our own gathered candidates, so a late-joining callee (global ring) can be
  // re-sent the ones that fired before they were on the channel.
  const localIceRef = useRef<RTCIceCandidateInit[]>([])
  const remoteReadyRef = useRef(false)
  const lastOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const autoAcceptRef = useRef(false)

  const sig = useCallback(
    (event: CallSignal, payload: Record<string, unknown> = {}) => {
      channelRef.current?.send({ type: "broadcast", event, payload: { from: viewerId, ...payload } })
    },
    [channelRef, viewerId],
  )

  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localRef.current?.getTracks().forEach((t) => t.stop())
    localRef.current = null
    pendingOfferRef.current = null
    pendingIceRef.current = []
    localIceRef.current = []
    remoteReadyRef.current = false
    setLocalStream(null)
    setRemoteStream(null)
    setMicOn(true)
    setCamOn(true)
    setIsCaller(false)
    setState("idle")
  }, [])

  const end = useCallback(() => {
    if (pcRef.current || state !== "idle") sig("call_end")
    cleanup()
  }, [sig, cleanup, state])

  // Build the peer connection and wire ICE + remote media. `wantVideo` decides
  // whether we capture the camera; a remote MediaStream collects the peer tracks.
  const buildPeer = useCallback(
    async (wantVideo: boolean): Promise<RTCPeerConnection> => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: wantVideo })
      localRef.current = stream
      setLocalStream(stream)

      const pc = new RTCPeerConnection({ iceServers: await getIceServers() })
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      const remote = new MediaStream()
      setRemoteStream(remote)
      pc.ontrack = (e) => e.streams[0].getTracks().forEach((t) => remote.addTrack(t))
      pc.onicecandidate = (e) => {
        if (!e.candidate) return
        const c = e.candidate.toJSON()
        localIceRef.current.push(c) // keep for a late callee (see peerJoined)
        sig("call_ice", { candidate: c })
      }
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState
        if (s === "failed" || s === "disconnected" || s === "closed") cleanup()
      }
      pcRef.current = pc
      return pc
    },
    [sig, cleanup],
  )

  const flushIce = useCallback(async () => {
    const pc = pcRef.current
    if (!pc) return
    for (const c of pendingIceRef.current) {
      try {
        await pc.addIceCandidate(c)
      } catch {
        /* stale candidate — ignore */
      }
    }
    pendingIceRef.current = []
  }, [])

  const start = useCallback(
    async (video: boolean) => {
      if (state !== "idle") return
      try {
        setIsCaller(true)
        setAudioOnly(!video)
        setCamOn(video)
        setState("calling")
        const pc = await buildPeer(video)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        lastOfferRef.current = offer
        sig("call_offer", { sdp: offer, audioOnly: !video })
      } catch (e) {
        alert("Could not access camera/microphone.")
        console.error(e)
        end()
      }
    },
    [state, buildPeer, sig, end],
  )

  // Answer a stored offer. `ao` (audio-only) comes straight from the offer so we
  // never depend on state that may not have flushed yet (auto-accept path).
  const doAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit, ao: boolean) => {
      try {
        const wantVideo = !ao
        setCamOn(wantVideo)
        const pc = await buildPeer(wantVideo)
        await pc.setRemoteDescription(offer)
        remoteReadyRef.current = true
        await flushIce()
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sig("call_answer", { sdp: answer })
        setState("connected")
      } catch (e) {
        alert("Could not access camera/microphone.")
        console.error(e)
        end()
      }
    },
    [buildPeer, flushIce, sig, end],
  )

  const accept = useCallback(() => {
    const offer = pendingOfferRef.current
    if (offer) doAnswer(offer, audioOnly)
  }, [doAnswer, audioOnly])

  // Callee announces it has landed in the chat (via the global-ring flow); the
  // caller re-sends its offer so a late joiner doesn't miss it.
  const peerJoined = useCallback(() => {
    if (state === "calling" && lastOfferRef.current) {
      sig("call_offer", { sdp: lastOfferRef.current, audioOnly })
      // Replay candidates that fired before the callee was on the channel —
      // otherwise ICE has only the callee's side and the call never connects.
      for (const c of localIceRef.current) sig("call_ice", { candidate: c })
    }
  }, [state, audioOnly, sig])

  // Arm auto-accept: the next incoming offer answers itself (callee already said
  // "accept" on the global ring, we just navigated them into the thread).
  const armAutoAccept = useCallback(() => {
    autoAcceptRef.current = true
  }, [])

  const onSignal = useCallback(
    (event: CallSignal, payload: unknown) => {
      const p = payload as { from?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; audioOnly?: boolean }
      if (p.from === viewerId) return // our own echo (self:false already, belt & braces)

      if (event === "call_offer") {
        // Busy — already in a call. Tell the caller so they stop ringing.
        if (state !== "idle" || pcRef.current) {
          channelRef.current?.send({ type: "broadcast", event: "call_end", payload: { from: viewerId } })
          return
        }
        pendingOfferRef.current = p.sdp ?? null
        setIsCaller(false)
        setAudioOnly(!!p.audioOnly)
        // Came in through the global ring (already accepted) → answer immediately.
        if (autoAcceptRef.current && p.sdp) {
          autoAcceptRef.current = false
          doAnswer(p.sdp, !!p.audioOnly)
        } else {
          setState("ringing")
        }
      } else if (event === "call_answer") {
        if (pcRef.current && p.sdp) {
          pcRef.current.setRemoteDescription(p.sdp).then(() => {
            remoteReadyRef.current = true
            flushIce()
            setState("connected")
          })
        }
      } else if (event === "call_ice") {
        if (!p.candidate) return
        if (pcRef.current && remoteReadyRef.current) {
          pcRef.current.addIceCandidate(p.candidate).catch(() => {})
        } else {
          pendingIceRef.current.push(p.candidate)
        }
      } else if (event === "call_end") {
        cleanup()
      }
    },
    [viewerId, state, channelRef, flushIce, cleanup, doAnswer],
  )

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMicOn(track.enabled)
  }, [])

  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setCamOn(track.enabled)
  }, [])

  // Hang up if the component unmounts mid-call.
  useEffect(() => () => cleanup(), [cleanup])

  return {
    state, isCaller, audioOnly, micOn, camOn,
    start, accept, end, toggleMic, toggleCam,
    localStream, remoteStream, onSignal, peerJoined, armAutoAccept,
  }
}

/** Fullscreen call overlay: remote video (or avatar for audio calls) with a
 *  local picture-in-picture and the mic/cam/hang-up controls. */
export function CallOverlay({
  call,
  otherUser,
}: {
  call: VideoCallApi
  otherUser: { name: string; avatar: string | null }
}) {
  // Callback refs, not effect+ref: the <video> nodes mount/unmount as the call
  // state flips (remote video only exists once "connected"), while the streams
  // are set earlier during "calling". A callback ref binds srcObject the moment
  // the node mounts AND whenever the stream identity changes — an effect keyed
  // on the stream alone would fire while the node is still unmounted and never
  // re-run, leaving the remote video black (you'd see only your own PiP).
  const bindLocal = useCallback(
    (el: HTMLVideoElement | null) => { if (el) el.srcObject = call.localStream },
    [call.localStream],
  )
  const bindRemote = useCallback(
    (el: HTMLVideoElement | null) => { if (el) el.srcObject = call.remoteStream },
    [call.remoteStream],
  )

  if (call.state === "idle") return null

  const avatar = otherUser.avatar ?? "/default-avatar.png"
  const showRemoteVideo = call.state === "connected" && !call.audioOnly

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gray-950 text-white">
      {/* Remote media / status backdrop */}
      <div className="relative flex h-full w-full items-center justify-center">
        {showRemoteVideo ? (
          <video ref={bindRemote} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Image src={avatar} alt={otherUser.name} width={112} height={112} className="h-28 w-28 rounded-full object-cover ring-4 ring-white/10" />
            <p className="text-lg font-semibold">{otherUser.name}</p>
            <p className="text-sm text-white/60">
              {call.state === "calling" && "Ringing…"}
              {call.state === "ringing" && `Incoming ${call.audioOnly ? "audio" : "video"} call`}
              {call.state === "connected" && call.audioOnly && "On call"}
            </p>
          </div>
        )}
        {/* keep the remote audio audible even on the audio-only avatar screen */}
        {call.audioOnly && call.state === "connected" && (
          <video ref={bindRemote} autoPlay playsInline className="hidden" />
        )}

        {/* Local picture-in-picture (video calls only) */}
        {!call.audioOnly && call.localStream && (
          <video
            ref={bindLocal}
            autoPlay
            playsInline
            muted
            className="absolute bottom-28 right-4 h-40 w-28 rounded-xl border border-white/20 object-cover shadow-lg sm:right-6"
          />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 flex items-center gap-4">
        {call.state === "ringing" ? (
          <>
            <button
              onClick={call.end}
              title="Decline"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              onClick={call.accept}
              title="Accept"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 hover:bg-green-600"
            >
              <Phone className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={call.toggleMic}
              title={call.micOn ? "Mute" : "Unmute"}
              className={`flex h-12 w-12 items-center justify-center rounded-full ${call.micOn ? "bg-white/15 hover:bg-white/25" : "bg-white text-gray-900"}`}
            >
              {call.micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            {!call.audioOnly && (
              <button
                onClick={call.toggleCam}
                title={call.camOn ? "Turn off camera" : "Turn on camera"}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${call.camOn ? "bg-white/15 hover:bg-white/25" : "bg-white text-gray-900"}`}
              >
                {call.camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={call.end}
              title="Hang up"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
