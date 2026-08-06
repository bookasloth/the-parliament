// Pure signaling decision logic for 1:1 WebRTC calls — extracted from the
// useVideoCall hook so it's testable without a browser / peer connection. The
// hook stays responsible for the *effects* (getUserMedia, RTCPeerConnection,
// realtime sends); this module owns the *decisions*: what to do on each inbound
// signal given the current call state. Every historical call bug lived in this
// branching, so it gets its own unit tests.

export type SignalEvent = "call_offer" | "call_answer" | "call_ice" | "call_end"

export type CallPhase = "idle" | "calling" | "ringing" | "connected"

/** The slice of call state the decision depends on (no media objects). */
export interface SignalState {
  phase: CallPhase
  /** A peer connection exists (pcRef.current != null). */
  hasPeer: boolean
  /** Remote description is set — ICE can be added directly, not buffered. */
  remoteReady: boolean
  /** Next incoming offer should auto-answer (callee accepted on the global ring). */
  autoAccept: boolean
}

export interface SignalPayload {
  from?: string
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  audioOnly?: boolean
}

export type SignalDecision =
  | { type: "ignore" }
  /** Busy (already in a call) — reply call_end so the caller stops ringing. */
  | { type: "reject_busy" }
  /** Store the offer; either ring the callee or auto-answer it. */
  | { type: "incoming"; sdp: RTCSessionDescriptionInit | null; audioOnly: boolean; autoAnswer: boolean }
  /** Caller received the answer — apply it and connect. */
  | { type: "apply_answer"; sdp: RTCSessionDescriptionInit }
  /** Remote is ready — add this ICE candidate now. */
  | { type: "add_ice"; candidate: RTCIceCandidateInit }
  /** Remote not ready yet — buffer this ICE candidate for later. */
  | { type: "buffer_ice"; candidate: RTCIceCandidateInit }
  /** Remote hung up / declined — tear down. */
  | { type: "end" }

/**
 * Decide what to do with an inbound call signal. Pure: same inputs → same
 * decision, no side effects. The caller (the hook) executes the decision.
 */
export function decideOnSignal(
  state: SignalState,
  viewerId: string,
  event: SignalEvent,
  payload: SignalPayload,
): SignalDecision {
  // Our own echo (broadcast self:false already drops these; belt & braces).
  if (payload.from === viewerId) return { type: "ignore" }

  switch (event) {
    case "call_offer":
      // Already in / setting up a call → busy.
      if (state.phase !== "idle" || state.hasPeer) return { type: "reject_busy" }
      return {
        type: "incoming",
        sdp: payload.sdp ?? null,
        audioOnly: !!payload.audioOnly,
        // Auto-answer only when armed AND there's an actual offer to answer.
        autoAnswer: !!(state.autoAccept && payload.sdp),
      }

    case "call_answer":
      if (state.hasPeer && payload.sdp) return { type: "apply_answer", sdp: payload.sdp }
      return { type: "ignore" }

    case "call_ice":
      if (!payload.candidate) return { type: "ignore" }
      return state.hasPeer && state.remoteReady
        ? { type: "add_ice", candidate: payload.candidate }
        : { type: "buffer_ice", candidate: payload.candidate }

    case "call_end":
      return { type: "end" }
  }
}
